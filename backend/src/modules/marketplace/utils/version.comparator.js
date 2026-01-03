// src/modules/marketplace/services/version.comparator.js
// Semantic version comparison and validation
// Supports: 1.0.0, ^1.0.0, ~1.0.0, >=1.0.0, <=1.0.0, 1.0.0-beta, etc.

class VersionComparator {
  constructor({ logger = console } = {}) {
    this.logger = logger;
  }

  /**
   * Parse semantic version
   * Input: "1.2.3", "1.2.3-beta", "1.2.3+build"
   * Output: { major, minor, patch, prerelease, metadata }
   */
  parseVersion(versionString) {
    try {
      if (!versionString || typeof versionString !== 'string') {
        return null;
      }

      // Remove 'v' prefix if present
      let version = versionString.trim().replace(/^v/, '');

      // Split metadata
      const [baseVersion, metadata] = version.split('+');

      // Split prerelease
      const [numbers, prerelease] = baseVersion.split('-');

      // Parse major.minor.patch
      const parts = numbers.split('.');
      if (parts.length < 1 || parts.length > 3) {
        return null;
      }

      const major = parseInt(parts[0] || 0, 10);
      const minor = parseInt(parts[1] || 0, 10);
      const patch = parseInt(parts[2] || 0, 10);

      // Validate numbers
      if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
        return null;
      }

      return {
        original: versionString,
        major,
        minor,
        patch,
        prerelease: prerelease || null,
        metadata: metadata || null,
        string: `${major}.${minor}.${patch}${prerelease ? `-${prerelease}` : ''}`
      };
    } catch (error) {
      this.logger.error(`❌ Parse version error: ${versionString}`, error.message);
      return null;
    }
  }

  /**
   * Compare two versions
   * Returns: -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
   */
  compare(v1, v2) {
    const parsed1 = this.parseVersion(v1);
    const parsed2 = this.parseVersion(v2);

    if (!parsed1 || !parsed2) {
      this.logger.warn(`⚠️ Invalid version format: ${v1} or ${v2}`);
      return null;
    }

    // Compare major.minor.patch
    if (parsed1.major !== parsed2.major) {
      return parsed1.major > parsed2.major ? 1 : -1;
    }

    if (parsed1.minor !== parsed2.minor) {
      return parsed1.minor > parsed2.minor ? 1 : -1;
    }

    if (parsed1.patch !== parsed2.patch) {
      return parsed1.patch > parsed2.patch ? 1 : -1;
    }

    // Compare prerelease (prerelease < release)
    if (parsed1.prerelease && !parsed2.prerelease) return -1;
    if (!parsed1.prerelease && parsed2.prerelease) return 1;
    if (parsed1.prerelease && parsed2.prerelease) {
      return parsed1.prerelease.localeCompare(parsed2.prerelease);
    }

    return 0;
  }

  /**
   * Check if v1 is greater than v2
   */
  isGreater(v1, v2) {
    return this.compare(v1, v2) === 1;
  }

  /**
   * Check if v1 is less than v2
   */
  isLess(v1, v2) {
    return this.compare(v1, v2) === -1;
  }

  /**
   * Check if v1 equals v2
   */
  isEqual(v1, v2) {
    return this.compare(v1, v2) === 0;
  }

  /**
   * Check if v1 is greater than or equal to v2
   */
  isGreaterOrEqual(v1, v2) {
    const cmp = this.compare(v1, v2);
    return cmp === 1 || cmp === 0;
  }

  /**
   * Check if v1 is less than or equal to v2
   */
  isLessOrEqual(v1, v2) {
    const cmp = this.compare(v1, v2);
    return cmp === -1 || cmp === 0;
  }

  /**
   * Check if version satisfies constraint
   * Constraints: >=1.0.0, ~1.2.0, ^1.0.0, 1.2.3, >1.0.0, <2.0.0, etc.
   */
  satisfies(version, constraint) {
    try {
      const parsed = this.parseVersion(version);
      if (!parsed) return false;

      constraint = constraint.trim();

      // Caret: ^1.2.3 - allows changes that do not modify left-most non-zero digit
      if (constraint.startsWith('^')) {
        const baseVersion = constraint.slice(1);
        const baseParsed = this.parseVersion(baseVersion);
        if (!baseParsed) return false;

        if (baseParsed.major !== 0) {
          // ^1.2.3 := >=1.2.3 <2.0.0
          return (
            this.isGreaterOrEqual(version, baseVersion) &&
            parsed.major === baseParsed.major
          );
        } else if (baseParsed.minor !== 0) {
          // ^0.2.3 := >=0.2.3 <0.3.0
          return (
            this.isGreaterOrEqual(version, baseVersion) &&
            parsed.major === 0 &&
            parsed.minor === baseParsed.minor
          );
        } else {
          // ^0.0.3 := >=0.0.3 <0.0.4
          return (
            this.isGreaterOrEqual(version, baseVersion) &&
            parsed.major === 0 &&
            parsed.minor === 0 &&
            parsed.patch === baseParsed.patch
          );
        }
      }

      // Tilde: ~1.2.3 - allows patch-level changes
      if (constraint.startsWith('~')) {
        const baseVersion = constraint.slice(1);
        const baseParsed = this.parseVersion(baseVersion);
        if (!baseParsed) return false;

        // ~1.2.3 := >=1.2.3 <1.3.0
        return (
          this.isGreaterOrEqual(version, baseVersion) &&
          parsed.major === baseParsed.major &&
          parsed.minor === baseParsed.minor
        );
      }

      // Greater than or equal: >=1.0.0
      if (constraint.startsWith('>=')) {
        return this.isGreaterOrEqual(version, constraint.slice(2));
      }

      // Greater than: >1.0.0
      if (constraint.startsWith('>')) {
        return this.isGreater(version, constraint.slice(1));
      }

      // Less than or equal: <=1.0.0
      if (constraint.startsWith('<=')) {
        return this.isLessOrEqual(version, constraint.slice(2));
      }

      // Less than: <1.0.0
      if (constraint.startsWith('<')) {
        return this.isLess(version, constraint.slice(1));
      }

      // Exact version: 1.0.0
      return this.isEqual(version, constraint);
    } catch (error) {
      this.logger.error(`❌ Satisfies check error: ${version} vs ${constraint}`, error.message);
      return false;
    }
  }

  /**
   * Check if version satisfies multiple constraints (AND)
   * Example: ['>=1.0.0', '<2.0.0']
   */
  satisfiesAll(version, constraints) {
    if (!Array.isArray(constraints)) {
      constraints = [constraints];
    }

    return constraints.every(constraint => this.satisfies(version, constraint));
  }

  /**
   * Check if version satisfies any constraint (OR)
   */
  satisfiesAny(version, constraints) {
    if (!Array.isArray(constraints)) {
      constraints = [constraints];
    }

    return constraints.some(constraint => this.satisfies(version, constraint));
  }

  /**
   * Get latest version from array
   */
  getLatest(versions) {
    if (!Array.isArray(versions) || versions.length === 0) {
      return null;
    }

    let latest = versions[0];
    for (let i = 1; i < versions.length; i++) {
      if (this.isGreater(versions[i], latest)) {
        latest = versions[i];
      }
    }

    return latest;
  }

  /**
   * Sort versions (ascending)
   */
  sort(versions) {
    if (!Array.isArray(versions)) {
      return [];
    }

    return versions.slice().sort((a, b) => this.compare(a, b));
  }

  /**
   * Sort versions (descending)
   */
  sortDescending(versions) {
    return this.sort(versions).reverse();
  }

  /**
   * Get compatible versions
   * Returns versions that satisfy the constraint
   */
  filterCompatible(versions, constraint) {
    if (!Array.isArray(versions)) {
      return [];
    }

    return versions.filter(v => this.satisfies(v, constraint));
  }

  /**
   * Check if version is prerelease
   */
  isPrerelease(version) {
    const parsed = this.parseVersion(version);
    return parsed && !!parsed.prerelease;
  }

  /**
   * Check if version is stable (not prerelease)
   */
  isStable(version) {
    return !this.isPrerelease(version);
  }

  /**
   * Calculate version difference
   * Returns: { major, minor, patch }
   */
  diff(v1, v2) {
    const p1 = this.parseVersion(v1);
    const p2 = this.parseVersion(v2);

    if (!p1 || !p2) {
      return null;
    }

    return {
      major: p2.major - p1.major,
      minor: p2.minor - p1.minor,
      patch: p2.patch - p1.patch,
      isUpgrade: this.isGreater(v2, v1),
      isDowngrade: this.isLess(v2, v1),
      isSame: this.isEqual(v2, v1)
    };
  }

  /**
   * Get version range details
   */
  getRangeDetails(constraint) {
    try {
      constraint = constraint.trim();

      let type = 'exact';
      let base = constraint;
      let min = null;
      let max = null;

      if (constraint.startsWith('^')) {
        type = 'caret';
        base = constraint.slice(1);
        const parsed = this.parseVersion(base);

        if (parsed.major !== 0) {
          min = base;
          max = `${parsed.major + 1}.0.0`;
        } else if (parsed.minor !== 0) {
          min = base;
          max = `0.${parsed.minor + 1}.0`;
        } else {
          min = base;
          max = `0.0.${parsed.patch + 1}`;
        }
      } else if (constraint.startsWith('~')) {
        type = 'tilde';
        base = constraint.slice(1);
        const parsed = this.parseVersion(base);
        min = base;
        max = `${parsed.major}.${parsed.minor + 1}.0`;
      } else if (constraint.startsWith('>=')) {
        type = 'greaterOrEqual';
        base = constraint.slice(2);
        min = base;
      } else if (constraint.startsWith('>')) {
        type = 'greater';
        base = constraint.slice(1);
      } else if (constraint.startsWith('<=')) {
        type = 'lessOrEqual';
        base = constraint.slice(2);
        max = base;
      } else if (constraint.startsWith('<')) {
        type = 'less';
        base = constraint.slice(1);
      }

      return {
        original: constraint,
        type,
        base,
        min,
        max,
        description: this._getConstraintDescription(type, base, min, max)
      };
    } catch (error) {
      this.logger.error(`❌ Get range details error: ${constraint}`, error.message);
      return null;
    }
  }

  /**
   * Validate version string format
   */
  isValidVersion(version) {
    return this.parseVersion(version) !== null;
  }

  /**
   * Validate constraint format
   */
  isValidConstraint(constraint) {
    try {
      const range = this.getRangeDetails(constraint);
      return range !== null && range.description !== 'Invalid constraint';
    } catch {
      return false;
    }
  }

  /**
   * Get recommended upgrade version
   */
  getRecommendedUpgrade(currentVersion, availableVersions) {
    if (!Array.isArray(availableVersions) || availableVersions.length === 0) {
      return null;
    }

    const sorted = this.sortDescending(availableVersions);
    const current = this.parseVersion(currentVersion);

    if (!current) return null;

    // Prefer stable versions
    const stable = sorted.filter(v => this.isStable(v));
    if (stable.length > 0) {
      return stable[0];
    }

    return sorted[0];
  }

  /**
   * Check if update is breaking
   * Breaking: major version changed
   */
  isBreakingChange(oldVersion, newVersion) {
    const old = this.parseVersion(oldVersion);
    const newVer = this.parseVersion(newVersion);

    if (!old || !newVer) return false;

    return old.major !== newVer.major;
  }

  /**
   * Check if update is major
   */
  isMajorUpdate(oldVersion, newVersion) {
    return this.isBreakingChange(oldVersion, newVersion);
  }

  /**
   * Check if update is minor
   */
  isMinorUpdate(oldVersion, newVersion) {
    const old = this.parseVersion(oldVersion);
    const newVer = this.parseVersion(newVersion);

    if (!old || !newVer) return false;

    return (
      old.major === newVer.major &&
      old.minor !== newVer.minor
    );
  }

  /**
   * Check if update is patch
   */
  isPatchUpdate(oldVersion, newVersion) {
    const old = this.parseVersion(oldVersion);
    const newVer = this.parseVersion(newVersion);

    if (!old || !newVer) return false;

    return (
      old.major === newVer.major &&
      old.minor === newVer.minor &&
      old.patch !== newVer.patch
    );
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  _getConstraintDescription(type, base, min, max) {
    const descriptions = {
      exact: `Exactly ${base}`,
      caret: `Compatible with ${base} (allows non-breaking changes)`,
      tilde: `Approximately ${base} (allows patch-level changes)`,
      greaterOrEqual: `${base} or later`,
      greater: `Later than ${base}`,
      lessOrEqual: `${base} or earlier`,
      less: `Earlier than ${base}`
    };

    return descriptions[type] || 'Invalid constraint';
  }
}

module.exports = VersionComparator;