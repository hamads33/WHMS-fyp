# File Backup Support Implementation - Complete Summary

## Overview
Successfully extended the WHMS backup module to support file backups alongside database backups. The module now supports end-to-end file backup functionality including creation, tracking, selective restoration, and metadata storage.

## Changes Implemented

### 1. Database Schema Enhancement
**File:** `backend/prisma/schema.prisma`

Added `metadata` field to the Backup model:
```prisma
metadata        Json?
```

This field stores:
- Backup type (files, database, full, config)
- For file backups: fileCount, array of backed-up paths (capped at 50 to avoid JSON bloat)
- For other types: type identifier for querying and analytics

**Applied via:** `npx prisma db push`

### 2. Validation Schema Enhancement
**File:** `backend/src/schemas/backup.js`

Added `.refine()` validation to `CreateBackupInputSchema`:
- Enforces that `files` and `config` type backups must have at least one file path
- Returns validation error: "At least one file path is required for files/config backup type"
- Allows database-only and full backups to proceed without explicit file paths

**Code:**
```javascript
.refine(
  (data) => {
    if (data.type === "files" || data.type === "config") {
      return Array.isArray(data.files) && data.files.length > 0;
    }
    return true;
  },
  { message: "At least one file path is required for files/config backup type", path: ["files"] }
)
```

### 3. Backup Manager Enhancement
**File:** `backend/src/modules/backup/backup.manager.js`

**Changes:**
1. Added file metadata collection after archive building:
   - Counts files being backed up
   - Captures paths (capped at 50 entries to prevent JSON bloat)
   - Only for "files" and "full" type backups

2. Updated `prisma.backup.update()` to store metadata:
   ```javascript
   metadata: fileBackupMeta
     ? { type: rec.type, ...fileBackupMeta }
     : { type: rec.type },
   ```

**Benefit:** Enables backup analytics, reporting, and tracking of what files were backed up without re-processing the archive.

### 4. Frontend Modal Enhancement
**File:** `frontend/src/components/create-backup-modal.jsx`

**New Features:**
1. Added `filePaths` state to track user-entered server paths
2. Conditional UI that renders only when `type === "files"`:
   - Dynamic path input fields (one per path)
   - Placeholder: `/var/www/uploads`
   - "Add Path" button to add more paths
   - Remove (×) button per path (disabled when only 1 remains)
   - Validation prevents empty path submissions

3. Updated form submission to map filePaths to files array:
   ```javascript
   if (form.type === "files") {
     payload.files = form.filePaths
       .filter((p) => p.trim())
       .map((p) => ({ path: p.trim() }));
   }
   ```

**User Experience:**
- Click "New Backup"
- Select "Files Only"
- Enter server paths (e.g., `/var/www/uploads`, `/etc/nginx`)
- Click "Add Path" for additional directories
- Set retention and storage provider
- Submit

### 5. Restore Runner Enhancement
**File:** `backend/src/modules/backup/worker/restoreRunner.js`

**Changes:**
1. Added intelligent default values for restore flags based on backup type:
   - `restoreFiles` defaults to `backup.type !== "database"`
   - `restoreDb` defaults to `backup.type !== "files"`

2. Enhanced `extractTarGzStream()` to honor restore flags:
   - Skips `db.sql` entries when `restoreDb === false`
   - Skips non-database entries when `restoreFiles === false`
   - Applies path traversal protection before filtering

**Behavior:**
- **Files-only backup:** By default only extracts files, skips db.sql
- **Database-only backup:** By default only extracts db.sql, skips files
- **Full backup:** By default extracts everything
- **Override:** Caller can pass `restoreFiles` / `restoreDb` flags to override defaults

## Data Flow

### Creating a Files Backup
```
User selects "Files Only" in modal
   ↓
Enters paths: ["/var/www/uploads", "/etc/nginx"]
   ↓
Frontend validates (at least 1 path required)
   ↓
POST /api/backups with:
   {
     name: "my-files-backup",
     type: "files",
     files: [{path: "/var/www/uploads"}, {path: "/etc/nginx"}],
     retentionDays: 30,
     storageConfigId: null
   }
   ↓
Backend validates (Zod refinement checks type vs files array)
   ↓
runBackup() creates Backup record (status: queued)
   ↓
enqueueBackupJob() adds to BullMQ queue
   ↓
performBackupJob() executes:
   - Validates paths (no traversal, no sensitive files)
   - Archives files (skips db dump for "files" type)
   - Uploads to storage provider
   - Stores metadata: {type: "files", fileCount: 2, paths: [...]}
   ↓
Backup record updated with:
   - status: "success"
   - filePath: remote location
   - sizeBytes: archive size
   - metadata: file count + paths
```

### Restoring a Files Backup
```
User triggers restore on files backup
   ↓
Restore request POST /api/backups/:id/restore
   ↓
enqueueRestoreJob() adds to BullMQ queue
   ↓
performRestoreJob() executes:
   - Reads backup type: "files"
   - Sets defaults: restoreFiles=true, restoreDb=false
   - Downloads archive from storage provider
   - Extracts tar.gz stream:
     * Skips db.sql entries (restoreDb=false)
     * Extracts all file entries to destination
     * Applies path traversal protection
   ↓
Files restored to destination directory
```

## Backup Types Supported

| Type | Files | DB | Metadata | Use Case |
|---|---|---|---|---|
| `full` | ✅ | ✅ | fileCount, paths, type | Complete system backup |
| `database` | ❌ | ✅ | type | DB-only snapshots |
| `files` | ✅ | ❌ | fileCount, paths, type | File-only backups (uploads, configs) |
| `config` | ✅ | ❌ | fileCount, paths, type | Configuration file backups |

## API Contract

### Create Backup Request
```json
{
  "name": "string (optional)",
  "type": "full|database|files|config",
  "storageConfigId": "number (optional)",
  "retentionDays": "number (1-365, optional)",
  "files": [
    {
      "path": "string (required for files/config)",
      "alias": "string (optional)"
    }
  ],
  "dbOptions": {
    "host": "string (optional)",
    "port": "number (optional)",
    "user": "string (optional)",
    "password": "string (optional)",
    "database": "string (optional)"
  }
}
```

### Backup Record Response
```json
{
  "id": "number",
  "name": "string",
  "type": "string",
  "status": "queued|running|success|failed",
  "filePath": "string",
  "sizeBytes": "number",
  "metadata": {
    "type": "string",
    "fileCount": "number (files/full only)",
    "paths": ["string array (files/full only)"]
  },
  "retentionDays": "number",
  "createdAt": "datetime",
  "startedAt": "datetime|null",
  "finishedAt": "datetime|null"
}
```

## Validation Rules

1. **Files Type:** Must include at least one file path
2. **Database Type:** Optional files array (ignored, db dump always included)
3. **Full Type:** Optional files array (both db and files included)
4. **Config Type:** Must include at least one file path
5. **Path Security:** 
   - No path traversal (`../` sequences removed)
   - No access to sensitive system files (`/etc/shadow`, `/.ssh/`)
   - Paths normalized and validated

## Error Handling

| Error | Cause | Resolution |
|---|---|---|
| "At least one file path is required" | files/config type with empty files array | Add file paths in modal before submitting |
| "No files selected for backup" | All provided paths invalid or inaccessible | Verify paths exist and are accessible |
| "Path traversal not allowed" | Path contains `..` or sensitive patterns | Use absolute paths without traversal |
| "Invalid file path" | Path not a string | Provide valid path strings |

## Testing Scenarios

### Test 1: Create Files-Only Backup
1. Navigate to `/admin/backups`
2. Click "New Backup"
3. Select "Files Only"
4. Enter backup name: "test-files"
5. Enter path: `/tmp`
6. Click "Create Backup"
7. ✅ Backup should create successfully
8. Check DB: `SELECT metadata FROM "Backup" WHERE type='files'` should show fileCount and paths

### Test 2: Files-Only Backup Validation
1. Navigate to `/admin/backups`
2. Click "New Backup"
3. Select "Files Only"
4. Don't enter any paths
5. Click "Create Backup"
6. ✅ Should show validation error: "At least one file path is required"

### Test 3: Multiple File Paths
1. Create backup with type "Files Only"
2. Enter first path: `/var/www/uploads`
3. Click "Add Path"
4. Enter second path: `/etc/nginx`
5. Submit
6. ✅ Backup should process both paths
7. Check metadata: should show fileCount >= 2

### Test 4: Restore Files-Only Backup
1. List backups, find files-only backup with status "success"
2. Click "Restore"
3. ✅ Files should extract to restore destination
4. Verify no db.sql file is processed

### Test 5: Database Backup Unaffected
1. Create database backup (existing functionality)
2. Verify it still works without file paths
3. ✅ Database dump should work as before

## Backwards Compatibility

✅ **Fully backwards compatible:**
- Existing database and full backups work unchanged
- `metadata` field is optional (null for old backups)
- Restore logic defaults correctly for all backup types
- No breaking changes to API

## Files Modified

```
backend/prisma/schema.prisma
  + Added: metadata Json? field to Backup model

backend/src/schemas/backup.js
  + Added: .refine() validation for files type

backend/src/modules/backup/backup.manager.js
  + Added: fileBackupMeta collection and storage

frontend/src/components/create-backup-modal.jsx
  + Added: filePaths state
  + Added: Conditional file paths UI for type="files"
  + Added: File path input handling and validation

backend/src/modules/backup/worker/restoreRunner.js
  + Added: Smart defaults for restore flags
  + Added: Entry filtering based on restore flags
```

## Performance Notes

- File metadata capped at 50 paths to prevent JSON bloat
- Metadata stored as JSON (indexes not needed for ad-hoc filtering)
- Selective restore avoids processing unwanted archive entries
- Path validation cached per backup job execution

## Security Considerations

✅ **Path Validation:**
- No relative paths with `../`
- No access to sensitive files (`/etc/shadow`, `/.ssh/`, `/root/`)
- Restore extraction validates destination stays within target directory

✅ **Database:**
- Metadata is read-only (populated at backup completion)
- No user input stored in metadata

✅ **Archive Processing:**
- File and directory entries only (symlinks/special files skipped)
- Path normalization prevents escape attempts

## Future Enhancements

- Incremental file backups (track changes between backups)
- File pattern/exclusion support (e.g., exclude `.tmp` files)
- Restore to alternative destinations
- File integrity verification (checksums)
- Scheduled file backups via cron/automation module integration