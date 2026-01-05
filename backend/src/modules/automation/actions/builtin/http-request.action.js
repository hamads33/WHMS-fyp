/**
 * HTTP Request Action
 * ------------------------------------------------------------------
 * Built-in automation action for making HTTP requests.
 *
 * Supports:
 *  - GET, POST, PUT, DELETE, PATCH
 *  - Custom headers
 *  - Request/response logging
 *  - Error handling
 *
 * Usage:
 *  {
 *    "actionType": "http_request",
 *    "actionMeta": {
 *      "url": "http://localhost:4000/api/backups",
 *      "method": "POST",
 *      "headers": { "Content-Type": "application/json" },
 *      "body": { "name": "Automation Backup", "provider": "local" }
 *    }
 *  }
 */

const axios = require('axios');

module.exports = {
  name: 'HTTP Request',
  type: 'builtin',
  description: 'Send HTTP requests to external APIs',

  schema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        title: 'URL',
        description: 'The full URL to request (including protocol)',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET',
        title: 'HTTP Method',
      },
      headers: {
        type: 'object',
        title: 'Headers',
        description: 'Optional custom HTTP headers',
        additionalProperties: { type: 'string' },
      },
      body: {
        type: 'object',
        title: 'Request Body',
        description: 'Optional request body (for POST/PUT/PATCH)',
      },
      timeout: {
        type: 'number',
        default: 30000,
        title: 'Timeout (ms)',
        description: 'Request timeout in milliseconds',
      },
    },
    required: ['url'],
  },

  /**
   * Execute HTTP request
   * @param {Object} meta - Action metadata containing url, method, headers, body, timeout
   * @param {Object} context - { prisma, logger, audit, app }
   * @returns {Promise<Object>} Response data
   */
  async execute(meta, context) {
    const { logger } = context;

    // ✅ FIXED: Defensive validation with detailed error messages
    if (!meta || typeof meta !== 'object') {
      throw new Error('Invalid metadata for http_request action: metadata must be an object');
    }

    // Log what we received for debugging
    logger.info({
      msg: '[http_request] Received metadata',
      metaKeys: Object.keys(meta),
      url: meta.url,
      urlType: typeof meta.url,
    });

    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
    } = meta;

    // Validate URL with detailed error
    if (!url) {
      throw new Error(
        'URL is required and must be a string. ' +
        `Received: ${url} (type: ${typeof url})`
      );
    }

    if (typeof url !== 'string') {
      throw new Error(
        `URL must be a string. Received type: ${typeof url}, value: ${JSON.stringify(url)}`
      );
    }

    if (url.trim().length === 0) {
      throw new Error('URL cannot be empty string');
    }

    // Validate method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    const normalizedMethod = (method || 'GET').toUpperCase();
    if (!validMethods.includes(normalizedMethod)) {
      throw new Error(
        `Invalid HTTP method: ${method}. Must be one of: ${validMethods.join(', ')}`
      );
    }

    // Validate headers
    if (headers && typeof headers !== 'object') {
      throw new Error(
        `Headers must be an object. Received type: ${typeof headers}`
      );
    }

    // Log the request details
    logger.info({
      msg: '[http_request] Executing',
      url,
      method: normalizedMethod,
      hasBody: !!body,
      headersCount: Object.keys(headers || {}).length,
      timeout,
    });

    try {
      // Build axios config
      const config = {
        method: normalizedMethod,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout,
      };

      // Add body for methods that support it
      if (body && ['POST', 'PUT', 'PATCH'].includes(normalizedMethod)) {
        config.data = body;
      }

      // Execute request
      const response = await axios(config);

      // Log success
      logger.info({
        msg: '[http_request] Success',
        status: response.status,
        statusText: response.statusText,
        dataSize: response.data ? JSON.stringify(response.data).length : 0,
      });

      // Return response data
      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      // Log detailed error
      const errorDetails = {
        msg: '[http_request] Failed',
        url,
        method: normalizedMethod,
        error: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
      };

      // Include response data if available
      if (error.response?.data) {
        errorDetails.responseData = error.response.data;
      }

      // Include original error for network issues
      if (error.originalError) {
        errorDetails.originalError = error.originalError.message;
      }

      logger.error(errorDetails);

      // Throw with context
      const err = new Error(
        `HTTP ${normalizedMethod} request failed: ${error.message}`
      );
      err.code = 'http_request_failed';
      err.originalError = error;
      err.status = error.response?.status;
      err.responseData = error.response?.data;

      throw err;
    }
  },
};