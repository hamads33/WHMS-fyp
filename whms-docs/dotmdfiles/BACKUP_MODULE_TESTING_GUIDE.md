# Backup Module - Complete Testing Guide

## Prerequisites
- Backend running at http://localhost:4000
- Frontend running at http://localhost:3000
- PostgreSQL database connected
- Redis running (for job queue)

## Frontend Features Testing

### Test 1: Modal Loads Correctly
1. Navigate to `/admin/backups`
2. Click "New Backup" button
3. ✅ Modal should open showing:
   - Backup Name input
   - 3 Backup Type options (Full, Database Only, Files Only)
   - Storage Provider dropdown
   - Retention Period slider
   - Cancel and Create Backup buttons

### Test 2: Files-Only Type Shows Path Inputs
1. Open Create Backup modal
2. Click "Files Only" type
3. ✅ Should see new section:
   - "Directories / Files to Back Up" label
   - At least one text input with placeholder "/var/www/uploads"
   - "Add Path" button
   - Remove (×) button (disabled when only 1 path)

### Test 3: Add Multiple File Paths
1. Select "Files Only" type
2. In first input, enter: `/var/www/uploads`
3. Click "Add Path"
4. ✅ New input should appear
5. Enter second path: `/etc/nginx`
6. ✅ Both paths visible and editable

### Test 4: Remove File Path
1. Select "Files Only" with 2+ paths entered
2. Click × button on any path
3. ✅ Path should be removed
4. With 1 path remaining, × button should be disabled (grayed out)

### Test 5: Create Full Backup (No Files Required)
1. Open Create Backup modal
2. Select "Full Backup"
3. Enter name: "test-full-backup"
4. Click "Create Backup"
5. ✅ Backup should create successfully
6. Modal closes, returns to backups list

### Test 6: Create Database-Only Backup
1. Open Create Backup modal
2. Select "Database Only"
3. Enter name: "test-db-backup"
4. Click "Create Backup"
5. ✅ Backup should create successfully without files

### Test 7: Create Files-Only Backup
1. Open Create Backup modal
2. Select "Files Only"
3. Enter name: "test-files-backup"
4. Enter path: `/tmp`
5. Click "Create Backup"
6. ✅ Backup should create successfully
7. ✅ Modal shows success, refreshes list

### Test 8: Files-Only Requires Paths
1. Open Create Backup modal
2. Select "Files Only"
3. Don't add any file paths (leave empty)
4. Click "Create Backup"
5. ✅ Should see error: "Validation failed. Please check your inputs..."

### Test 9: Storage Provider Selection
1. Open Create Backup modal
2. Click Storage Provider dropdown
3. ✅ Should see "Local storage (default)" option
4. ✅ Should see any configured storage providers (S3, SFTP, etc.)
5. Select a provider
6. ✅ Provider should remain selected

### Test 10: Retention Period Configuration
1. Open Create Backup modal
2. Adjust the retention period slider
3. ✅ Number should update (1 day to 1 year range)
4. Default should be 30 days

## Backend API Testing

### Test 11: Create Backup via API (cURL)
```bash
# Files backup
curl -X POST http://localhost:4000/api/backups \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_auth_token]" \
  -d '{
    "name": "api-test-files",
    "type": "files",
    "files": [{"path": "/tmp"}],
    "retentionDays": 30
  }'

# Should return:
# {"success": true, "data": {"id": N, "name": "api-test-files", "type": "files", "status": "queued", ...}}
```

### Test 12: Database-Only Backup via API
```bash
curl -X POST http://localhost:4000/api/backups \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_auth_token]" \
  -d '{
    "name": "api-test-db",
    "type": "database",
    "retentionDays": 30
  }'

# Should return success
```

### Test 13: Full Backup via API
```bash
curl -X POST http://localhost:4000/api/backups \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_auth_token]" \
  -d '{
    "name": "api-test-full",
    "type": "full",
    "files": [{"path": "/tmp"}],
    "retentionDays": 30
  }'

# Should return success
```

### Test 14: Validation - Missing Files for Files Type
```bash
curl -X POST http://localhost:4000/api/backups \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_auth_token]" \
  -d '{
    "name": "invalid-files",
    "type": "files",
    "files": []
  }'

# Should return 400:
# {"success": false, "error": "Validation failed", "details": [...]}
```

### Test 15: List All Backups
```bash
curl http://localhost:4000/api/backups \
  -H "Cookie: [your_auth_token]"

# Should return:
# {"success": true, "data": [{backup records}]}
```

### Test 16: Get Backup Details
```bash
curl http://localhost:4000/api/backups/[BACKUP_ID] \
  -H "Cookie: [your_auth_token]"

# Should include metadata field with fileCount and paths
```

## Database Verification

### Test 17: Check Backup Metadata
```sql
-- Connect to PostgreSQL
psql -U postgres -d whms

-- Query backups with metadata
SELECT 
  id,
  name,
  type,
  status,
  metadata,
  "createdAt"
FROM "Backup"
WHERE type IN ('files', 'full')
ORDER BY id DESC
LIMIT 5;

-- Expected output for files/full backups:
-- metadata should contain: {"type":"files","fileCount":N,"paths":[...]}
```

### Test 18: Verify Backup Table Schema
```sql
\d "Backup"

-- Should show:
-- metadata | json | NULL
```

## Backup Execution Testing

### Test 19: Monitor Backup Progress
1. Create a files backup from modal
2. Go back to backups list
3. ✅ Backup status should progress: queued → running → success
4. ✅ sizeBytes should populate after completion
5. ✅ finishedAt timestamp should update

### Test 20: Check Backup Step Logs
```bash
curl http://localhost:4000/api/backups/[BACKUP_ID]/logs \
  -H "Cookie: [your_auth_token]"

# Should show steps:
# - job_started
# - provider_ready
# - archive_ready
# - upload_started
# - upload_finished
# - Success status
```

## Restore Testing

### Test 21: Restore Files-Only Backup
1. List backups, find files-only with status "success"
2. Click "Restore" action
3. ✅ Restore should start (check status in list or logs)
4. ✅ Files should extract to `./storage/restores/backup-[ID]-[TIMESTAMP]/`

### Test 22: Restore Database-Only Backup
1. Find database-only backup with status "success"
2. Click "Restore"
3. ✅ Restore should process (db.sql extraction)
4. ✅ Check logs for restore_finished with success status

### Test 23: Download Backup
1. Find completed backup
2. Click "Download" (if menu option available)
3. ✅ Should download .tar.gz file

## Error Handling Testing

### Test 24: Invalid Path in Files Backup
1. Select "Files Only"
2. Enter invalid path: `/../../../etc/shadow` (path traversal attempt)
3. Create backup
4. ✅ Backup should fail with error during execution
5. ✅ Status should be "failed" with error message

### Test 25: Non-existent Path
1. Select "Files Only"
2. Enter non-existent path: `/this/path/does/not/exist`
3. Create backup
4. ✅ Backup should fail (no files found)
5. ✅ Error log should show reason

### Test 26: Missing Required Fields
```bash
# Missing type (required)
curl -X POST http://localhost:4000/api/backups \
  -H "Content-Type: application/json" \
  -H "Cookie: [your_auth_token]" \
  -d '{"name": "test"}'

# Should return validation error (400)
```

## Performance Testing

### Test 27: Backup Large Directory
1. Create files backup pointing to directory with 100+ files
2. ✅ Backup should complete (may take time)
3. ✅ sizeBytes should accurately reflect archive size
4. ✅ fileCount in metadata should match actual files

### Test 28: Multiple Concurrent Backups
1. Create 5 file backups in quick succession
2. ✅ All should queue and process in order
3. ✅ Status list should show multiple running/queued

## Compatibility Testing

### Test 29: Existing Database Backups Still Work
1. Ensure old database backups still function
2. Create new database-only backup
3. ✅ Both should work without interference

### Test 30: Restore Old Backups (Pre-Feature)
1. If you have backups from before file support
2. Try to restore one
3. ✅ Should work (metadata will be null/empty)

## Analytics & Reporting

### Test 31: Backup Type Distribution
1. Create various backup types:
   - 2 × Files backups
   - 2 × Database backups
   - 1 × Full backup
2. Go to `/admin/backups/analytics`
3. ✅ "By Type" chart should show distribution
4. ✅ Files, Database, Full all visible

### Test 32: Storage Used by Type
1. Same as Test 31
2. Check analytics page
3. ✅ Should see total storage used
4. ✅ Breakdown by type shown

### Test 33: Success/Failure Rate
1. After running multiple backups
2. Check analytics
3. ✅ Success Rate % should calculate correctly
4. ✅ Failed/Running counts accurate

## Checklist Summary

### Frontend ✅
- [ ] Modal opens/closes
- [ ] File paths UI appears for Files type
- [ ] Add/remove paths works
- [ ] Can create Full backup
- [ ] Can create Database backup
- [ ] Can create Files backup (with paths)
- [ ] Validation prevents empty file paths
- [ ] Error messages display

### Backend ✅
- [ ] POST /api/backups validates correctly
- [ ] Files type requires paths
- [ ] Backup records create with status "queued"
- [ ] metadata field stores file info
- [ ] Path validation prevents traversal

### Database ✅
- [ ] metadata column exists
- [ ] Stores fileCount for file backups
- [ ] Stores paths array (capped at 50)
- [ ] Old backups still query correctly

### Execution ✅
- [ ] Backups progress through states
- [ ] Step logs create correctly
- [ ] Archives generate
- [ ] Files get backed up
- [ ] Database dump occurs for full/db types

### Restore ✅
- [ ] Files restore correctly
- [ ] Database restore works
- [ ] Path traversal protection active
- [ ] Destination directory created

## Known Limitations

1. **Path Selection**: Currently text-based input only (no file browser UI)
2. **Selective Restore**: Flags implemented but UI doesn't expose selection yet
3. **Incremental Backups**: Not yet supported (full copies only)
4. **Pattern Exclusions**: Can't exclude file patterns (e.g., *.tmp)

## Next Steps

1. Run all tests above
2. Check console for errors
3. Verify database consistency
4. Test with production-like data
5. Document any issues found