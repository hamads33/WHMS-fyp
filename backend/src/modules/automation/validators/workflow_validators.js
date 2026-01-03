/**
 * Workflow Validators
 * ------------------------------------------------------------------
 * JSON schemas for workflow validation.
 *
 * Schemas:
 *  - Workflow definition schema
 *  - Workflow CRUD schemas
 *  - Execution input schema
 */

const workflowDefinitionSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string", minLength: 1, maxLength: 255 },
    description: { type: ["string", "null"] },
    version: { type: "integer", minimum: 1 },
    
    input: { type: ["object", "null"] },
    output: { type: ["object", "null"] },
    
    tasks: {
      type: "array",
      minItems: 1,
      maxItems: 1000,
      items: {
        type: "object",
        properties: {
          id: { type: "string", pattern: "^[a-zA-Z0-9_-]+$" },
          type: { enum: ["action", "condition", "loop", "parallel"] },
          description: { type: "string" },
          
          actionType: { type: "string" },
          input: { type: ["object", "null"] },
          
          condition: { type: "string" },
          onTrue: { type: "string" },
          onFalse: { type: "string" },
          
          items: { type: "string" },
          itemName: { type: "string" },
          tasks: { type: "array" },
          
          parallel: { type: "array", items: { type: "string" } },
          
          skipIf: { type: "string" },
          retry: {
            type: "object",
            properties: {
              times: { type: "integer", minimum: 1, maximum: 10 },
              delayMs: { type: "integer", minimum: 100 },
              backoff: { enum: ["linear", "exponential"] },
              maxDelayMs: { type: "integer", minimum: 1000 }
            }
          },
          onError: {
            type: "object",
            properties: {
              retry: { type: "object" },
              fallback: { type: "string" },
              notify: { type: "string" },
              timeout: { type: "integer", minimum: 1000 }
            }
          },
          timeout: { type: "integer", minimum: 1000 }
        },
        required: ["id", "type"]
      }
    },
    
    timeout: { type: ["integer", "null"], minimum: 1000 },
    maxRetries: { type: ["integer", "null"], minimum: 0 }
  },
  required: ["name", "tasks"],
  additionalProperties: false
};

const workflowCreateSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1, maxLength: 255 },
    description: { type: ["string", "null"] },
    definition: workflowDefinitionSchema
  },
  required: ["name", "definition"],
  additionalProperties: false
};

const workflowUpdateSchema = {
  type: "object",
  properties: {
    name: { type: ["string", "null"], minLength: 1, maxLength: 255 },
    description: { type: ["string", "null"] },
    definition: workflowDefinitionSchema,
    enabled: { type: "boolean" }
  },
  additionalProperties: false
};

const workflowExecutionInputSchema = {
  type: "object",
  properties: {
    input: { type: ["object", "null"] }
  },
  additionalProperties: false
};

const dryRunSchema = {
  type: "object",
  properties: {
    input: { type: ["object", "null"] }
  },
  additionalProperties: false
};

const workflowValidateSchema = {
  type: "object",
  properties: {
    definition: workflowDefinitionSchema
  },
  required: ["definition"],
  additionalProperties: false
};

module.exports = {
  workflowDefinitionSchema,
  workflowCreateSchema,
  workflowUpdateSchema,
  workflowExecutionInputSchema,
  dryRunSchema,
  workflowValidateSchema
};