module.exports = {
  type: "object",
  additionalProperties: false,

  properties: {
    id: { type: "string", minLength: 1 },
    name: { type: "string" },
    version: { type: "string" },

    // ----------------------------------------------------
    // JS ACTIONS (Existing)
    // ----------------------------------------------------
    actions: {
      type: "object",
      nullable: true,
      patternProperties: {
        "^[a-zA-Z0-9_\\-]+$": {
          oneOf: [
            // "ping.js"
            { type: "string" },

            // { file, fnName, description, meta }
            {
              type: "object",
              additionalProperties: false,
              properties: {
                file: { type: "string" },
                fnName: { type: "string", nullable: true },
                description: { type: "string", nullable: true },
                meta: { type: "object", nullable: true },

                // allow WASM inside actions
                runtime: {
                  type: "string",
                  enum: ["js", "wasm"],
                  nullable: true
                },

                // WASM export name
                export: { type: "string", nullable: true }
              },
              required: ["file"]
            }
          ]
        }
      }
    },

    // ----------------------------------------------------
    // WASM ACTIONS (NEW)
    // ----------------------------------------------------
    wasm: {
      type: "object",
      nullable: true,
      patternProperties: {
        "^[a-zA-Z0-9_\\-]+$": {
          type: "object",
          additionalProperties: false,

          properties: {
            file: { type: "string" },     // Required: path to .wasm
            export: { type: "string" },   // optional: exported fn
            description: { type: "string", nullable: true },
            meta: { type: "object", nullable: true }
          },

          required: ["file"]
        }
      }
    }
  },

  required: ["id"]
};
