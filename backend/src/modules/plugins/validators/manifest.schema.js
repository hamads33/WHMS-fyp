module.exports = {
  type: "object",

  // WHMCS-grade manifest MUST allow expansion
  additionalProperties: true,

  properties: {
    // ----------------------------------------------------
    // Core Required Fields
    // ----------------------------------------------------
    id: { type: "string", minLength: 1 },
    name: { type: "string", nullable: true },
    version: { type: "string", nullable: true },
    description: { type: "string", nullable: true },

    // ----------------------------------------------------
    // Core Plugin Runtime Fields
    // ----------------------------------------------------
    main: { type: "string", nullable: true },

    type: {
      type: "string",
      enum: ["ui", "action", "provisioning", "wasm", "auth", "utility"],
      nullable: true
    },

    dependencies: {
      type: "object",
      nullable: true,
      additionalProperties: {
        type: "string", // semver ranges
      }
    },

    configSchema: { type: "object", nullable: true },

    // ----------------------------------------------------
    // Media / UI Metadata
    // ----------------------------------------------------
    screenshots: {
      type: "array",
      items: { type: "string" },
      nullable: true
    },

    tags: {
      type: "array",
      items: { type: "string" },
      nullable: true
    },

    homepage: { type: "string", nullable: true },
    author: { type: "string", nullable: true },

    // ----------------------------------------------------
    // Compatibility Info
    // ----------------------------------------------------
    minSystemVersion: { type: "string", nullable: true },
    maxSystemVersion: { type: "string", nullable: true },

    // ----------------------------------------------------
    // Existing JS ACTIONS (unchanged)
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
    // WASM ACTIONS (unchanged)
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
    // UI block (pages, menu, theme)
    // ----------------------------------------------------
    ui: {
      type: "object",
      nullable: true,
      additionalProperties: true,
      properties: {
        pages: {
          type: "object",
          nullable: true,
          patternProperties: {
            "^[a-zA-Z0-9_\\-]+$": { type: "string" }
          }
        },

        menu: {
          type: "object",
          nullable: true,
          properties: {
            title: { type: "string" },
            icon: { type: "string", nullable: true },
            path: { type: "string" }
          },
          required: ["title", "path"]
        },

        configSchema: { type: "object", nullable: true },

        theme: {
          type: "object",
          nullable: true,
          properties: {
            prefer: { type: "string", enum: ["light", "dark", "auto"], nullable: true }
          }
        }
      }
    },

    // ----------------------------------------------------
    // Hooks
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
            action: { type: "string" }
          },
          required: ["action"]
        }
      }
    }
  },

  required: ["id"]
};
