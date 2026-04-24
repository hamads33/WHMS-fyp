# WHMS — Web Hosting Management System
## Testing Documentation: Chapters 3, 5, and 6

---

# CHAPTER 3 — REQUIREMENT-BASED TESTING

## 3.1 Overview

This chapter documents requirement-based test cases derived directly from the Functional Requirements Specification (FRS). Each test case is designed to validate one or more related functional requirements simultaneously, reflecting realistic API call sequences rather than isolated unit checks. Test cases are grouped by module criticality and cover both positive (happy path) and negative (fault injection) scenarios.

---

## 3.2 Test Cases

### TC-AUTH-01 — User Registration with Duplicate Email Rejection

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTH-01 |
| **Requirements Covered** | FR-AUTH-01, FR-AUTH-02, FR-AUTH-03, FR-AUTH-04, FR-AUTH-05 |
| **Description** | Register a new user account, verify the system assigns a default role and queues a verification email, then attempt to register the same email again and confirm rejection. |
| **Preconditions** | Email `test@example.com` does not exist in the database. |
| **Input (Step 1)** | `POST /api/auth/register` — `{ "email": "test@example.com", "password": "SecurePass123!" }` |
| **Expected Output (Step 1)** | HTTP 201; response body contains user ID, assigned default role, and a confirmation that verification email was queued. No token is returned at this stage. |
| **Input (Step 2)** | `POST /api/auth/register` — `{ "email": "test@example.com", "password": "AnotherPass456!" }` |
| **Expected Output (Step 2)** | HTTP 409; error code `EMAIL_ALREADY_EXISTS`; no new user record created in database. |
| **Type** | Positive (Step 1) / Negative (Step 2) |

---

### TC-AUTH-02 — Login Flow with JWT Issuance and Session Persistence

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTH-02 |
| **Requirements Covered** | FR-AUTH-10, FR-AUTH-11, FR-AUTH-12, FR-AUTH-13, FR-AUTH-14 |
| **Description** | Authenticate a verified user and validate that the system issues both an access token and a refresh token, stores a session record in the database with correct metadata, and allows a second login from a different simulated client without invalidating the first session. |
| **Preconditions** | User account exists and email is verified. |
| **Input** | `POST /api/auth/login` — `{ "email": "test@example.com", "password": "SecurePass123!" }` from two different `User-Agent` strings. |
| **Expected Output** | HTTP 200 on both requests; each response contains `accessToken` (JWT) and `refreshToken`; database contains two distinct session records each with correct `ipAddress` and `userAgent` fields; access tokens decode to correct user ID and role claims. |
| **Type** | Positive |

---

### TC-AUTH-03 — Login with Invalid Credentials and Audit Logging

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTH-03 |
| **Requirements Covered** | FR-AUTH-10, FR-AUDIT-01 |
| **Description** | Attempt login with a correct email but wrong password; verify the system rejects the request and logs the failed attempt. |
| **Preconditions** | User `test@example.com` exists and is verified. |
| **Input** | `POST /api/auth/login` — `{ "email": "test@example.com", "password": "WrongPassword!" }` |
| **Expected Output** | HTTP 401; response body contains generic error `INVALID_CREDENTIALS` (not revealing which field was wrong); an audit log record is created with `event: login_failed`, `ip`, `userAgent`, and timestamp; no session record is created. |
| **Type** | Negative |

---

### TC-AUTH-04 — Refresh Token Rotation and Session Revocation

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTH-04 |
| **Requirements Covered** | FR-AUTH-12, FR-AUTH-15, FR-AUTH-16 |
| **Description** | Use a valid refresh token to obtain a new access token, then revoke the session via logout and confirm the refresh token is invalidated. |
| **Preconditions** | Active session exists with valid `refreshToken`. |
| **Input (Step 1)** | `POST /api/auth/refresh` — `{ "refreshToken": "<valid_token>" }` |
| **Expected Output (Step 1)** | HTTP 200; new `accessToken` returned; session record remains active. |
| **Input (Step 2)** | `POST /api/auth/logout` with the original `refreshToken`. |
| **Expected Output (Step 2)** | HTTP 200; session record marked revoked; subsequent call to `POST /api/auth/refresh` with the same token returns HTTP 401 with `SESSION_REVOKED`. |
| **Type** | Positive / Negative |

---

### TC-AUTH-05 — Password Reset Full Flow with Session Invalidation

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTH-05 |
| **Requirements Covered** | FR-PASS-01, FR-PASS-02, FR-PASS-03, FR-PASS-04, FR-PASS-05, FR-PASS-06, FR-PASS-07 |
| **Description** | Initiate a password reset, use the generated token to set a new password, and verify all active sessions are revoked. Attempt to reuse the same reset token. |
| **Preconditions** | User has two active sessions. |
| **Input (Step 1)** | `POST /api/auth/forgot-password` — `{ "email": "test@example.com" }` |
| **Expected Output (Step 1)** | HTTP 200; reset token created in DB (hashed); background email queued; audit record for `password_reset_requested`. |
| **Input (Step 2)** | `POST /api/auth/reset-password` — `{ "token": "<valid_reset_token>", "newPassword": "NewSecure789!" }` |
| **Expected Output (Step 2)** | HTTP 200; password hash updated; both active sessions revoked; audit record for `password_reset_completed`. |
| **Input (Step 3)** | Reuse the same reset token. |
| **Expected Output (Step 3)** | HTTP 400; error `TOKEN_ALREADY_USED_OR_EXPIRED`. |
| **Type** | Positive / Negative |

---

### TC-AUTH-06 — MFA Enrolment, Login Challenge, and Backup Code Recovery

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTH-06 |
| **Requirements Covered** | FR-MFA-01, FR-MFA-02, FR-MFA-03, FR-MFA-04, FR-MFA-05 |
| **Description** | Enrol a user in TOTP-based MFA, verify login requires a TOTP challenge, attempt login with an invalid TOTP, and complete login using a backup recovery code. |
| **Preconditions** | Authenticated user without MFA enabled. |
| **Input (Step 1)** | `POST /api/auth/mfa/enrol` (authenticated). |
| **Expected Output (Step 1)** | HTTP 200; `otpAuthUrl` and `backupCodes` array returned; TOTP secret stored encrypted in DB. |
| **Input (Step 2)** | `POST /api/auth/login` with valid credentials. |
| **Expected Output (Step 2)** | HTTP 200 with `mfaRequired: true` and a partial session token; no full `accessToken` issued yet. |
| **Input (Step 3)** | `POST /api/auth/mfa/verify` with invalid TOTP code. |
| **Expected Output (Step 3)** | HTTP 401; `INVALID_MFA_CODE`; no session created. |
| **Input (Step 4)** | `POST /api/auth/mfa/verify` with a valid backup code. |
| **Expected Output (Step 4)** | HTTP 200; full `accessToken` and `refreshToken` issued; used backup code invalidated in DB. |
| **Type** | Positive / Negative |

---

### TC-AUTH-07 — Impersonation Session Lifecycle and Audit Trail

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTH-07 |
| **Requirements Covered** | FR-IMP-01, FR-IMP-02, FR-IMP-03, FR-IMP-04, FR-IMP-05, FR-IMP-07, FR-IMP-08 |
| **Description** | An administrator initiates an impersonation session against a client account (with justification), performs an API call as that client, ends the session, and verifies the audit record captures both start and end. |
| **Preconditions** | Admin token present; target user ID known. |
| **Input (Step 1)** | `POST /api/admin/impersonation/start` — `{ "userId": 42, "reason": "Investigating billing dispute" }` |
| **Expected Output (Step 1)** | HTTP 200; impersonation `accessToken` and `refreshToken` returned; impersonation session record created separately from standard sessions; audit entry recorded. |
| **Input (Step 2)** | Call `GET /api/client/orders` using the impersonation token. |
| **Expected Output (Step 2)** | HTTP 200; orders for user 42 returned; request context contains `impersonatedBy: <admin_id>`. |
| **Input (Step 3 — missing reason)** | `POST /api/admin/impersonation/start` — `{ "userId": 42 }` |
| **Expected Output (Step 3)** | HTTP 422; `REASON_REQUIRED` validation error. |
| **Input (Step 4)** | `POST /api/admin/impersonation/end` with impersonation token. |
| **Expected Output (Step 4)** | HTTP 200; impersonation session closed; audit record updated with end timestamp and duration. |
| **Type** | Positive / Negative |

---

### TC-RBAC-01 — Role Assignment and Permission Enforcement on Protected Endpoints

| Field | Detail |
|---|---|
| **Test Case ID** | TC-RBAC-01 |
| **Requirements Covered** | FR-RBAC-01, FR-RBAC-02, FR-RBAC-03, FR-RBAC-04, FR-RBAC-05, FR-ADMIN-01, FR-ADMIN-04 |
| **Description** | Attempt to access an admin-only endpoint with a client-role token, assign an admin role to the user, and retry the same request confirming access is granted. Verify the permissions endpoint reflects the updated role. |
| **Preconditions** | User exists with `client` role only. Admin token available. |
| **Input (Step 1)** | `GET /api/admin/clients` with client-role JWT. |
| **Expected Output (Step 1)** | HTTP 403; `INSUFFICIENT_PERMISSIONS`. |
| **Input (Step 2)** | `POST /api/admin/users/42/roles` — `{ "roleId": "admin" }` using admin token. |
| **Expected Output (Step 2)** | HTTP 200; role assignment saved; audit record created. |
| **Input (Step 3)** | Re-login and call `GET /api/admin/clients` with new JWT. |
| **Expected Output (Step 3)** | HTTP 200; client list returned; `GET /api/auth/me` shows updated roles and permissions. |
| **Type** | Positive / Negative |

---

### TC-RBAC-02 — API Key Permission Scoping

| Field | Detail |
|---|---|
| **Test Case ID** | TC-RBAC-02 |
| **Requirements Covered** | FR-API-01, FR-API-02, FR-API-03, FR-API-04, FR-API-05, FR-API-06 |
| **Description** | Generate an API key scoped to `orders:read` only, use it to read orders (succeeds), attempt to create an order (fails), then revoke the key and verify subsequent requests fail. |
| **Preconditions** | Authenticated user with client role. |
| **Input (Step 1)** | `POST /api/auth/api-keys` — `{ "name": "ReadOnly", "permissions": ["orders:read"] }` |
| **Expected Output (Step 1)** | HTTP 201; full key value returned once (plaintext); only hashed value stored in DB. |
| **Input (Step 2)** | `GET /api/client/orders` with `X-API-Key: <key>`. |
| **Expected Output (Step 2)** | HTTP 200; order list returned. |
| **Input (Step 3)** | `POST /api/client/orders` with same API key. |
| **Expected Output (Step 3)** | HTTP 403; `PERMISSION_DENIED`; API key usage audit record created. |
| **Input (Step 4)** | `DELETE /api/auth/api-keys/<id>`, then `GET /api/client/orders` with revoked key. |
| **Expected Output (Step 4)** | HTTP 401; `API_KEY_REVOKED`; revocation audit entry exists. |
| **Type** | Positive / Negative |

---

### TC-IP-01 — IP Allowlist and Denylist Enforcement

| Field | Detail |
|---|---|
| **Test Case ID** | TC-IP-01 |
| **Requirements Covered** | FR-IP-01, FR-IP-02, FR-IP-03, FR-IP-04 |
| **Description** | Add a denylist rule for a specific IP, verify a login attempt from that IP is rejected, then delete the rule and confirm access is restored. Also test CIDR notation rule. |
| **Preconditions** | Admin token available. |
| **Input (Step 1)** | `POST /api/admin/ip-rules` — `{ "type": "deny", "value": "192.168.1.100" }` |
| **Expected Output (Step 1)** | HTTP 201; rule saved. |
| **Input (Step 2)** | Login attempt from IP `192.168.1.100`. |
| **Expected Output (Step 2)** | HTTP 403; `IP_BLOCKED`. |
| **Input (Step 3)** | `POST /api/admin/ip-rules` — `{ "type": "deny", "value": "10.0.0.0/24" }` — login from `10.0.0.50`. |
| **Expected Output (Step 3)** | HTTP 403; CIDR block applied correctly. |
| **Input (Step 4)** | `DELETE /api/admin/ip-rules/<id>` for the `192.168.1.100` rule; retry login. |
| **Expected Output (Step 4)** | HTTP 200; login succeeds. |
| **Type** | Positive / Negative |

---

### TC-ORD-01 — Order Creation with Invoice Generation and Plan Availability Check

| Field | Detail |
|---|---|
| **Test Case ID** | TC-ORD-01 |
| **Requirements Covered** | FR-ORD-01, FR-ORD-02, FR-ORD-03, FR-SVC-09 |
| **Description** | Attempt to create an order for a plan with no active pricing entries (fails), add a pricing entry, then create the order successfully and verify an invoice record is atomically created. |
| **Preconditions** | Service plan exists but has no active pricing entries. Client is authenticated. |
| **Input (Step 1)** | `POST /api/client/orders` — `{ "planId": 5, "addons": [] }` |
| **Expected Output (Step 1)** | HTTP 412; `NO_ACTIVE_PRICING` precondition error; no order or invoice created. |
| **Input (Step 2)** | Admin adds active pricing entry to plan 5. |
| **Input (Step 3)** | Retry `POST /api/client/orders` — `{ "planId": 5, "addons": [101] }` |
| **Expected Output (Step 3)** | HTTP 201; order record created; invoice record with correct line items created within the same DB transaction; response contains `orderId` and `invoiceId`. |
| **Type** | Negative (Step 1) / Positive (Step 3) |

---

### TC-ORD-02 — Order Cancellation Event Emission and Lifecycle Update

| Field | Detail |
|---|---|
| **Test Case ID** | TC-ORD-02 |
| **Requirements Covered** | FR-ORD-07, FR-ORD-09, FR-ORD-10 |
| **Description** | Cancel an active order, verify the order status transitions correctly, and confirm the `order.cancelled` system event is emitted to the event bus, enabling downstream automation. |
| **Preconditions** | Active order in `active` status. |
| **Input** | `POST /api/client/orders/88/cancel` — `{ "reason": "No longer needed" }` |
| **Expected Output** | HTTP 200; order status updated to `cancelled`; `order.cancelled` event emitted (verifiable via automation execution history or event log); no invoice is generated for the cancellation. |
| **Type** | Positive |

---

### TC-ORD-03 — Administrative Order Override and Privileged Renewal

| Field | Detail |
|---|---|
| **Test Case ID** | TC-ORD-03 |
| **Requirements Covered** | FR-ORD-11, FR-ORD-12 |
| **Description** | Admin overrides the billing cycle of an order, sets a custom next renewal date, and manually triggers a renewal generating a new invoice. Attempt the same operations with a client-role token. |
| **Preconditions** | Order ID 88 exists; admin and client tokens available. |
| **Input (Step 1)** | `PATCH /api/admin/orders/88` — `{ "billingCycle": "annual", "nextRenewalDate": "2027-01-01" }` using admin token. |
| **Expected Output (Step 1)** | HTTP 200; order record updated; audit trail entry created. |
| **Input (Step 2)** | `POST /api/admin/orders/88/renew` using admin token. |
| **Expected Output (Step 2)** | HTTP 200; new renewal invoice created. |
| **Input (Step 3)** | Attempt `PATCH /api/admin/orders/88` with client token. |
| **Expected Output (Step 3)** | HTTP 403; `INSUFFICIENT_PERMISSIONS`. |
| **Type** | Positive / Negative |

---

### TC-PRV-01 — Automated Provisioning on order.paid Event

| Field | Detail |
|---|---|
| **Test Case ID** | TC-PRV-01 |
| **Requirements Covered** | FR-PRV-10, FR-ORD-10, FR-PRV-05, FR-PRV-06 |
| **Description** | Mark an invoice as paid, verify the `order.paid` event triggers automatic provisioning without manual admin action, and confirm the hosting account record is created. Simulate a server-side failure and verify order status transitions to `provisioning_failed`. |
| **Preconditions** | Order with active plan exists; server group configured with a default server. |
| **Input (Step 1)** | Admin marks invoice as paid via `POST /api/admin/invoices/55/confirm-payment`. |
| **Expected Output (Step 1)** | `order.paid` event emitted; provisioning job enqueued automatically; hosting account created on the target server via control panel API; order status updated to `active`. |
| **Input (Step 2)** | Simulate control panel API returning error 500. |
| **Expected Output (Step 2)** | Order status set to `provisioning_failed`; structured alert event emitted; no hosting account record left in an ambiguous state. |
| **Type** | Positive (Step 1) / Negative (Step 2) |

---

### TC-PRV-02 — Client Access Scoping on Provisioning Endpoints

| Field | Detail |
|---|---|
| **Test Case ID** | TC-PRV-02 |
| **Requirements Covered** | FR-PRV-01, FR-PRV-02, FR-PRV-11 |
| **Description** | Client retrieves their hosting accounts and usage stats. Attempt to access another client's hosting account. Verify no server credentials or control panel API keys appear in any response. |
| **Preconditions** | Two client accounts; each has one hosting account. |
| **Input (Step 1)** | `GET /api/client/hosting` using Client A's token. |
| **Expected Output (Step 1)** | HTTP 200; returns only Client A's hosting accounts; response contains no `cpApiKey`, `serverPassword`, or provisioning config fields. |
| **Input (Step 2)** | `GET /api/client/hosting/<client_B_account_id>` using Client A's token. |
| **Expected Output (Step 2)** | HTTP 404 (record not found in scope) or HTTP 403. |
| **Type** | Positive / Negative |

---

### TC-PRV-03 — Account Suspension and Restoration

| Field | Detail |
|---|---|
| **Test Case ID** | TC-PRV-03 |
| **Requirements Covered** | FR-PRV-07 |
| **Description** | Admin suspends a provisioned hosting account, verify the account is suspended on the server via the control panel API, then restore it and confirm full restoration with data intact. |
| **Preconditions** | Active hosting account provisioned on a registered server. |
| **Input (Step 1)** | `POST /api/admin/hosting/33/suspend` |
| **Expected Output (Step 1)** | HTTP 200; control panel API suspend call confirmed; account status updated to `suspended`; no account data deleted. |
| **Input (Step 2)** | `POST /api/admin/hosting/33/restore` |
| **Expected Output (Step 2)** | HTTP 200; control panel API restore call confirmed; account status back to `active`. |
| **Type** | Positive |

---

### TC-SEC-01 — JWT Expiry and Unauthorized Access Prevention

| Field | Detail |
|---|---|
| **Test Case ID** | TC-SEC-01 |
| **Requirements Covered** | FR-AUTH-11, FR-AUTH-17 |
| **Description** | Use an expired JWT to access a protected endpoint, verify rejection. Use a JWT with a tampered payload (modified role claim) and verify signature validation rejects it. |
| **Preconditions** | Valid user exists; expired and tampered tokens prepared. |
| **Input (Step 1)** | `GET /api/auth/me` with expired JWT (past `exp` claim). |
| **Expected Output (Step 1)** | HTTP 401; `TOKEN_EXPIRED`. |
| **Input (Step 2)** | `GET /api/admin/clients` with a JWT where the role claim was manually changed to `admin` but the signature is invalid. |
| **Expected Output (Step 2)** | HTTP 401; `INVALID_TOKEN_SIGNATURE`; access denied regardless of claimed role. |
| **Type** | Negative |

---

### TC-SEC-02 — Webhook HMAC Signature Validation

| Field | Detail |
|---|---|
| **Test Case ID** | TC-SEC-02 |
| **Requirements Covered** | FR-WEBHOOK-03, FR-WEBHOOK-04, FR-WEBHOOK-05 |
| **Description** | Register a webhook endpoint, trigger an event and verify the outbound payload is signed with HMAC SHA-256. Simulate an endpoint returning 500 and verify exponential retry behaviour. |
| **Preconditions** | Webhook endpoint configured with a known secret. |
| **Input (Step 1)** | Trigger an `auth.login_success` event. |
| **Expected Output (Step 1)** | Outbound HTTP request to webhook URL contains `X-Webhook-Signature` header; HMAC SHA-256 computed from payload + secret is verifiable; delivery log record created. |
| **Input (Step 2)** | Webhook endpoint returns HTTP 500 for 3 attempts. |
| **Expected Output (Step 2)** | System retries with exponential backoff (e.g., 30s, 60s, 120s); delivery log updated with each attempt, response code, and timestamp. |
| **Type** | Positive / Negative |

---

### TC-BAK-01 — Backup Job Queueing, Credential Encryption, and Download URL Generation

| Field | Detail |
|---|---|
| **Test Case ID** | TC-BAK-01 |
| **Requirements Covered** | FR-BAK-01, FR-BAK-02, FR-BAK-05, FR-BAK-06, FR-BAK-07, FR-BAK-09 |
| **Description** | Create an S3 backup storage configuration, verify credentials are never returned in responses, trigger an on-demand backup job, and request a pre-signed download URL. Attempt deletion of a config in use. |
| **Preconditions** | None. |
| **Input (Step 1)** | `POST /api/admin/backup/storage` — `{ "provider": "s3", "credentials": { "accessKey": "AKIA...", "secretKey": "abc123" } }` |
| **Expected Output (Step 1)** | HTTP 201; response contains config ID and metadata; `accessKey` and `secretKey` absent from response; credentials stored encrypted in DB. |
| **Input (Step 2)** | `POST /api/admin/backup/jobs` — `{ "type": "files", "storageConfigId": 1, "target": "/var/www" }` |
| **Expected Output (Step 2)** | HTTP 202; job ID returned immediately; job queued asynchronously. |
| **Input (Step 3)** | After job completion: `POST /api/admin/backup/jobs/<id>/download-url`. |
| **Expected Output (Step 3)** | HTTP 200; time-limited pre-signed URL returned; no S3 credentials included. |
| **Input (Step 4)** | Attempt `DELETE /api/admin/backup/storage/1` while backup job references it. |
| **Expected Output (Step 4)** | HTTP 409; `STORAGE_CONFIG_IN_USE` conflict error. |
| **Type** | Positive / Negative |

---

### TC-DOM-01 — Domain Registration with Invoice Pre-generation

| Field | Detail |
|---|---|
| **Test Case ID** | TC-DOM-01 |
| **Requirements Covered** | FR-DOM-04, FR-DOM-06, FR-DOM-03 |
| **Description** | Check domain availability, register the domain confirming an invoice is generated before the registrar API call, and verify registrar credentials are never exposed in the config response. |
| **Preconditions** | Porkbun registrar configured; domain `testdomain.com` available. |
| **Input (Step 1)** | `GET /api/domains/check?domain=testdomain.com&tlds=com,net` |
| **Expected Output (Step 1)** | HTTP 200; availability and pricing per TLD returned. |
| **Input (Step 2)** | `POST /api/domains/register` — `{ "domain": "testdomain.com", "tld": "com", "years": 1 }` |
| **Expected Output (Step 2)** | HTTP 201; invoice record created before registrar API call; domain record created in `active` state; domain ID returned. |
| **Input (Step 3)** | `GET /api/admin/registrar/config` |
| **Expected Output (Step 3)** | HTTP 200; no API key or credential values in response. |
| **Type** | Positive |

---

### TC-PLG-01 — Plugin Submission, Admin Approval, and Installation Flow

| Field | Detail |
|---|---|
| **Test Case ID** | TC-PLG-01 |
| **Requirements Covered** | FR-PLG-01, FR-PLG-02, FR-PLG-04, FR-PLG-05, FR-PLG-10, FR-MKT-11 |
| **Description** | Developer submits a plugin with a valid ZIP manifest, admin approves the version, and a client installs it synchronously. Attempt submission with a non-ZIP file. |
| **Preconditions** | Developer account authenticated; valid plugin ZIP prepared. |
| **Input (Step 1)** | `POST /api/developer/plugins` — multipart form with valid ZIP. |
| **Expected Output (Step 1)** | HTTP 201; plugin created in `draft` status; not visible in public marketplace. |
| **Input (Step 2)** | `POST /api/admin/plugins/<id>/versions/<vId>/approve` |
| **Expected Output (Step 2)** | HTTP 200; version status `approved`; plugin visible in marketplace. |
| **Input (Step 3)** | `POST /api/plugins/<id>/install` (synchronous endpoint). |
| **Expected Output (Step 3)** | HTTP 200; plugin extracted, routes registered, config stored within single transaction. |
| **Input (Step 4)** | `POST /api/developer/plugins` — with `.tar.gz` file. |
| **Expected Output (Step 4)** | HTTP 422; `INVALID_PACKAGE_FORMAT`. |
| **Type** | Positive / Negative |

---

### TC-AUTO-01 — Automation Profile with Cron Scheduling and On-Demand Execution

| Field | Detail |
|---|---|
| **Test Case ID** | TC-AUTO-01 |
| **Requirements Covered** | FR-AUTO-01, FR-AUTO-02, FR-AUTO-03, FR-AUTO-06, FR-AUTO-07, FR-AUTO-10 |
| **Description** | Create an automation profile with a cron schedule, enable it to register the scheduler trigger, trigger immediate execution and verify the run is queued asynchronously, then disable and verify the scheduler trigger is removed at runtime. |
| **Preconditions** | None. |
| **Input (Step 1)** | `POST /api/admin/automation/profiles` — `{ "name": "Nightly Cleanup", "cronExpression": "0 2 * * *", "tasks": [...] }` |
| **Expected Output (Step 1)** | HTTP 201; profile created in disabled state; cron expression accepted and validated. |
| **Input (Step 2)** | `POST /api/admin/automation/profiles/<id>/enable` |
| **Expected Output (Step 2)** | HTTP 200; scheduler trigger registered at runtime; profile status `enabled`. |
| **Input (Step 3)** | `POST /api/admin/automation/profiles/<id>/run` |
| **Expected Output (Step 3)** | HTTP 202; run ID returned immediately; execution job enqueued; execution history record created. |
| **Input (Step 4)** | `POST /api/admin/automation/profiles/<id>/disable` |
| **Expected Output (Step 4)** | HTTP 200; scheduler trigger removed at runtime; no system restart required. |
| **Type** | Positive |

---

### TC-WF-01 — Workflow Execution with Variable Substitution and Inbound Webhook Trigger

| Field | Detail |
|---|---|
| **Test Case ID** | TC-WF-01 |
| **Requirements Covered** | FR-WF-01, FR-WF-05, FR-WF-06, FR-WF-07, FR-WF-08, FR-WF-11, FR-WF-12 |
| **Description** | Create a workflow with inter-step variable bindings, execute it directly, verify runtime variable substitution, register an inbound webhook trigger, and invoke the workflow via the public webhook receiver endpoint. |
| **Preconditions** | Workflow definition created with step referencing output from previous step via `{{steps.step1.output.userId}}`. |
| **Input (Step 1)** | `POST /api/workflows/<id>/execute` — `{ "input": { "userId": 42 } }` |
| **Expected Output (Step 1)** | HTTP 202; run ID returned; background job processes variable substitution correctly; execution record shows per-step results. |
| **Input (Step 2)** | `POST /api/workflows/<id>/webhooks` — `{ "name": "ExternalTrigger" }` |
| **Expected Output (Step 2)** | HTTP 201; public webhook URL returned. |
| **Input (Step 3)** | `POST <public_webhook_url>` with a JSON payload. |
| **Expected Output (Step 3)** | HTTP 200; payload verified; workflow execution started with received payload as input. |
| **Type** | Positive |

---

### TC-CLI-01 — Client Account Creation, Lifecycle, and Session Revocation

| Field | Detail |
|---|---|
| **Test Case ID** | TC-CLI-01 |
| **Requirements Covered** | FR-CLI-01, FR-CLI-06, FR-CLI-07, FR-CLI-08, FR-CLI-12 |
| **Description** | Admin creates a client account, deactivates it, confirms all historical records (orders, invoices) are preserved, revokes all active sessions, and triggers a password reset email. |
| **Preconditions** | Admin token; existing orders and invoices linked to target client. |
| **Input (Step 1)** | `POST /api/admin/clients` — `{ "email": "newclient@example.com", "name": "ACME Corp" }` |
| **Expected Output (Step 1)** | HTTP 201; client profile created; welcome email queued. |
| **Input (Step 2)** | `POST /api/admin/clients/77/deactivate` |
| **Expected Output (Step 2)** | HTTP 200; account deactivated; existing orders and invoices intact and accessible via admin APIs. |
| **Input (Step 3)** | `POST /api/admin/clients/77/revoke-sessions` |
| **Expected Output (Step 3)** | HTTP 200; all active sessions revoked; subsequent login with client token returns `SESSION_REVOKED`. |
| **Input (Step 4)** | `POST /api/admin/clients/77/reset-password` |
| **Expected Output (Step 4)** | HTTP 200; reset email queued; no new password value in API response. |
| **Type** | Positive |

---

### TC-SRV-01 — Server Registration, Maintenance Mode, and Provisioning Target Exclusion

| Field | Detail |
|---|---|
| **Test Case ID** | TC-SRV-01 |
| **Requirements Covered** | FR-SRV-01, FR-SRV-02, FR-SRV-05, FR-SRV-08, FR-SRV-09, FR-SRV-10 |
| **Description** | Register a server, assign it to a group as the default provisioning target, put it into maintenance mode, and verify it is excluded from automatic provisioning target resolution. |
| **Preconditions** | None. |
| **Input (Step 1)** | `POST /api/admin/servers` — `{ "hostname": "srv1.example.com", "type": "cyberpanel", "capacity": 100 }` |
| **Expected Output (Step 1)** | HTTP 201; server record created. |
| **Input (Step 2)** | `POST /api/admin/server-groups/1/servers` — `{ "serverId": 1 }`; then `POST /api/admin/server-groups/1/servers/1/set-default`. |
| **Expected Output (Step 2)** | HTTP 200 on both; server assigned and set as default provisioning target. |
| **Input (Step 3)** | `POST /api/admin/servers/1/maintenance` — `{ "enabled": true }` |
| **Expected Output (Step 3)** | HTTP 200; server marked as in maintenance; subsequent auto-provisioning job skips this server; if no other server available, job fails with `NO_AVAILABLE_SERVER`. |
| **Type** | Positive / Negative |

---

### TC-MFA-02 — Trusted Device MFA Skip

| Field | Detail |
|---|---|
| **Test Case ID** | TC-MFA-02 |
| **Requirements Covered** | FR-MFA-06 |
| **Description** | Complete a full MFA login with `trustDevice: true`, verify the device identifier is stored in the database, re-login from the same device and confirm MFA is skipped, then login from a different device ID and confirm the MFA challenge is still required. |
| **Preconditions** | MFA-enabled user account exists; TOTP authenticator app available. |
| **Input (Step 1)** | Complete MFA login with `POST /api/auth/mfa/verify` — `{ "code": "<valid_totp>", "trustDevice": true }` |
| **Expected Output (Step 1)** | HTTP 200; full `accessToken` and `refreshToken` issued; a device trust record created in DB linked to user account and a device fingerprint; device token returned as `HttpOnly` cookie. |
| **Input (Step 2)** | `POST /api/auth/login` with valid credentials from the same client sending the trusted device cookie/header. |
| **Expected Output (Step 2)** | HTTP 200; no `mfaRequired` flag in response; full tokens issued directly without TOTP challenge; device record matched in DB. |
| **Input (Step 3)** | `POST /api/auth/login` with valid credentials from a client with a different device identifier (no trusted device cookie, or different User-Agent fingerprint). |
| **Expected Output (Step 3)** | HTTP 200 with `mfaRequired: true`; no tokens issued yet; MFA challenge required as normal; trusted device from Step 1 is unaffected. |
| **Type** | Positive (Step 1–2) / Negative (Step 3) |

---

### TC-DOM-02 — Domain Transfer with EPP Code and Status Update

| Field | Detail |
|---|---|
| **Test Case ID** | TC-DOM-02 |
| **Requirements Covered** | FR-DOM-07, FR-DOM-08 |
| **Description** | Initiate a domain transfer using an EPP authorisation code, verify the transfer record is created in `pending` state and the registrar API is called. Simulate a registrar success response and verify the transfer becomes `active`. Simulate a registrar failure and verify the record is set to `failed` with an alert emitted. |
| **Preconditions** | Porkbun registrar configured; domain `transfer-test.com` registered at another registrar; valid EPP auth code available. |
| **Input (Step 1)** | `POST /api/domains/transfer` — `{ "domain": "transfer-test.com", "eppCode": "ABC-12345" }` |
| **Expected Output (Step 1)** | HTTP 201; transfer record created with `status: pending`; registrar API transfer request confirmed via application logs; no domain record created yet. |
| **Input (Step 2)** | Simulate registrar sending a success callback or polling endpoint returning `status: completed`. |
| **Expected Output (Step 2)** | Transfer record `status` updated to `active`; local domain record created or updated to reflect new ownership; no duplicate records. |
| **Input (Step 3)** | Simulate registrar returning a failure response (e.g., invalid EPP code rejection). |
| **Expected Output (Step 3)** | Transfer record `status` set to `failed`; local domain record not created or altered; a structured alert event emitted; no ambiguous intermediate state. |
| **Type** | Positive (Step 1–2) / Negative (Step 3) |

---

### TC-WF-02 — Workflow Soft Delete, Execution Gate, and Restore

| Field | Detail |
|---|---|
| **Test Case ID** | TC-WF-02 |
| **Requirements Covered** | FR-WF-03, FR-WF-04 |
| **Description** | Soft delete a workflow definition, confirm it disappears from listings and cannot be executed, use the stateless validation endpoint to verify a step structure without persisting it, then restore the workflow and confirm full functionality resumes. |
| **Preconditions** | Workflow ID 10 exists in `active` state with at least one step. |
| **Input (Step 1)** | `DELETE /api/workflows/10` (soft delete). |
| **Expected Output (Step 1)** | HTTP 200; workflow marked as deleted; `GET /api/workflows` no longer includes workflow 10 in results; `GET /api/workflows/10` returns HTTP 404 or `WORKFLOW_DELETED`. |
| **Input (Step 2)** | `POST /api/workflows/10/execute` on the deleted workflow. |
| **Expected Output (Step 2)** | HTTP 404 or HTTP 409; error `WORKFLOW_DELETED`; no execution record created; no job enqueued. |
| **Input (Step 3)** | `POST /api/workflows/validate` — `{ "steps": [ { "id": "s1", "type": "http", "config": { "url": "https://example.com" } } ] }` |
| **Expected Output (Step 3)** | HTTP 200; validation result returned with `valid: true` and no errors; no workflow record created or modified in DB; endpoint is stateless. |
| **Input (Step 4)** | `POST /api/workflows/10/restore`. |
| **Expected Output (Step 4)** | HTTP 200; workflow reappears in `GET /api/workflows` list; `POST /api/workflows/10/execute` now succeeds with HTTP 202. |
| **Type** | Positive / Negative |

---

### TC-SVC-02 — Bulk Service Operations and Import/Export

| Field | Detail |
|---|---|
| **Test Case ID** | TC-SVC-02 |
| **Requirements Covered** | FR-SVC-05, FR-SVC-06 |
| **Description** | Perform bulk status update on multiple services, attempt a bulk delete where one service has active orders (expect partial rejection), export the service catalog, and import it back confirming recreated records. |
| **Preconditions** | Services with IDs 10, 11, 12 exist; service 11 has one active order; admin token available. |
| **Input (Step 1)** | `POST /api/admin/services/bulk-status` — `{ "ids": [10, 11, 12], "status": "inactive" }` |
| **Expected Output (Step 1)** | HTTP 200; all three services set to `inactive` status; no active order validation blocks a status change (only deletion is blocked). |
| **Input (Step 2)** | `POST /api/admin/services/bulk-delete` — `{ "ids": [10, 11, 12] }` |
| **Expected Output (Step 2)** | HTTP 409; `SERVICE_HAS_ACTIVE_ORDERS`; response body identifies service ID 11 as the blocking record; no services deleted — operation is atomic. |
| **Input (Step 3)** | `GET /api/admin/services/export` |
| **Expected Output (Step 3)** | HTTP 200; portable format (JSON or CSV) returned containing all service catalog definitions; file is self-contained and importable. |
| **Input (Step 4)** | `POST /api/admin/services/import` with the exported payload from Step 3. |
| **Expected Output (Step 4)** | HTTP 201; services recreated without duplication; existing records with matching identifiers are either updated or skipped with a conflict report. |
| **Type** | Positive / Negative |

---

### TC-MKT-01 — Marketplace Catalog, Review Submission, and Admin Moderation

| Field | Detail |
|---|---|
| **Test Case ID** | TC-MKT-01 |
| **Requirements Covered** | FR-MKT-01, FR-MKT-02, FR-MKT-03, FR-MKT-04, FR-MKT-05, FR-MKT-06, FR-MKT-07 |
| **Description** | Retrieve the public marketplace catalog with filters, view a plugin by slug, submit a rating and review, resubmit to confirm deduplication, verify rankings update, and have an admin delete a violating review. |
| **Preconditions** | At least 3 approved plugins in the marketplace; authenticated client and admin tokens available. |
| **Input (Step 1)** | `GET /api/marketplace/plugins?category=security&pricingModel=free` (public endpoint, no auth) |
| **Expected Output (Step 1)** | HTTP 200; only approved plugins in `security` category with `free` pricing returned; draft or pending plugins absent. |
| **Input (Step 2)** | `GET /api/marketplace/plugins/my-security-plugin` (by slug) |
| **Expected Output (Step 2)** | HTTP 200; full plugin details including version history, media assets, and pricing information returned. |
| **Input (Step 3)** | `POST /api/marketplace/plugins/<id>/reviews` — `{ "rating": 5, "review": "Excellent plugin" }` (authenticated client) |
| **Expected Output (Step 3)** | HTTP 201; review record created; plugin average rating updated. |
| **Input (Step 4)** | Same endpoint with same user — `{ "rating": 2, "review": "Changed my mind" }` |
| **Expected Output (Step 4)** | HTTP 200; existing review record updated (not duplicated); exactly one review per user per plugin confirmed in DB; average rating recalculated. |
| **Input (Step 5)** | `GET /api/marketplace/plugins/rankings/installs` and `GET /api/marketplace/plugins/rankings/rating` |
| **Expected Output (Step 5)** | HTTP 200 on both; sorted lists returned by respective metric; no authentication required. |
| **Input (Step 6)** | `DELETE /api/admin/marketplace/reviews/<review_id>` using admin token. |
| **Expected Output (Step 6)** | HTTP 200; review deleted; average rating for the plugin recalculated; non-admin token returns HTTP 403. |
| **Type** | Positive / Negative |

---

### TC-BAK-02 — Backup Retention Policy, Analytics, and Time-Series Data

| Field | Detail |
|---|---|
| **Test Case ID** | TC-BAK-02 |
| **Requirements Covered** | FR-BAK-11, FR-BAK-12, FR-BAK-13 |
| **Description** | Configure a retention policy on a storage config, create backup records that exceed the retention threshold, verify automatic cleanup removes old records, and retrieve aggregated and time-series analytics. |
| **Preconditions** | Storage config exists; several completed backup records at varying ages. |
| **Input (Step 1)** | `PATCH /api/admin/backup/storage/1` — `{ "retentionDays": 7, "retentionCount": 5 }` |
| **Expected Output (Step 1)** | HTTP 200; retention policy saved on storage config record. |
| **Input (Step 2)** | After retention policy runs (via manual trigger or scheduler): check backup records older than 7 days or beyond count 5. |
| **Expected Output (Step 2)** | Backup records exceeding the age or count threshold are removed; records within the threshold remain intact; no in-progress or failed backups are incorrectly removed. |
| **Input (Step 3)** | `GET /api/admin/backup/stats` |
| **Expected Output (Step 3)** | HTTP 200; response contains `totalBackups`, `totalStorageBytes`, `successRate`, `failureRate`; values are aggregated across all storage configs. |
| **Input (Step 4)** | `GET /api/admin/backup/analytics?from=2026-01-01&to=2026-04-30` |
| **Expected Output (Step 4)** | HTTP 200; time-series data returned showing backup size and frequency per time bucket within the date range; suitable for charting; no individual credentials or sensitive config data exposed. |
| **Type** | Positive |

---

## 3.3 Requirement Traceability Matrix (RTM)

| Requirement ID | Description (abbreviated) | Test Case(s) | Status |
|---|---|---|---|
| FR-AUTH-01 | User registration endpoint | TC-AUTH-01 | Covered |
| FR-AUTH-02 | Duplicate email rejection | TC-AUTH-01 | Covered |
| FR-AUTH-03 | Default role assignment | TC-AUTH-01 | Covered |
| FR-AUTH-04 | Email verification token generation | TC-AUTH-01 | Covered |
| FR-AUTH-05 | Background email delivery | TC-AUTH-01 | Covered |
| FR-AUTH-10 | Login credential validation | TC-AUTH-02, TC-AUTH-03 | Covered |
| FR-AUTH-11 | JWT + refresh token issuance | TC-AUTH-02, TC-SEC-01 | Covered |
| FR-AUTH-12 | Refresh token session storage | TC-AUTH-02, TC-AUTH-04 | Covered |
| FR-AUTH-13 | Multiple sessions per user | TC-AUTH-02 | Covered |
| FR-AUTH-14 | IP + User-Agent recording | TC-AUTH-02 | Covered |
| FR-AUTH-15 | Session revocation on logout | TC-AUTH-04 | Covered |
| FR-AUTH-16 | Bulk session revocation | TC-AUTH-04, TC-CLI-01 | Covered |
| FR-AUTH-17 | Current user identity endpoint | TC-RBAC-01, TC-SEC-01 | Covered |
| FR-PASS-01–07 | Full password reset flow | TC-AUTH-05 | Covered |
| FR-MFA-01–05 | MFA enrolment and verification | TC-AUTH-06 | Covered |
| FR-IMP-01–08 | Impersonation session lifecycle | TC-AUTH-07 | Covered |
| FR-API-01–06 | API key management | TC-RBAC-02 | Covered |
| FR-RBAC-01–05 | Role and permission enforcement | TC-RBAC-01 | Covered |
| FR-IP-01–04 | IP access control | TC-IP-01 | Covered |
| FR-AUDIT-01–05 | Audit logging | TC-AUTH-03, TC-AUTH-05, TC-AUTH-07 | Covered |
| FR-WEBHOOK-01–05 | Webhook delivery and retry | TC-SEC-02 | Covered |
| FR-ORD-01–03 | Order creation and invoice generation | TC-ORD-01 | Covered |
| FR-ORD-07, FR-ORD-09 | Order cancellation and event emission | TC-ORD-02 | Covered |
| FR-ORD-10 | order.paid event trigger | TC-PRV-01 | Covered |
| FR-ORD-11–12 | Admin order management | TC-ORD-03 | Covered |
| FR-PRV-05–06 | Admin provisioning and failure handling | TC-PRV-01 | Covered |
| FR-PRV-01–02, FR-PRV-11 | Client provisioning access scoping | TC-PRV-02 | Covered |
| FR-PRV-07 | Account suspension and restoration | TC-PRV-03 | Covered |
| FR-PRV-10 | Automated provisioning on order.paid | TC-PRV-01 | Covered |
| FR-BAK-01–09 | Backup storage, jobs, and download URL | TC-BAK-01 | Covered |
| FR-DOM-04, FR-DOM-06, FR-DOM-03 | Domain registration flow | TC-DOM-01 | Covered |
| FR-PLG-01, FR-PLG-02, FR-PLG-04, FR-PLG-10 | Plugin submission and install | TC-PLG-01 | Covered |
| FR-AUTO-01–03, FR-AUTO-06–07 | Automation scheduling and execution | TC-AUTO-01 | Covered |
| FR-WF-01, FR-WF-05–08, FR-WF-11–12 | Workflow execution and webhook trigger | TC-WF-01 | Covered |
| FR-CLI-01, FR-CLI-06–08, FR-CLI-12 | Client lifecycle management | TC-CLI-01 | Covered |
| FR-SRV-01, FR-SRV-05, FR-SRV-08–10 | Server registration and maintenance | TC-SRV-01 | Covered |
| FR-MFA-06 | Trusted device MFA skip | TC-MFA-02 | Covered |
| FR-DOM-07–08 | Domain transfer and EPP code | TC-DOM-02 | Covered |
| FR-WF-03–04 | Soft delete and validation endpoint | TC-WF-02, ITC-15 | Covered |
| FR-SVC-05–06 | Bulk service operations and import/export | TC-SVC-02 | Covered |
| FR-MKT-01–07 | Marketplace catalog, reviews, rankings, moderation | TC-MKT-01, BT-11 | Covered |
| FR-BAK-11–13 | Backup retention, aggregated stats, time-series analytics | TC-BAK-02 | Covered |
| FR-AUTO-16 | Plugin-defined custom automation action handlers | — | **Not Covered** |

---

## 3.4 Validation Explanation

Requirement-based testing was conducted by mapping functional requirements directly to API call sequences that simulate realistic user and administrator workflows. Rather than testing each requirement in isolation, requirements were grouped into end-to-end flows — for example, the password reset test (TC-AUTH-05) exercises seven requirements across a single five-step scenario. Negative tests were designed to probe boundary conditions, such as missing required fields (TC-AUTH-07 Step 3) and referential integrity constraints (TC-BAK-01 Step 4). Security requirements were treated as first-class functional requirements rather than afterthoughts, with dedicated test cases for signature validation, token tampering, and access scope enforcement. All test cases reference specific HTTP status codes and response body fields to enable deterministic pass/fail evaluation without relying on manual inspection.

---
---

# CHAPTER 5 — IMPLEMENTATION TESTING

## 5.1 Overview

This chapter documents implementation-level testing applied during development, focusing on API behaviour validation, token handling correctness, error response structure, and edge case coverage. Testing was performed using Postman collections with environment variables for token management, supplemented by application logs and database state inspection. The chapter applies formal test design techniques including Boundary Value Analysis (BVA) and Equivalence Class Partitioning (ECP) to systematically derive test inputs for critical input domains.

## 5.2 Tools and Environment

| Tool | Purpose |
|---|---|
| **Postman** | API request execution, collection runner, environment variable management |
| **Postman Pre-request Scripts** | Dynamic JWT injection and timestamp generation |
| **Application Logs (Winston)** | Verification of background job execution and audit entries |
| **PostgreSQL Direct Queries** | Database state verification post-API call |
| **JWT Debugger (jwt.io)** | Token payload and signature inspection |
| **Node.js Test Runner** | Integration test suite for service-layer logic |

---

## 5.3 Boundary Value Analysis (BVA) — Password Field

The password field is subject to length and complexity constraints. BVA is applied at the minimum and maximum length boundaries.

| Boundary | Input Length | Input Value | Expected Result |
|---|---|---|---|
| Below minimum | 7 chars | `Abc123!` | HTTP 422 — `PASSWORD_TOO_SHORT` |
| At minimum | 8 chars | `Abc1234!` | HTTP 201 — accepted |
| Nominal | 16 chars | `SecureP@ss12345!` | HTTP 201 — accepted |
| At maximum | 72 chars | 72-character valid string | HTTP 201 — accepted |
| Above maximum | 73 chars | 73-character string | HTTP 422 — `PASSWORD_TOO_LONG` |

## 5.4 Equivalence Class Partitioning (ECP) — Email Input

ECP divides the email input domain into valid and invalid equivalence classes.

| Class | Example Input | Expected Result |
|---|---|---|
| Valid email | `user@domain.com` | Accepted |
| Missing @ symbol | `userdomain.com` | HTTP 422 validation error |
| Missing domain | `user@` | HTTP 422 validation error |
| Empty string | `""` | HTTP 422 — `EMAIL_REQUIRED` |
| Already registered | `existing@domain.com` | HTTP 409 — `EMAIL_ALREADY_EXISTS` |
| Excessively long (>254 chars) | 255-char email | HTTP 422 — `EMAIL_TOO_LONG` |
| SQL injection attempt | `a'--@b.com` | HTTP 422 or sanitised; no DB error |

---

## 5.5 Implementation Test Cases

### ITC-01 — Access Token Expiry Boundary

| Field | Detail |
|---|---|
| **Test ID** | ITC-01 |
| **Technique** | BVA (time boundary) |
| **Description** | Issue an access token, wait until 1 second before expiry, make a successful request; wait until 1 second after expiry, confirm rejection. |
| **Tool** | Postman with `pm.environment.set` for token manipulation; Node.js `jsonwebtoken` with custom `exp` for test tokens. |
| **Input** | `GET /api/auth/me` with token 1s before expiry vs 1s after expiry. |
| **Expected Output** | Before: HTTP 200. After: HTTP 401 `TOKEN_EXPIRED`. |
| **Type** | BVA |

---

### ITC-02 — Refresh Token Reuse After Rotation

| Field | Detail |
|---|---|
| **Test ID** | ITC-02 |
| **Technique** | Negative / security |
| **Description** | Use a refresh token to obtain a new access token. Attempt to reuse the same refresh token a second time. |
| **Tool** | Postman sequential requests. |
| **Input** | `POST /api/auth/refresh` with the same `refreshToken` twice. |
| **Expected Output** | First call: HTTP 200, new tokens issued. Second call: HTTP 401 `REFRESH_TOKEN_ALREADY_USED` or `SESSION_NOT_FOUND`. |
| **Type** | Negative |

---

### ITC-03 — Malformed JSON Request Body

| Field | Detail |
|---|---|
| **Test ID** | ITC-03 |
| **Technique** | ECP (invalid input class) |
| **Description** | Send a request to `POST /api/auth/register` with a syntactically invalid JSON body. |
| **Tool** | Postman raw body with intentional malformed JSON `{ "email": "a@b.com", `. |
| **Input** | Malformed JSON string. |
| **Expected Output** | HTTP 400; `INVALID_JSON`; no stack trace or internal error detail exposed in response. |
| **Type** | Negative |

---

### ITC-04 — Cron Expression Validation at Profile Creation

| Field | Detail |
|---|---|
| **Test ID** | ITC-04 |
| **Technique** | ECP |
| **Description** | Submit automation profiles with valid, invalid, and dangerously frequent cron expressions. |
| **Tool** | Postman collection runner. |
| **Input A** | `"cronExpression": "0 2 * * *"` (valid nightly) |
| **Expected A** | HTTP 201 — accepted. |
| **Input B** | `"cronExpression": "not-a-cron"` |
| **Expected B** | HTTP 422 — `INVALID_CRON_EXPRESSION`. |
| **Input C** | `"cronExpression": "* * * * * *"` (every second — 6 fields) |
| **Expected C** | HTTP 422 or HTTP 201 depending on whether sub-minute scheduling is supported; must not crash the scheduler. |
| **Type** | ECP |

---

### ITC-05 — Pagination Boundary Values on Order List

| Field | Detail |
|---|---|
| **Test ID** | ITC-05 |
| **Technique** | BVA |
| **Description** | Query the admin order list with `limit=0`, `limit=1`, `limit=100` (valid max), and `limit=101` (over max). |
| **Tool** | Postman. |
| **Input** | `GET /api/admin/orders?limit=<value>` |
| **Expected** | `limit=0`: HTTP 422 `INVALID_LIMIT`. `limit=1`: returns 1 record. `limit=100`: returns up to 100 records. `limit=101`: HTTP 422 or clamped to 100. |
| **Type** | BVA |

---

### ITC-06 — Missing Authorization Header

| Field | Detail |
|---|---|
| **Test ID** | ITC-06 |
| **Technique** | ECP (missing auth class) |
| **Description** | Call every protected endpoint category without an `Authorization` header and confirm consistent 401 responses. |
| **Tool** | Postman; tested against `/api/admin/*`, `/api/client/*`, and `/api/auth/me`. |
| **Input** | HTTP requests with no `Authorization` header. |
| **Expected Output** | HTTP 401 `AUTHENTICATION_REQUIRED` on all protected routes; no route accidentally bypasses auth middleware. |
| **Type** | Negative |

---

### ITC-07 — Concurrent Order Creation for the Same Plan

| Field | Detail |
|---|---|
| **Test ID** | ITC-07 |
| **Technique** | Edge case / race condition |
| **Description** | Submit two concurrent `POST /api/client/orders` requests for the same limited-availability plan simultaneously using Postman Runner with two parallel iterations. |
| **Tool** | Postman Collection Runner with 2 concurrent workers. |
| **Input** | Two simultaneous `POST /api/client/orders` for plan with `maxOrders: 1`. |
| **Expected Output** | Exactly one order created; second request returns HTTP 409 or HTTP 412; no duplicate invoices; no orphaned records. |
| **Type** | Edge case |

---

### ITC-08 — Plugin ZIP with Missing manifest.json

| Field | Detail |
|---|---|
| **Test ID** | ITC-08 |
| **Technique** | ECP (invalid package class) |
| **Description** | Submit a valid ZIP archive that is missing the required `manifest.json` at the root level. |
| **Tool** | Postman multipart form upload. |
| **Input** | ZIP file containing only `index.js` — no `manifest.json`. |
| **Expected Output** | HTTP 422; `MANIFEST_NOT_FOUND`; no partial plugin record created; no ZIP extracted to disk. |
| **Type** | Negative |

---

### ITC-09 — Backup Storage Connectivity Test Does Not Persist Changes

| Field | Detail |
|---|---|
| **Test ID** | ITC-09 |
| **Technique** | Negative / state isolation |
| **Description** | Call the backup storage connectivity test endpoint with invalid S3 credentials and verify the existing config record is not modified and no new record is created. |
| **Tool** | Postman + PostgreSQL query. |
| **Input** | `POST /api/admin/backup/storage/1/test` with wrong credentials injected in body. |
| **Expected Output** | HTTP 200 with `{ "success": false, "error": "AuthorizationFailed" }`; DB record for storage config 1 unchanged. |
| **Type** | Negative |

---

### ITC-10 — Service Plan Deletion Blocked by Active Orders

| Field | Detail |
|---|---|
| **Test ID** | ITC-10 |
| **Technique** | Constraint validation |
| **Description** | Attempt to delete a service with active orders referencing it. Verify the API returns a structured conflict error identifying the dependency. |
| **Tool** | Postman. |
| **Input** | `DELETE /api/admin/services/5` where service 5 has 3 active orders. |
| **Expected Output** | HTTP 409; `SERVICE_HAS_ACTIVE_ORDERS`; response body includes count or IDs of blocking orders; no deletion performed. |
| **Type** | Negative |

---

### ITC-11 — TOTP Code Replay Attack Prevention

| Field | Detail |
|---|---|
| **Test ID** | ITC-11 |
| **Technique** | Security — replay attack |
| **Description** | Complete MFA verification with a valid TOTP code, then immediately submit the same TOTP code again within the same 30-second window. |
| **Tool** | Postman with manual TOTP generation. |
| **Input** | Same valid TOTP code submitted twice within 30 seconds. |
| **Expected Output** | First: HTTP 200, tokens issued. Second: HTTP 401 `TOTP_CODE_ALREADY_USED`; system must track used codes within the time window. |
| **Type** | Security / Negative |

---

### ITC-12 — Large File Upload Rejection on Plugin Endpoint

| Field | Detail |
|---|---|
| **Test ID** | ITC-12 |
| **Technique** | BVA (file size boundary) |
| **Description** | Upload a plugin ZIP at the configured maximum size, then 1 byte over the maximum. |
| **Tool** | Postman with generated binary files. |
| **Input A** | ZIP exactly at `MAX_UPLOAD_SIZE` (e.g., 50MB). |
| **Expected A** | HTTP 201 or 202 — accepted. |
| **Input B** | ZIP at `MAX_UPLOAD_SIZE + 1 byte`. |
| **Expected B** | HTTP 413 `PAYLOAD_TOO_LARGE`; no partial file saved to disk. |
| **Type** | BVA |

---

### ITC-13 — DNS Record Update Propagation to Registrar

| Field | Detail |
|---|---|
| **Test ID** | ITC-13 |
| **Technique** | Integration / state synchronisation |
| **Description** | Create a DNS A record, verify it is sent to the registrar API, update it, and confirm the local record reflects the registrar-confirmed response — not just the submitted value. |
| **Tool** | Postman + application logs to verify registrar API call. |
| **Input** | `POST /api/admin/domains/1/dns` — `{ "type": "A", "name": "@", "value": "1.2.3.4" }` then `PUT` to update value. |
| **Expected Output** | Local DNS record stores registrar-confirmed value after each operation; if registrar returns a different TTL than submitted, the registrar value is stored. |
| **Type** | Positive / state verification |

---

### ITC-14 — Error Response Format Consistency

| Field | Detail |
|---|---|
| **Test ID** | ITC-14 |
| **Technique** | Cross-cutting / structural |
| **Description** | Trigger HTTP 400, 401, 403, 404, 409, and 422 errors across different modules and verify all error responses conform to the platform's standard error schema. |
| **Tool** | Postman with schema assertion in test scripts using `pm.response.to.have.jsonSchema()`. |
| **Expected Schema** | `{ "error": string, "message": string, "statusCode": number }` — no raw stack traces, no `undefined` values. |
| **Expected Output** | All error responses pass schema assertion; no endpoint returns a bare `Internal Server Error` string without error code. |
| **Type** | Cross-cutting / negative |

---

### ITC-15 — Workflow Soft Delete and Restore

| Field | Detail |
|---|---|
| **Test ID** | ITC-15 |
| **Technique** | State lifecycle |
| **Description** | Soft delete a workflow definition, verify it does not appear in the standard list endpoint, restore it, and confirm it reappears. Attempt to execute a soft-deleted workflow. |
| **Tool** | Postman sequential requests. |
| **Input** | `DELETE /api/workflows/10`; then `GET /api/workflows`; then `POST /api/workflows/10/restore`; then `POST /api/workflows/10/execute`. |
| **Expected Output** | After delete: workflow absent from list; execute returns HTTP 404 or `WORKFLOW_DELETED`. After restore: workflow in list; execute succeeds. |
| **Type** | Positive / Negative |

---

### ITC-16 — order.paid Event Idempotency

| Field | Detail |
|---|---|
| **Test ID** | ITC-16 |
| **Technique** | Edge case / event-driven safety |
| **Description** | Emit the `order.paid` event twice for the same order in rapid succession, simulating a duplicate delivery from the event bus. Verify that exactly one hosting account is created, exactly one provisioning job runs, and the second event is detected as a duplicate and discarded or made a no-op. |
| **Tool** | Application logs + PostgreSQL direct query to count `hosting_accounts` records after both events fire. |
| **Input** | Two sequential `POST /api/admin/invoices/55/confirm-payment` calls, or direct event bus injection of `order.paid` twice for the same order ID within 2 seconds. |
| **Expected Output** | Exactly one `hosting_account` record exists for order 55 after both events are processed; second job either does not start or exits immediately with an `already_provisioned` log entry; no duplicate invoice created; DB query `SELECT COUNT(*) FROM hosting_accounts WHERE order_id = 55` returns `1`. |
| **Type** | Edge case / Negative |

---

### ITC-17 — Marketplace Plugin Rankings and Statistics Correctness

| Field | Detail |
|---|---|
| **Test ID** | ITC-17 |
| **Technique** | State verification / integration |
| **Description** | Install a plugin three times across different test accounts, submit two reviews with known ratings, then verify the rankings and statistics endpoints return values consistent with the seeded data. |
| **Tool** | Postman + PostgreSQL direct query for cross-verification. |
| **Input (Step 1)** | Seed: 3 installs for plugin A, 1 install for plugin B. Submit reviews: plugin A rating 4 and 2 (avg 3.0); plugin B rating 5. |
| **Input (Step 2)** | `GET /api/marketplace/plugins/rankings/installs` |
| **Expected Output (Step 2)** | Plugin A ranked first (3 installs); plugin B second (1 install). |
| **Input (Step 3)** | `GET /api/marketplace/plugins/rankings/rating` |
| **Expected Output (Step 3)** | Plugin B ranked first (avg 5.0); plugin A second (avg 3.0). |
| **Input (Step 4)** | `GET /api/marketplace/plugins/<pluginA_id>/stats` |
| **Expected Output (Step 4)** | `{ "totalInstalls": 3, "averageRating": 3.0, "reviewCount": 2 }` — values match seeded data exactly; no stale cache values. |
| **Type** | Positive / state verification |

---
---

# CHAPTER 6 — TESTING AND EVALUATION

## 6.1 Functional Testing (Black Box)

Black box testing evaluates the system exclusively through its external API interfaces, without access to internal source code logic. Test cases are derived from the FRS and cover full end-to-end user and operator workflows.

### 6.1.1 End-to-End Test Cases

---

### BT-01 — Full User Onboarding Flow

| Field | Detail |
|---|---|
| **Test ID** | BT-01 |
| **Flow** | Register → Verify Email → Login → Access Protected Resource |
| **Steps** | (1) Register user. (2) Confirm email via token from email service. (3) Login; receive JWT. (4) Call `GET /api/auth/me`. |
| **Expected** | All steps succeed in sequence; `GET /api/auth/me` returns correct user data and assigned role. Attempting step (4) before step (2) is completed returns `EMAIL_NOT_VERIFIED`. |
| **Type** | Positive / Negative |

---

### BT-02 — Order-to-Provisioning Happy Path

| Field | Detail |
|---|---|
| **Test ID** | BT-02 |
| **Flow** | Client places order → Invoice generated → Admin marks paid → Auto provisioning triggers → Hosting account active |
| **Steps** | (1) `POST /api/client/orders`. (2) Admin `POST /api/admin/invoices/<id>/confirm-payment`. (3) Poll `GET /api/admin/hosting` until account appears. |
| **Expected** | Hosting account in `active` status after provisioning completes; order status updated accordingly; no manual admin trigger needed for provisioning. |
| **Type** | Positive |

---

### BT-03 — Admin Impersonates Client to Place an Order

| Field | Detail |
|---|---|
| **Test ID** | BT-03 |
| **Flow** | Admin starts impersonation → Places order as client → Ends impersonation → Audit records show admin identity |
| **Steps** | (1) `POST /api/admin/impersonation/start`. (2) `POST /api/client/orders` with impersonation token. (3) `POST /api/admin/impersonation/end`. (4) Retrieve audit logs. |
| **Expected** | Order created under client account; audit log contains `impersonatedBy: admin_id`; impersonation end timestamp recorded. |
| **Type** | Positive |

---

### BT-04 — Plugin Purchase and Paid Plugin Install Gate

| Field | Detail |
|---|---|
| **Test ID** | BT-04 |
| **Flow** | Client attempts to install paid plugin without purchase → Purchases it → Installs successfully |
| **Steps** | (1) `POST /api/plugins/<id>/install` — no purchase record. (2) `POST /api/marketplace/plugins/<id>/purchase`. (3) Retry install. |
| **Expected** | Step 1: HTTP 402 or 403 `PURCHASE_REQUIRED`. Step 3: HTTP 200, plugin installed. |
| **Type** | Positive / Negative |

---

### BT-05 — Domain Registration with DNS Record Creation

| Field | Detail |
|---|---|
| **Test ID** | BT-05 |
| **Flow** | Check availability → Register domain → Create DNS records |
| **Steps** | (1) `GET /api/domains/check`. (2) `POST /api/domains/register`. (3) `POST /api/admin/domains/<id>/dns` — A record. |
| **Expected** | All steps succeed; DNS record stored locally and confirmed at registrar. |
| **Type** | Positive |

---

### BT-06 — Workflow Triggered by Automation Event

| Field | Detail |
|---|---|
| **Test ID** | BT-06 |
| **Flow** | Register automation trigger rule → Cancel an order → order.cancelled event fires → Workflow executes |
| **Steps** | (1) Create workflow triggered on `order.cancelled`. (2) Client cancels an order. (3) Check workflow execution history. |
| **Expected** | Workflow run record shows `status: completed`; step outputs confirm event payload was received as input. |
| **Type** | Positive |

---

### BT-07 — Backup Full Lifecycle: Create, Execute, Restore

| Field | Detail |
|---|---|
| **Test ID** | BT-07 |
| **Flow** | Configure S3 storage → Trigger backup → Download URL → Initiate restore |
| **Steps** | (1) `POST /api/admin/backup/storage` (S3 config). (2) `POST /api/admin/backup/jobs` (type: full). (3) Poll job status. (4) `POST /api/admin/backup/jobs/<id>/download-url`. (5) `POST /api/admin/backup/jobs/<id>/restore`. |
| **Expected** | Each step succeeds; restore job starts in background; restore status endpoint returns progress. |
| **Type** | Positive |

---

### BT-08 — RBAC: Developer Cannot Access Admin Endpoints

| Field | Detail |
|---|---|
| **Test ID** | BT-08 |
| **Flow** | Developer authenticates → Attempts admin client list → Attempts to approve own plugin |
| **Steps** | (1) Login with developer credentials. (2) `GET /api/admin/clients`. (3) `POST /api/admin/plugins/<id>/versions/<vId>/approve`. |
| **Expected** | Both admin calls return HTTP 403 `INSUFFICIENT_PERMISSIONS`; developer can only access their own plugin management endpoints. |
| **Type** | Negative |

---

### BT-09 — MFA Trusted Device Flow

| Field | Detail |
|---|---|
| **Test ID** | BT-09 |
| **Flow** | MFA-enabled login → Mark device trusted → Re-login skips MFA |
| **Steps** | (1) Complete MFA login; submit `{ "trustDevice": true }`. (2) Re-login from same device ID. |
| **Expected** | Step 1: device ID stored. Step 2: login completes without MFA challenge. Different device ID still requires MFA. |
| **Type** | Positive |

---

### BT-10 — Server in Maintenance Blocks Auto-Provisioning

| Field | Detail |
|---|---|
| **Test ID** | BT-10 |
| **Flow** | Put only available server in maintenance → Trigger order.paid → Provisioning fails gracefully |
| **Steps** | (1) Set server 1 to maintenance mode. (2) Confirm payment on order. |
| **Expected** | Provisioning job emits `NO_AVAILABLE_SERVER` alert; order set to `provisioning_failed`; no ambiguous intermediate state. |
| **Type** | Negative |

---

### BT-11 — Marketplace Review Deduplication

| Field | Detail |
|---|---|
| **Test ID** | BT-11 |
| **Flow** | User submits review → Submits second review for same plugin → Record updated, not duplicated |
| **Steps** | (1) `POST /api/marketplace/plugins/<id>/reviews` — rating 5. (2) Same endpoint — rating 3. |
| **Expected** | DB contains exactly one review per user per plugin; second submission updates the existing record; plugin average rating recalculated. |
| **Type** | Positive |

---

### BT-12 — Provisioning Batch Sync Does Not Overwrite Correct Data

| Field | Detail |
|---|---|
| **Test ID** | BT-12 |
| **Flow** | Start batch sync → Verify correct accounts unchanged → Modified accounts updated |
| **Steps** | (1) `POST /api/admin/hosting/sync-all`. (2) Check accounts that had no changes in the control panel. |
| **Expected** | Accounts with unchanged data remain identical; only accounts with divergent server-side data are updated; no data is incorrectly overwritten. |
| **Type** | Positive |

---

### BT-13 — API Key Rate Limiting and Audit on High-Frequency Use

| Field | Detail |
|---|---|
| **Test ID** | BT-13 |
| **Flow** | Use API key to make rapid successive requests |
| **Steps** | (1) Make 100 requests/min with an API key. (2) Check audit log for usage records. |
| **Expected** | Each request logged; if rate limiting is implemented, HTTP 429 returned after threshold; no auth bypass possible under high load. |
| **Type** | Positive / Security |

---

### BT-14 — Provisioning Worker Fault Isolation

| Field | Detail |
|---|---|
| **Test ID** | BT-14 |
| **Flow** | Enqueue two provisioning jobs; first job's control panel call hangs → Second job processes independently |
| **Steps** | (1) Create two orders and confirm both payments. (2) Artificially delay first job's control panel response. |
| **Expected** | Second job completes successfully while first job is still running; worker model isolates faults; no cross-contamination of job state. |
| **Type** | Positive |

---

### BT-15 — Soft-Deleted Service Not Visible in Client Catalog

| Field | Detail |
|---|---|
| **Test ID** | BT-15 |
| **Flow** | Deactivate a service → Client catalog no longer shows it → Existing orders referencing it are unaffected |
| **Steps** | (1) `PATCH /api/admin/services/3/status` — `{ "status": "inactive" }`. (2) `GET /api/client/catalog`. (3) `GET /api/client/orders?serviceId=3`. |
| **Expected** | Deactivated service absent from client catalog; existing orders with that service still accessible and intact. |
| **Type** | Positive |

---

### BT-16 — Full Plugin Developer Lifecycle: Submit, Reject, Revise, Approve, Publish

| Field | Detail |
|---|---|
| **Test ID** | BT-16 |
| **Flow** | Developer submits plugin → Admin rejects with reason → Developer submits revised version → Admin approves → Plugin visible in marketplace |
| **Steps** | (1) `POST /api/developer/plugins` — valid ZIP. (2) `POST /api/admin/plugins/<id>/versions/<v1>/reject` — `{ "reason": "Missing license file" }`. (3) Verify developer receives rejection notification. (4) `POST /api/developer/plugins/<id>/versions` — revised ZIP. (5) `POST /api/admin/plugins/<id>/versions/<v2>/approve`. (6) `GET /api/marketplace/plugins?category=...`. |
| **Expected** | Step 2: v1 status `rejected`; developer notified. Step 4: new version v2 created in `draft`. Step 5: v2 `approved`; plugin appears in public marketplace catalog. Step 6: plugin discoverable by unauthenticated users. |
| **Type** | Positive |

---

### BT-17 — Client Portal Spending Summary and Order History

| Field | Detail |
|---|---|
| **Test ID** | BT-17 |
| **Flow** | Client places multiple orders → Retrieves spending summary → Retrieves paginated order history |
| **Steps** | (1) Create 3 orders with known invoice totals. (2) `GET /api/client/spending`. (3) `GET /api/client/orders?limit=2&page=1`; then `?limit=2&page=2`. |
| **Expected** | Step 2: `lifetimeTotal` and `currentPeriodTotal` match sum of confirmed invoices; no other client's data included. Step 3: pagination returns correct subsets; total count matches 3; cursor or page-based navigation functions correctly. |
| **Type** | Positive |

---

## 6.2 Non-Functional Testing

### 6.2.1 Performance Testing

Performance testing was conducted in two phases: single-request baseline measurements using Postman, and a concurrent load test using a k6 script targeting the highest-traffic endpoints.

**Phase 1 — Single-Request Baselines (zero concurrent load):**

| Endpoint Category | Target Response Time | Actual (Observed) | Notes |
|---|---|---|---|
| `POST /api/auth/login` | < 300ms | ~180ms | Bcrypt hashing is the primary cost |
| `GET /api/auth/me` | < 100ms | ~40ms | DB read + JWT decode only |
| `POST /api/client/orders` | < 500ms | ~320ms | Invoice creation within same transaction |
| `POST /api/admin/backup/jobs` | < 200ms | ~90ms | Async; queue enqueue only |
| `POST /api/plugins/<id>/install` (sync) | < 3000ms | ~1400ms | ZIP extraction + DB writes |
| `GET /api/admin/clients?limit=100` | < 400ms | ~210ms | Paginated DB query |
| `POST /api/workflows/<id>/execute` | < 200ms | ~80ms | Async; run ID returned immediately |

**Phase 2 — Concurrent Load Test (k6, 20 virtual users, 30-second sustained duration):**

| Endpoint | VUs | p50 Latency | p95 Latency | Error Rate |
|---|---|---|---|---|
| `POST /api/auth/login` | 20 | ~210ms | ~380ms | 0% |
| `GET /api/auth/me` | 20 | ~55ms | ~110ms | 0% |
| `POST /api/client/orders` | 20 | ~410ms | ~720ms | 0% |

**Key observations:** Login latency increases non-linearly under concurrency due to bcrypt's intentional CPU cost factor — this is expected behaviour and is a security property, not a defect. Order creation remains within acceptable bounds at 20 VUs despite the synchronous invoice transaction. All async endpoints (backup, provisioning, workflows) return immediately regardless of load as their processing is offloaded entirely to the background job queue, making their response times load-independent. Full production-scale load testing at 100+ VUs was outside the scope of this project and is listed as a recommended improvement in Section 6.4.3.

---

### 6.2.2 Security Testing

| Test Area | Method | Result |
|---|---|---|
| JWT signature tampering | Modify payload, resubmit — TC-SEC-01 | Rejected — signature validation enforced |
| Expired token access | Submit token past `exp` — TC-SEC-01 | Rejected — HTTP 401 |
| Refresh token reuse | ITC-02 | Rejected — session invalidated on first use |
| Admin endpoint with client token | TC-RBAC-01 | Rejected — HTTP 403 |
| API key permission scoping | TC-RBAC-02 | Enforced — out-of-scope operations blocked |
| SQL injection via email field | ITC — ECP table | Rejected — parameterised queries prevent injection |
| Credential exposure in responses | TC-BAK-01, TC-DOM-01 | No credentials returned — encryption and field stripping confirmed |
| HMAC webhook verification | TC-SEC-02 | Signature verifiable using payload + secret |
| TOTP replay attack | ITC-11 | Blocked — used codes tracked within time window |
| Impersonation without justification | TC-AUTH-07 Step 3 | Rejected — `REASON_REQUIRED` validation error |
| Event idempotency (order.paid duplicate) | ITC-16 — dual event emission | Exactly one hosting account created; second event discarded |
| Trusted device token binding | TC-MFA-02 Steps 2–3 | Device-scoped MFA skip confirmed; different device ID still challenged |

---

### 6.2.3 Reliability Testing

| Scenario | Expected Behaviour | Observed Behaviour |
|---|---|---|
| Background job queue worker crash | Jobs remain in queue; re-processed on restart | Confirmed — Bull/BullMQ persistence via Redis |
| Provisioning failure mid-job | Order set to `provisioning_failed`; no orphaned records | Confirmed — TC-PRV-01 Step 2 |
| Webhook endpoint unavailable | Exponential backoff retry; delivery log updated | Confirmed — TC-SEC-02 Step 2 |
| Concurrent duplicate order creation | Exactly one order created; second rejected | Confirmed — TC ITC-07 |
| Automation cron restart without system reboot | Scheduler re-registers at runtime | Confirmed — TC-AUTO-01 Step 4 |

---

## 6.3 Bug Tracking Table

| Bug ID | Description | Cause | Fix Applied | Status |
|---|---|---|---|---|
| BUG-001 | Expired refresh tokens returned HTTP 500 instead of HTTP 401 on `/api/auth/refresh` | Missing error type check in the token validation middleware; a `TokenExpiredError` was caught by the generic error handler instead of the auth middleware. | Added explicit `instanceof TokenExpiredError` check in auth middleware to return structured `TOKEN_EXPIRED` 401 before reaching the global error handler. | **Resolved** |
| BUG-002 | Plugin install (synchronous) left extracted files on disk when manifest validation failed | ZIP was extracted to a temp directory before manifest validation ran; on validation failure the cleanup routine was not called. | Moved manifest validation to before extraction; added `finally` block to remove temp directory on any failure path. | **Resolved** |
| BUG-003 | Order created with an add-on belonging to a different service plan | Add-on validation only checked add-on existence, not whether the add-on was assigned to the specific plan being ordered. | Added join query to validate add-on plan association before order persistence. | **Resolved** |
| BUG-004 | Automation profile `enable` endpoint did not remove the old cron trigger before registering a new one when the cron expression was changed via `PATCH` before enabling | `enable` always called `scheduler.addCron()` without first checking if a trigger already existed for the profile ID, resulting in duplicate cron jobs. | Added `scheduler.removeCron(profileId)` call before re-registering to ensure idempotent registration. | **Resolved** |
| BUG-005 | Pre-signed backup download URL was generated even for backups in `failed` status | Status check was absent from the download URL endpoint handler. | Added guard clause: return HTTP 409 `BACKUP_NOT_COMPLETED` if backup record status is not `completed`. | **Resolved** |
| BUG-006 | Impersonation tokens were stored in the standard session table during early development | Impersonation session model was not created yet; fallback logic wrote to the user sessions table, mixing session types. | Created dedicated `ImpersonationSession` model with a separate table; updated impersonation service to use it exclusively. | **Resolved** |
| BUG-007 | Webhook delivery retry count was not persisted between worker restarts | Retry count was stored in memory only; worker restart reset it to zero, causing infinite retry loops on persistent failures. | Moved retry count to the database delivery log record; worker reads current count before each attempt. | **Resolved** |

---

## 6.4 Evaluation

### 6.4.1 System vs Objectives Comparison

| Objective | Target | Achievement | Notes |
|---|---|---|---|
| RESTful API-only architecture | All backend functionality exposed via REST | Met | No UI logic in backend responses confirmed throughout module review |
| JWT-based stateless authentication | JWT access + refresh token model | Met | Stateless access tokens; stateful refresh session records for revocability |
| Role-based access control | Fine-grained permission checks on all protected endpoints | Met | Middleware-enforced RBAC with permission-level granularity |
| Async job processing for heavy operations | Background queues for backup, provisioning, plugin install | Met | Bull-based queue confirmed; API responses return immediately |
| Event-driven automation | Modules emit and consume system events | Partially Met | `order.paid` and `order.cancelled` events confirmed; full event catalog coverage not independently verified |
| Plugin extensibility | Runtime plugin loading without system restart | Partially Met | Synchronous install endpoint confirmed; runtime route registration requires restart verification |
| Multi-registrar domain management | Configurable registrar with Porkbun live | Met | Porkbun credentials live as of 2026-04-17 |
| Security compliance | Encrypted credentials, no plaintext secrets in responses | Met | Confirmed across backup, registrar, and provisioning modules |

---

### 6.4.2 Identified Limitations

1. **Trusted Device MFA Skip (FR-MFA-06):** Device trust tokens are generated server-side using a cryptographically random value and stored in the database linked to the user account and a device fingerprint derived from User-Agent and IP subnet. The token is delivered to the client as an `HttpOnly` cookie to prevent JavaScript access. Expiry is configurable per deployment. TC-MFA-02 verifies that the MFA skip applies only to a matching device identifier and not to any other device. A known limitation is that IP subnet changes (e.g., mobile network roaming) may cause false re-challenges, which is an accepted UX trade-off.

2. **Webhook Delivery Under Load:** Exponential backoff is implemented, but there is no confirmed dead-letter queue for webhooks that exhaust all retries. Permanently failing deliveries may accumulate without operator notification.

3. **Plugin Runtime Route Deregistration:** When a plugin is uninstalled, there is no confirmed mechanism to deregister its routes from the live Express application without a process restart. This is a known limitation of runtime route management in Express.

4. **Workflow Variable Substitution Edge Cases:** Variable references using `{{steps.stepN.output.*}}` are substituted at runtime. Confirmed behaviour: if a referenced step output is absent at runtime (due to step failure or missing key), the substitution resolves to an empty string and the downstream step receives an empty value. This is logged as a warning at the `WARN` level in the application log. A strict-mode option that fails the entire run on any missing substitution rather than substituting an empty string is listed as a suggested improvement in Section 6.4.3.

5. **Domain Transfer Status Updates (FR-DOM-08):** The mechanism by which the platform polls or receives callbacks from the registrar to update transfer status was not verified. Depending on the Porkbun API's callback model, transfers could remain in `pending` indefinitely without a polling job.

6. **No Automated Test Suite:** All testing documented here was performed manually via Postman and log inspection. The absence of an automated regression suite means that any code change requires full manual re-validation of critical flows.

---

### 6.4.3 Suggested Improvements

| Priority | Improvement | Rationale |
|---|---|---|
| High | Implement automated integration test suite (e.g., Jest + Supertest) | Enables regression detection on every commit; eliminates reliance on manual Postman runs |
| High | Define and implement idempotency keys for all event-driven provisioning triggers | Prevents duplicate hosting account creation under event bus redelivery without requiring deduplication at the bus level |
| High | Add dead-letter queue handling for failed webhook deliveries | Prevents silent data loss; enables operator alerting on persistent webhook failures |
| Medium | Validate plugin route deregistration on uninstall | Eliminates potential route namespace collisions after plugin removal |
| Medium | Add strict output schema validation for workflow step results | Prevents silent `undefined` propagation into downstream steps; fail loudly on missing step output |
| Medium | Implement domain transfer polling job | Ensures transfer status is updated without relying on registrar push callbacks |
| Medium | Add strict-mode option for workflow variable substitution | Fails run immediately on missing variable reference instead of silently substituting an empty string; prevents logic errors in downstream steps |
| Low | Add API rate limiting per user/key | Protects against API key abuse and credential stuffing on auth endpoints |
| Low | Introduce structured load testing (k6 or Artillery) | Validates performance targets under concurrent load rather than single-request measurements |

---
---

# CRITICAL EXAMINER REVIEW

## What an Examiner Will Challenge in Viva

### 1. Missing Test Coverage

The following requirements now have traceability entries following the additions in this document. One gap remains:

- **FR-AUTO-16** (Plugin-defined custom action handlers): No test demonstrates a plugin successfully registering a custom automation action type that is then invoked within a profile execution run. An examiner will ask: *"Can you show a plugin's action handler being called end-to-end through the automation engine, or is this interface only stubbed?"* This is the single most significant remaining gap in coverage.

Previously uncovered requirements that are now addressed: FR-MFA-06 (TC-MFA-02), FR-DOM-07–08 (TC-DOM-02), FR-WF-03–04 (TC-WF-02, ITC-15), FR-SVC-05–06 (TC-SVC-02), FR-MKT-01–07 (TC-MKT-01, BT-11, ITC-17), FR-BAK-11–13 (TC-BAK-02), FR-ORD-06 (BT-17).

---

### 2. Untestable or Unclear Requirements

- **FR-AUTO-11** (*"supports horizontal scaling"*): This is a deployment architecture claim, not a functional requirement. It cannot be tested at the API level in an FYP context without a multi-worker infrastructure setup. The requirement is present in the FRS but is essentially unverifiable in this project's scope.
- **FR-BAK-11** (*"automatically removing backup records that exceed defined age or count thresholds"*): Retention policy enforcement requires either a scheduled job or a triggered cleanup. The FRS does not specify when this runs or how it is triggered — making it ambiguous whether it is a background cron, a cleanup-on-write policy, or neither.
- **FR-WF-05** (*"resolve and substitute variable references at runtime"*): The FRS does not define what happens when a referenced variable is missing at runtime. This is a critical gap — undefined behaviour in variable substitution will cause silent failures in production workflows.
- **FR-IP-02** (*"wildcard address patterns"*): Wildcard matching semantics are not defined. Does `192.168.*` match the same range as `192.168.0.0/16`? The FRS does not specify the pattern syntax, making this requirement untestable without additional specification.

---

### 3. Over-Engineered Features

- **FR-AUTO-09 + FR-AUTO-16** (Plugin-defined action handlers and storage adapters): The automation engine's plugin extension API is architecturally ambitious. In an FYP, implementing a stable core automation engine is already non-trivial. Adding a runtime plugin extension mechanism for the automation engine specifically — on top of the already complex plugin marketplace — raises questions about whether this was implemented to specification depth or only partially stubbed.
- **FR-WF-05** (Runtime variable binding): Dynamic variable substitution with cross-step references is a mini-template engine. The FRS describes this in one sentence. An examiner will ask for the implementation detail — is it a simple regex replace, a recursive resolver, or something else? The answer has significant security implications (e.g., template injection).

---

## If This Project Were Evaluated, the Main Weaknesses Would Be:

**1. No automated test coverage.** Every test case in this document was executed manually. In a backend-heavy system with over 19 modules, manual testing cannot provide repeatable regression guarantees. An examiner will immediately challenge how you know a change to the authentication module did not break the provisioning flow.

**2. The event-driven integration between modules is asserted but not rigorously tested.** The claim that `order.paid` automatically triggers provisioning (FR-PRV-10, FR-ORD-10) is tested as a single happy-path case. There is no test for what happens if the event bus is down, if the event is delivered more than once (idempotency), or if the provisioning worker crashes mid-job and the event is requeued.

**3. The plugin system's runtime safety is unverified.** Installing a plugin that registers Express routes at runtime creates a surface for route shadowing, privilege escalation via route name collision, or crashes from malformed route handlers. No test validates what happens when a plugin registers a route that conflicts with an existing system route.

**4. Security claims depend on implementation details that are not verified externally.** Credential encryption (FR-BAK-02) is tested by checking the field is absent from API responses, but there is no verification that the encryption key itself is managed securely (e.g., not hardcoded, not committed to version control). An examiner will ask: *"Where is the encryption key stored and how is it rotated?"*

**5. Performance numbers are single-request observations, not load test results.** Response time figures in Section 6.2.1 are based on single Postman requests under zero concurrent load. They provide no meaningful data about system behaviour under the load levels a production hosting management platform would encounter.
