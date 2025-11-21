// src/modules/plugins/validators/manifest.schema.js
module.exports = {
  type: "object",
  properties: {
    id: { type: "string", pattern: "^[a-zA-Z0-9_\\-]+$" },
    name: { type: "string" },
    version: { type: "string" },
    description: { type: "string" },
    author: { type: "string" },
    // allow a jsonSchema object if plugin supplies one for actionMeta validation
    jsonSchema: { type: "object" },
    // optional metadata fields some plugins include
    source: { type: "string" },
    hasTest: { type: "boolean" },
    hasExecute: { type: "boolean" },
    signature: { type: "string" },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },        // e.g. plugin:ping_url
          description: { type: "string" },
          // optional schema per action
          jsonSchema: { type: "object" }
        },
        required: ["type"],
        additionalProperties: true
      },
      minItems: 1
    },
    ui: { type: "object" } // optional metadata for UI forms
  },
  required: ["id", "name", "version", "actions"],
  additionalProperties: true
};
