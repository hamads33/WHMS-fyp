/**
 * Workflow Error Handler
 * ------------------------------------------------------------------
 * Specific error handling for workflow operations.
 *
 * Handles:
 *  - Validation errors
 *  - Execution errors
 *  - Database errors
 *  - Business logic errors
 */

const { NotFoundError, ValidationError } = require("../lib/errors");

module.exports = function workflowErrorHandler(logger) {
  return (err, req, res, next) => {
    // Workflow validation errors
    if (err instanceof ValidationError && err.code === "workflow_validation") {
      logger.warn(`Workflow validation failed: ${err.message}`);
      return res.fail(
        "Workflow validation failed",
        400,
        "workflow_validation_error",
        { details: err.message }
      );
    }

    // Workflow not found
    if (err instanceof NotFoundError && err.code === "workflow_not_found") {
      logger.debug(`Workflow not found: ${err.message}`);
      return res.fail(
        "Workflow not found",
        404,
        "workflow_not_found",
        null
      );
    }

    // Execution errors
    if (err.code === "workflow_execution_error") {
      logger.error(`Workflow execution error: ${err.message}`);
      return res.fail(
        "Workflow execution failed",
        500,
        "workflow_execution_error",
        { message: err.message, stack: process.env.NODE_ENV === "development" ? err.stack : undefined }
      );
    }

    // Condition evaluation errors
    if (err.code === "condition_evaluation_error") {
      logger.error(`Condition evaluation error: ${err.message}`);
      return res.fail(
        "Condition evaluation failed",
        400,
        "condition_evaluation_error",
        { message: err.message }
      );
    }

    // Variable resolution errors
    if (err.code === "variable_resolution_error") {
      logger.error(`Variable resolution error: ${err.message}`);
      return res.fail(
        "Variable resolution failed",
        400,
        "variable_resolution_error",
        { message: err.message }
      );
    }

    // Timeout errors
    if (err.code === "workflow_timeout") {
      logger.error(`Workflow timeout: ${err.message}`);
      return res.fail(
        "Workflow execution timeout",
        408,
        "workflow_timeout",
        { message: err.message }
      );
    }

    // Retry exhausted
    if (err.code === "retry_exhausted") {
      logger.error(`Retry exhausted: ${err.message}`);
      return res.fail(
        "Task retry limit exceeded",
        500,
        "retry_exhausted",
        { message: err.message }
      );
    }

    // Database errors
    if (err.code === "P2002") {
      logger.warn(`Database unique constraint violation: ${err.message}`);
      return res.fail(
        "Workflow with this name already exists",
        409,
        "duplicate_workflow",
        null
      );
    }

    if (err.code === "P2025") {
      logger.debug(`Database record not found: ${err.message}`);
      return res.fail(
        "Workflow not found",
        404,
        "workflow_not_found",
        null
      );
    }

    // Default error
    logger.error(`Unhandled workflow error: ${err.message}`, err);
    return res.fail(
      "Internal server error",
      500,
      "internal_error",
      process.env.NODE_ENV === "development" ? { message: err.message, stack: err.stack } : null
    );
  };
};