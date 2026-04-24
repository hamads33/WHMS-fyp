# Frontend & Backend File Backup Fixes - Complete Summary

**Date:** 2026-04-07  
**Status:** ✅ COMPLETE - All file backup functionality now fully working

## Overview

Fixed critical issues preventing users from creating full backups (database + files) and added missing "config" backup type support. The module now supports all four backup types correctly:
- **database**: PostgreSQL database only
- **files**: Specified directories/files only
- **config**: Configuration files only
- **full**: Both database and specified files

---

## Problems Fixed

### 1. ❌ Full Backups Couldn't Include Files
**Problem:** Users selecting "Full Backup" type couldn't specify which files to backup. The file paths input section only showed for "files" type.

**Root Cause:** 
- File paths section UI only rendered when `form.type === "files"`
- Payload construction only included files when `form.type === "files"`
- Users had no way to configure files for full backups

**Solution:** Modified file paths section to show for both `"files"` and `"full"` types, and updated payload construction accordingly.

### 2. ❌ Missing "Config" Backup Type in Frontend
**Problem:** Backend supported "config" type but frontend had no UI option for it.

**Root Cause:** TYPE_OPTIONS array only had three types: full, database, files

**Solution:** Added "config" type to TYPE_OPTIONS with Settings icon

### 3. ❌ Config Type Files Not Included in Payload
**Problem:** When creating a "config" backup, file paths weren't being sent to the backend.

**Root Cause:** Payload construction logic didn't check for "config" type

**Solution:** Updated payload construction to include files for `"files" || "full" || "config"` types

### 4. ❌ Metadata Not Collected for Config Type
**Problem:** Config type backups weren't tracking which files were backed up in metadata.

**Root Cause:** Metadata collection only checked for `type === "files" || type === "full"`

**Solution:** Added `|| rec.type === "config"` to metadata collection logic

### 5. ❌ Restore Logic Incorrectly Handled Config Type
**Problem:** Config type backups were restoring both files AND database when they should only restore files.

**Root Cause:** Default restore flags used negative logic:
- `restoreFiles = backup.type !== "database"` (config would incorrectly restore db)
- `restoreDb = backup.type !== "files"` (config would incorrectly restore db)

**Solution:** Changed to explicit positive logic:
```javascript
restoreFiles = backup.type === "files" || backup.type === "full" || backup.type === "config"
restoreDb = backup.type === "database" || backup.type === "full"
```

### 6. ❌ Restore Button Hardcoded for Files Only
**Problem:** Restore button on backup details page was hardcoded to always restore files only, regardless of backup type.

**Root Cause:** Hardcoded `restoreFiles: true, restoreDb: false` in button click handler

**Solution:** Made restore flags dynamic based on backup type

---

## Files Modified

### Frontend Changes

#### [frontend/src/components/create-backup-modal.jsx](frontend/src/components/create-backup-modal.jsx)

**Change 1: Added "config" type to TYPE_OPTIONS (line 23-27)**
```javascript
// Added Settings icon import
import { Database, FolderOpen, Cloud, AlertCircle, Loader2, X, Plus, Settings } from "lucide-react";

// Added config option
const TYPE_OPTIONS = [
  { value: "full", label: "Full Backup", description: "Database + files", icon: Database },
  { value: "database", label: "Database Only", description: "PostgreSQL dump", icon: Database },
  { value: "files", label: "Files Only", description: "Selected directories", icon: FolderOpen },
  {
    value: "config",
    label: "Config Only",
    description: "Configuration files",
    icon: Settings,  // NEW
  },
];
```

**Change 2: File paths section shows for files, full, AND config types (line 187-190)**
```javascript
// Before:
{form.type === "files" && (

// After:
{(form.type === "files" || form.type === "full" || form.type === "config") && (
```

**Change 3: Payload includes files for files, full, AND config types (line 97-102)**
```javascript
// Before:
if (form.type === "files") {
  payload.files = form.filePaths.filter(...).map(...)
}

// After:
if (form.type === "files" || form.type === "full" || form.type === "config") {
  payload.files = form.filePaths.filter(...).map(...)
}
```

**Change 4: Updated validation error message (line 119-120)**
```javascript
// Before:
displayError = "Validation failed. Please check your inputs and ensure file paths are provided for file-type backups.";

// After:
displayError = "Validation failed. Please check your inputs and ensure file paths are provided for file/config-type backups.";
```

#### [frontend/src/components/backup-details.jsx](frontend/src/components/backup-details.jsx)

**Change: Restore button now uses dynamic flags based on backup type (line 117-138)**
```javascript
// Before: Hardcoded
<Button onClick={() => backupApi(`/backups/${id}/restore`, {
  method: "POST",
  body: JSON.stringify({
    restoreFiles: true,
    restoreDb: false,
    destination: "/restore",
  }),
})}

// After: Dynamic based on type
<Button onClick={() => {
  const restorePayload = { destination: "/restore" };
  if (type === "database") {
    restorePayload.restoreDb = true;
    restorePayload.restoreFiles = false;
  } else if (type === "files" || type === "config") {
    restorePayload.restoreFiles = true;
    restorePayload.restoreDb = false;
  } else if (type === "full") {
    restorePayload.restoreFiles = true;
    restorePayload.restoreDb = true;
  }
  backupApi(`/backups/${id}/restore`, {
    method: "POST",
    body: JSON.stringify(restorePayload),
  });
}}
```

---

### Backend Changes

#### [backend/src/modules/backup/backup.manager.js](backend/src/modules/backup/backup.manager.js)

**Change: Added "config" type to metadata collection (line 212-218)**
```javascript
// Before:
const fileBackupMeta =
  rec.type === "files" || rec.type === "full"
    ? { fileCount: filePaths.length, paths: filePaths.slice(0, 50) }
    : null;

// After:
const fileBackupMeta =
  rec.type === "files" || rec.type === "full" || rec.type === "config"
    ? { fileCount: filePaths.length, paths: filePaths.slice(0, 50) }
    : null;
```

#### [backend/src/modules/backup/worker/restoreRunner.js](backend/src/modules/backup/worker/restoreRunner.js)

**Change: Fixed restore flags logic for all backup types (line 26-31)**
```javascript
// Before: Negative logic (confusing and error-prone)
if (restoreFiles === undefined) {
  restoreFiles = backup.type !== "database";
}
if (restoreDb === undefined) {
  restoreDb = backup.type !== "files";
}

// After: Explicit positive logic
if (restoreFiles === undefined) {
  restoreFiles = backup.type === "files" || backup.type === "full" || backup.type === "config";
}
if (restoreDb === undefined) {
  restoreDb = backup.type === "database" || backup.type === "full";
}
```

---

## Behavior Matrix

| Backup Type | Database | Files | Config |
|-------------|----------|-------|--------|
| `database` | ✅ Backed up | ❌ Not backed up | ❌ Not backed up |
| `files` | ❌ Not backed up | ✅ User-specified | ❌ Not backed up |
| `config` | ❌ Not backed up | ✅ User-specified | ❌ Not backed up |
| `full` | ✅ Backed up | ✅ User-specified | ❌ Not backed up |

### Restore Behavior

| Backup Type | Restore DB | Restore Files |
|-------------|-----------|---------------|
| `database` | ✅ Yes | ❌ No |
| `files` | ❌ No | ✅ Yes |
| `config` | ❌ No | ✅ Yes |
| `full` | ✅ Yes | ✅ Yes |

---

## Testing Checklist

- ✅ Can create "Database Only" backups
- ✅ Can create "Files Only" backups by specifying file paths
- ✅ Can create "Config Only" backups by specifying config file paths
- ✅ Can create "Full" backups with both database and specified files
- ✅ File paths section shows only for types that need it (files, config, full)
- ✅ File paths are properly included in request payload
- ✅ Backup metadata correctly captures file count and paths
- ✅ Restore button shows correct flags based on backup type
- ✅ Database-only backups restore only database
- ✅ File backups restore only files
- ✅ Full backups restore both database and files
- ✅ Config backups restore only files (not database)

---

## Validation Rules

The backend enforces these validation rules (Zod schema):

```javascript
// CreateBackupInputSchema
.refine(
  (data) => {
    // Files and config types MUST have at least one file path
    if (data.type === "files" || data.type === "config") {
      return Array.isArray(data.files) && data.files.length > 0;
    }
    return true;
  },
  {
    message: "At least one file path is required for files/config backup type",
    path: ["files"],
  }
)
```

---

## How to Use

### Creating a Full Backup with Files

1. Click "Create Backup" button
2. Select "Full Backup" type (shows database + files description)
3. Optionally enter a backup name (e.g., "Weekly Prod Backup")
4. **Important:** The "Directories / Files to Back Up" section now appears for Full Backup
5. Add server-side directory paths to include (e.g., `/var/www/uploads`, `/var/backups`)
6. Select retention period and storage provider (optional)
7. Click "Create Backup"

### Creating a Config-Only Backup

1. Click "Create Backup" button
2. Select "Config Only" type
3. Add paths to configuration files/directories (e.g., `/etc/nginx/conf.d`, `/home/app/.env`)
4. Click "Create Backup"

---

## Technical Details

### File Path Handling
- Paths are validated on the backend to prevent path traversal attacks
- Absolute paths recommended (e.g., `/var/www/uploads` not `~/uploads`)
- Multiple paths can be specified
- Relative paths are normalized and validated

### Metadata Storage
- When files are included in a backup, metadata is stored with:
  - `fileCount`: Number of files backed up
  - `paths`: Array of first 50 file paths (to avoid bloating JSON)
  - `type`: Backup type identifier

### Archive Structure
- All files are combined into a single tar.gz archive
- Database dump (if applicable) is included as `db.sql`
- Regular files maintain their relative path structure in the archive

---

## Debugging

If users see "Validation failed" error:
1. Check that file/config backups have at least one file path specified
2. Ensure paths are non-empty strings (whitespace doesn't count)
3. Verify paths don't contain special characters that might cause issues

If backups show in UI but metadata is missing:
- Check backend logs for any metadata serialization errors
- Verify Prisma backup update succeeded
- Ensure backup status changed to "success"

---

## Related Documentation

- [BACKUP_QUICK_REFERENCE.md](BACKUP_QUICK_REFERENCE.md) - Quick reference for all backup types
- [BACKUP_MODULE_TESTING_GUIDE.md](BACKUP_MODULE_TESTING_GUIDE.md) - Comprehensive testing guide
- Schema: [backend/src/schemas/backup.js](backend/src/schemas/backup.js)
- Manager: [backend/src/modules/backup/backup.manager.js](backend/src/modules/backup/backup.manager.js)
- Restore: [backend/src/modules/backup/worker/restoreRunner.js](backend/src/modules/backup/worker/restoreRunner.js)