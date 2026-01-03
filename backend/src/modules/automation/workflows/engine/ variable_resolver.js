/**
 * Variable Resolver
 * ============================================================
 * Resolves variables in workflow definitions using dot notation
 * Supports: ${variable.path}, ${variable[0]}, interpolation
 *
 * Example:
 *   resolve("Hello ${user.name}", { user: { name: "John" } })
 *   → "Hello John"
 */

class VariableResolver {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.allowUndefined = options.allowUndefined ?? false;
  }

  /**
   * Resolve variables in a value
   * Supports: strings, objects, arrays, primitives
   */
  resolve(value, context = {}) {
    if (typeof value === "string") {
      return this.resolveString(value, context);
    }
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        return value.map((item) => this.resolve(item, context));
      }
      return Object.entries(value).reduce((acc, [key, val]) => {
        acc[key] = this.resolve(val, context);
        return acc;
      }, {});
    }
    return value;
  }

  /**
   * Resolve string with variable interpolation
   * Pattern: ${variable.path} or ${variable[index]}
   */
  resolveString(str, context = {}) {
    if (typeof str !== "string") return str;

    return str.replace(/\$\{([^}]+)\}/g, (match, path) => {
      try {
        const value = this.getValue(path, context);
        
        if (value === undefined) {
          if (this.allowUndefined) {
            this.logger.warn(`Variable not found: ${path}`);
            return match; // Keep original placeholder
          }
          throw new Error(`Variable not found: ${path}`);
        }
        
        return String(value);
      } catch (error) {
        this.logger.error(`Error resolving variable ${path}:`, error);
        if (this.allowUndefined) {
          return match;
        }
        throw error;
      }
    });
  }

  /**
   * Get value from context using dot notation
   * Examples: "user.name", "items[0].id", "config.db.host"
   */
  getValue(path, context = {}) {
    if (!path) return undefined;

    const segments = this.parsePath(path);
    let value = context;

    for (const segment of segments) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[segment];
    }

    return value;
  }

  /**
   * Parse path into segments
   * "user.name" → ["user", "name"]
   * "items[0].id" → ["items", "0", "id"]
   * "config.db[0].host" → ["config", "db", "0", "host"]
   */
  parsePath(path) {
    const segments = [];
    const regex = /\.?([^\.\[\]]+)|\[(\d+)\]/g;
    let match;

    while ((match = regex.exec(path)) !== null) {
      if (match[1]) {
        segments.push(match[1]);
      } else if (match[2]) {
        segments.push(match[2]);
      }
    }

    return segments;
  }

  /**
   * Check if string contains variables
   */
  hasVariables(str) {
    if (typeof str !== "string") return false;
    return /\$\{[^}]+\}/.test(str);
  }

  /**
   * Extract all variable paths from string
   * "Hello ${user.name}, you have ${messages.count} messages"
   * → ["user.name", "messages.count"]
   */
  extractVariables(str) {
    if (typeof str !== "string") return [];

    const matches = [];
    const regex = /\$\{([^}]+)\}/g;
    let match;

    while ((match = regex.exec(str)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Validate all variables exist in context
   */
  validateVariables(str, context = {}) {
    const variables = this.extractVariables(str);
    const missing = [];

    for (const variable of variables) {
      if (this.getValue(variable, context) === undefined) {
        missing.push(variable);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Resolve with type coercion
   */
  resolveAs(value, context = {}, type = "string") {
    const resolved = this.resolve(value, context);

    switch (type) {
      case "number":
        return Number(resolved);
      case "boolean":
        return Boolean(resolved) && resolved !== "false";
      case "array":
        return Array.isArray(resolved) ? resolved : [resolved];
      case "object":
        return typeof resolved === "object" ? resolved : {};
      case "string":
      default:
        return String(resolved);
    }
  }

  /**
   * Batch resolve multiple templates
   */
  resolveBatch(templates, context = {}) {
    if (Array.isArray(templates)) {
      return templates.map((t) => this.resolve(t, context));
    }
    return Object.entries(templates).reduce((acc, [key, value]) => {
      acc[key] = this.resolve(value, context);
      return acc;
    }, {});
  }

  /**
   * Create safe resolver that won't throw
   */
  createSafeResolver(context = {}) {
    return (str) => {
      try {
        return this.resolve(str, context);
      } catch (error) {
        this.logger.error(`Safe resolve failed: ${error.message}`);
        return str;
      }
    };
  }

  /**
   * Merge context with defaults
   */
  mergeContext(...contexts) {
    return Object.assign({}, ...contexts);
  }
}

module.exports = VariableResolver;