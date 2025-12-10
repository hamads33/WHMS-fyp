// manifest.schema.js
// AJV schema for plugin manifest. Merge/replace your existing validator file.
// Adds ui.pages, ui.theme and hooks fields (non-breaking).

module.exports = {
  type: "object",
  additionalProperties: false,

  properties: {
    id: { type: "string", minLength: 1 },
    name: { type: "string" },
    version: { type: "string" },
    description: { type: "string", nullable: true },

    // ----------------------------------------------------
    // JS ACTIONS (Existing)
    // ----------------------------------------------------
    actions: {
      type: "object",
      nullable: true,
      patternProperties: {
        "^[a-zA-Z0-9_\\-:]+$": {
          oneOf: [
            { type: "string" },

            {
              type: "object",
              additionalProperties: false,
              properties: {
                file: { type: "string" },
                fnName: { type: "string", nullable: true },
                description: { type: "string", nullable: true },
                meta: { type: "object", nullable: true },
                runtime: { type: "string", enum: ["js", "wasm"], nullable: true },
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
        "^[a-zA-Z0-9_\\-:]+$": {
          type: "object",
          additionalProperties: false,
          properties: {
            file: { type: "string" },
            export: { type: "string", nullable: true },
            description: { type: "string", nullable: true },
            meta: { type: "object", nullable: true }
          },
          required: ["file"]
        }
      }
    },

    // ----------------------------------------------------
    // UI extension (pages & theme preferences)
    // ----------------------------------------------------
ui: {
  type: "object",
  nullable: true,
  additionalProperties: false,
  properties: {
    pages: {
      type: "object",
      nullable: true,
      additionalProperties: false,
      patternProperties: {
        "^[a-zA-Z0-9_\\-]+$": { type: "string" }
      }
    },

    menu: {
      type: "object",
      nullable: true,
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        icon: { type: "string", nullable: true },
        path: { type: "string" }
      },
      required: ["title", "path"]
    },

    configSchema: {
      type: "object",
      nullable: true
    },

    theme: {
      type: "object",
      nullable: true,
      additionalProperties: false,
      properties: {
        prefer: { type: "string", enum: ["light", "dark", "auto"], nullable: true }
      }
    }
  }
}

,

    // ----------------------------------------------------
    // Hooks: manifest-declared server hooks
    // ----------------------------------------------------
    hooks: {
      type: "object",
      nullable: true,
      additionalProperties: false,
      patternProperties: {
        "^[a-zA-Z0-9_.:-]+$": {
          type: "object",
          additionalProperties: false,
          properties: {
            action: { type: "string" } // relative path to action file inside plugin
          },
          required: ["action"]
        }
      }
    },

    // Type (ui, action, etc.)
    type: { type: "string", nullable: true }
  },

  required: ["id"]
};
