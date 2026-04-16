# Backup Module - Quick Reference Card

## Create Backup - Frontend
```
/admin/backups → "New Backup" button
  ↓
Select Type: Full | Database Only | Files Only
  ↓
For Files Only: Enter paths (/var/www, /etc/nginx, etc.)
  ↓
Set Name (optional), Retention (default 30 days)
  ↓
Click "Create Backup"
```

## Create Backup - API
```javascript
// Files-only
POST /api/backups
{
  "type": "files",
  "name": "Web uploads",
  "files": [
    {"path": "/var/www/uploads"},
    {"path": "/app/config"}
  ],
  "retentionDays": 30
}

// Full
POST /api/backups
{
  "type": "full",
  "files": [{"path": "/var/www"}],
  "name": "Full system"
}

// Database only
POST /api/backups
{
  "type": "database",
  "name": "DB snapshot"
}
```

## Backup Lifecycle
```
Created (API) → Queued (stored) → Running (executing)
                                    ↓
                         Success (completed) ✓
                                    ↓
                         Stored as .tar.gz
                                    ↓
                         Restore/Download available
```

## Backup Status States
| Status | Meaning |
|--------|---------|
| `queued` | Waiting to run |
| `running` | Currently executing |
| `success` | Completed successfully |
| `failed` | Error occurred |

## Database Queries
```sql
-- List all file backups
SELECT id, name, metadata, status FROM "Backup" 
WHERE type = 'files' ORDER BY "createdAt" DESC;

-- Check metadata
SELECT id, metadata->>'fileCount' as files,
       metadata->'paths' as paths
FROM "Backup" WHERE type = 'files';

-- Storage usage
SELECT type, COUNT(*), 
       ROUND(SUM("sizeBytes")/1024/1024/1024, 2) as gb
FROM "Backup" GROUP BY type;
```

## Common Tasks

### ✅ Create Files-Only Backup
1. Select "Files Only" type
2. Add path: `/var/www/uploads`
3. Click "Add Path" for more
4. Create → Status: queued → running → success

### ✅ Restore a Backup
1. Find backup in list
2. Click ... menu → "Restore"
3. Check logs for status
4. Files in `./storage/restores/backup-{ID}-{timestamp}/`

### ✅ Monitor Progress
1. Main backups page shows all backups
2. Check "Real-Time Activity Timeline"
3. Status: queued → running → success/failed
4. Click backup to see step logs

### ✅ Check What Was Backed Up
```sql
SELECT metadata FROM "Backup" WHERE id = 123;
-- Returns: {"type":"files","fileCount":5,"paths":[...]}
```

## Validation Rules
| Rule | Error | Fix |
|------|-------|-----|
| Files type without paths | "Validation failed" | Add paths in modal |
| Invalid path (../etc/shadow) | Path validation error | Use valid absolute paths |
| Path doesn't exist | Backup fails | Verify path exists |
| No files/db selected | "No files selected" | Check type and inputs |

## Storage Providers
```
Local (default) - Files stored in ./backups/
S3 - Upload to Amazon S3 bucket
SFTP - Upload to remote SFTP server
Custom - Via plugin system
```

## Retention & Cleanup
```
Set at creation: retentionDays = 30 (default)
Auto-delete after: createdAt + retentionDays
Manual delete: Delete endpoint removes backup
```

## API Response Format
```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "my-backup",
    "type": "files",
    "status": "success",
    "filePath": "s3://bucket/my-backup-123.tar.gz",
    "sizeBytes": 1024000,
    "metadata": {
      "type": "files",
      "fileCount": 5,
      "paths": ["/var/www"]
    },
    "retentionDays": 30,
    "createdAt": "2026-04-07T11:26:00Z",
    "startedAt": "2026-04-07T11:26:05Z",
    "finishedAt": "2026-04-07T11:28:00Z"
  }
}
```

## Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Validation failed" | Files type without paths | Add file paths |
| "No files selected" | No valid files found | Check paths exist |
| "Path traversal not allowed" | Using ../ in path | Use absolute paths |
| "Cannot POST /api/api/backups" | Double /api/ prefix | Frontend API client issue |
| "stat() failed" | Provider can't get file size | Continue anyway (not critical) |

## Performance Notes
- Small backup (1-100MB): ~30 sec
- Medium backup (100MB-1GB): ~2-5 min
- Large backup (1-10GB): ~10-30 min
- Metadata limited to 50 paths per backup

## Files Modified
```
✅ backend/prisma/schema.prisma
✅ backend/src/schemas/backup.js
✅ backend/src/modules/backup/backup.manager.js
✅ backend/src/modules/backup/worker/restoreRunner.js
✅ frontend/src/components/create-backup-modal.jsx
```

## Next Steps
1. ✅ Test backup creation with files
2. ✅ Verify metadata in database
3. ✅ Test restore functionality
4. ✅ Monitor via analytics dashboard
5. ✅ Set up scheduled backups (via automation)

---

**Full Documentation:**
- `BACKUP_MODULE_SUMMARY.md` - Complete feature guide
- `FILE_BACKUP_IMPLEMENTATION.md` - Technical details
- `BACKUP_MODULE_TESTING_GUIDE.md` - Test cases