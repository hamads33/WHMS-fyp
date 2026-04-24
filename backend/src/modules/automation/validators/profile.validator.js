/**
 * Profile Validator Schema
 * ------------------------------------------------------------------
 * Validates automation profile creation/update payloads.
 *
 * Requirements:
 *  - name: required string (profile name)
 *  - cron: required string (cron expression)
 *  - description: optional string
 *  - enabled: optional boolean (defaults to true on creation)
 *
 * FIXED:
 *  ✅ Made description allow null for optional fields
 *  ✅ Added maxLength constraints for name and description
 *  ✅ Kept additionalProperties: false for strict validation
 *  ✅ Documented cron expression requirements
 *
 * Cron Format:
 *  Standard 5-field format: minute hour day month dayOfWeek
//  *  Examples:
//  *    - "0 2 * * *" = Daily at 2 AM
//  *    - "0 * * * *" = Every hour
5 * * * *" = Every 5 minutes
//  */

module.exports = {
  type: "object",
  properties: {
    name: {
      type: "string",
      minLength: 1,
      maxLength: 255,
      description: "Profile name"
    },
    description: {
      type: ["string", "null"],
      maxLength: 1000,
      description: "Optional profile description"
    },
    cron: {
      type: "string",
      minLength: 1,
      maxLength: 100,
      description: "Cron expression (5-field format: minute hour day month dayOfWeek)"
    },
    enabled: {
      type: "boolean",
      description: "Enable/disable the automation profile (optional, defaults to true)"
    }
  },
  required: ["name", "cron"],
  additionalProperties: false
};