const { z } = require("zod");

const IpRuleSchema = z.object({
  id: z.number(),
  pattern: z.string(),
  type: z.enum(["ALLOW", "DENY"]),
  description: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
}).openapi("IpRule");

const IpRuleCreateInput = z.object({
  pattern: z.string(),
  type: z.enum(["ALLOW", "DENY"]),
  description: z.string().optional(),
}).openapi("IpRuleCreateInput");

const IpRuleUpdateInput = z.object({
  pattern: z.string().optional(),
  type: z.enum(["ALLOW", "DENY"]).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
}).openapi("IpRuleUpdateInput");

module.exports = {
  IpRuleSchema,
  IpRuleCreateInput,
  IpRuleUpdateInput,
};
