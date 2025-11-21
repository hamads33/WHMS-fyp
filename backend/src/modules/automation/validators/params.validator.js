// src/modules/automation/validators/params.validator.js

module.exports = {
  idParamSchema: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 }
    },
    required: ["id"],
    additionalProperties: false
  },

  profileIdParamSchema: {
    type: "object",
    properties: {
      profileId: { type: "integer", minimum: 1 }
    },
    required: ["profileId"],
    additionalProperties: false
  },

  taskIdParamSchema: {
    type: "object",
    properties: {
      id: { type: "integer", minimum: 1 }
    },
    required: ["id"],
    additionalProperties: false
  }
};
