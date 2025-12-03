const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv); // enables "uri", "email", etc.

// AJV schema (equivalent of your Joi schema)
const createSchema = {
  type: "object",
  properties: {
    title: { 
      type: "string",
      minLength: 3 
    },
    shortDesc: { 
      type: "string", 
      maxLength: 255 
    },
    longDesc: { 
      type: "string" 
    },
    category: { 
      type: "string" 
    },
    tags: {
      type: "array",
      items: { type: "string" },
      default: []
    },
    logo: {
      type: "string",
      format: "uri"
    }
  },
  required: ["title"],
  additionalProperties: false
};

// Compile validator function
const validateCreateProduct = ajv.compile(createSchema);

module.exports = {
  validateCreateProduct
};
