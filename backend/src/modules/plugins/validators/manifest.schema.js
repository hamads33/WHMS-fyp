module.exports = {
  type: "object",
  additionalProperties: true,          // <-- allow anything (safe for plugin development)
  required: ["id"],
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    version: { type: "string" },
    type: { type: "string" },          // <-- allow plugin type
    actions: {
      type: "object",
      additionalProperties: {
        oneOf: [
          { type: "string" },
          {
            type: "object",
            properties: {
              file: { type: "string" },
              description: { type: "string" },
              meta: { type: "object", additionalProperties: true }
            },
            required: ["file"]
          }
        ]
      }
    }
  }
};
