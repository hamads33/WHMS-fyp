# Login Debugging Guide

## Steps to Diagnose Login Issue

1. **Start the backend** (in `/backend`):
   ```bash
   npm run dev
   ```
   Watch for logs like:
   - `[LOGIN] Success for: superadmin@example.com`
   - `[AUTH.SERVICE] Session created. ID: xxx`

2. **Start the frontend** (in `/frontend`):
   ```bash
   npm run dev
   ```

3. **Open browser DevTools** (F12) → Console tab

4. **Navigate to** `http://localhost:3000/login`

5. **Try to login** with:
   - Email: `superadmin@example.com`
   - Password: `SuperAdmin123!`

6. **Check the logs**:

   **In Browser Console:**
   - Look for `[AUTH] Login attempt: superadmin@example.com`
   - Look for `[AUTH] Login response:` with user data
   - Look for `[AUTH] Loading session...`
   - Look for `[AUTH] Session loaded:` OR `[AUTH] loadSession error:`
   - Look for `[API] 401 Unauthorized response from: /auth/sessions/current` (if it fails)

   **In Terminal (Backend):**
   - Look for `[LOGIN] Success for: superadmin@example.com`
   - Look for `[AUTH.SERVICE] Session created. ID:` 
   - Look for `[AUTH.GUARD] Session found. UserId:` OR `[AUTH.GUARD] Session NOT found. Token:`

## Common Issues

### 1. Session NOT found at authGuard
**Symptom:** Backend logs show "Session NOT found"
**Cause:** Token mismatch or session wasn't created
**Fix:** Check if token string matches exactly

### 2. API returns 401 on /auth/sessions/current
**Symptom:** Browser logs show `[API] 401 Unauthorized response from: /auth/sessions/current`
**Cause:** Cookie not being sent OR session not found
**Fix:** Check Network tab in DevTools:
   - Request to /auth/sessions/current should have `Cookie` header
   - Response should have no `Set-Cookie` headers  
   - Response status should be 200, not 401

### 3. No logs at all
**Symptom:** Can't find any `[AUTH]` logs
**Cause:** Login page might not be calling the login function
**Fix:** Check the login form submission

## Network Tab Inspection

1. Open DevTools → Network tab
2. Try login
3. Look for requests to `localhost:4000/api/auth/login`
4. Check:
   - Response status (should be 200)
   - Response has `Set-Cookie` headers for `access_token` and `refresh_token`
4. Look for subsequent request to `localhost:4000/api/auth/sessions/current`
   - Should have `Cookie` header
   - Should return 200 with user data

## Database Check

If both logs show success but frontend still fails, check the database:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.session.findMany({ where: { userId: 'ea27b74d-bb76-4789-b18b-0686c0f07a62' }, select: { id: true, token: true, expiresAt: true } })
  .then(s => console.log('Sessions:', s.length, s.map(x => ({ id: x.id, token: x.token.slice(0,20)+'...', exp: x.expiresAt }))))
  .finally(() => prisma.\$disconnect());
"
```

Should show at least one session for superadmin.
