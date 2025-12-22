// backend/src/schemas/backup.js
// Zod v4 schemas for BACKUP & STORAGE CONFIG module
// Compatible with @asteasolutions/zod-to-openapi

const { z } = require("zod");
const { extendZodWithOpenApi } = require("@asteasolutions/zod-to-openapi");

extendZodWithOpenApi(z);

/* =========================================================
   ENUMS
========================================================= */

exports.BackupTypeEnum = z
  .enum(["full", "database", "files", "config"])
  .openapi("BackupType");

exports.BackupStatusEnum = z
  .enum(["queued", "running", "success", "failed"])
  .openapi("BackupStatus");

/* =========================================================
   INPUT SCHEMAS
========================================================= */

exports.CreateBackupInputSchema = z
  .object({
    name: z.string().optional(),
    type: exports.BackupTypeEnum,
    storageConfigId: z.number().int().optional(),
    retentionDays: z.number().int().min(1).max(365).optional(),

    files: z
      .array(
        z.object({
          path: z.string(),
          alias: z.string().optional(),
        })
      )
      .optional(),

    dbOptions: z
      .object({
        host: z.string().optional(),
        port: z.number().optional(),
        user: z.string().optional(),
        password: z.string().optional(),
        database: z.string().optional(),
      })
      .optional(),
  })
  .openapi("CreateBackupInput");

exports.RestoreBackupInputSchema = z
  .object({
    restoreFiles: z.boolean().optional().default(true),
    restoreDb: z.boolean().optional().default(false),
    destination: z.string().optional().nullable(),
  })
  .openapi("RestoreBackupInput");


/* =========================================================
   CORE BACKUP SCHEMAS
========================================================= */

exports.BackupBaseSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    type: exports.BackupTypeEnum,
    status: exports.BackupStatusEnum,
    sizeBytes: z.number().nullable(),
    retentionDays: z.number(),
    createdAt: z.string().datetime(),
    startedAt: z.string().datetime().nullable(),
    finishedAt: z.string().datetime().nullable(),
    provider: z.string().optional(),
  })
  .openapi("Backup");

exports.BackupStepSchema = z
  .object({
    id: z.number().int(),
    step: z.string(),
    status: z.string(),
    message: z.string().optional(),
    meta: z.unknown().optional(),
    createdAt: z.string().datetime(),
  })
  .openapi("BackupStep");

/* =========================================================
   RESPONSE SCHEMAS
========================================================= */

exports.BackupListResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.array(exports.BackupBaseSchema),
  })
  .openapi("BackupListResponse");

exports.BackupDetailResponseSchema = z
  .object({
    success: z.boolean(),
    data: exports.BackupBaseSchema.extend({
      steps: z.array(exports.BackupStepSchema).optional(),
    }),
  })
  .openapi("BackupDetailResponse");

exports.BackupStatsResponseSchema = z
  .object({
    totalStorageUsedBytes: z.number(),
    completedToday: z.number(),
    lastSuccessfulAt: z.string().datetime().nullable(),
    defaultRetentionDays: z.number(),
  })
  .openapi("BackupStatsResponse");

exports.GenericBackupActionResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string().optional(),
    jobId: z.string().optional(),
  })
  .openapi("GenericBackupActionResponse");

/* =========================================================
   STORAGE CONFIG SCHEMAS (CRITICAL FIX APPLIED)
========================================================= */
/**
 * IMPORTANT:
 * z.record(valueSchema) ❌ breaks zod-to-openapi (Zod v4)
 * z.record(keySchema, valueSchema) ✅ REQUIRED
 */

exports.CreateStorageConfigInputSchema = z
  .object({
    name: z.string().min(1),
    provider: z.string().min(1),
    config: z.record(z.string(), z.unknown()),
  })
  .openapi("CreateStorageConfigInput");

exports.UpdateStorageConfigInputSchema = z
  .object({
    name: z.string().min(1).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("UpdateStorageConfigInput");

exports.TestStorageConfigInputSchema = z
  .object({
    provider: z.string().min(1),
    config: z.record(z.string(), z.unknown()),
  })
  .openapi("TestStorageConfigInput");

exports.StorageConfigActionResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.unknown().optional(),
  })
  .openapi("StorageConfigActionResponse");
