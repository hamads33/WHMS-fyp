3.6 SYSTEM USE CASES

The following use cases document the primary workflows of the Web Hosting Management System (WHMS). Each use case covers actor interactions, business rules, main flows, alternative flows, exceptional flows, and postconditions across client-facing, administrative, event-driven, and external integration scenarios.

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-AUTH-01
Use Case Name	User Registration and Email Verification
Primary Actor	Client (Web UI / API Consumer)
Secondary Actors	Email Service
System Boundary	Authentication and Identity Management API
Trigger	Client submits a registration request to the public API endpoint.
Preconditions	1. User is not already registered.
2. Registration endpoint is publicly accessible.
Postconditions (Success)	1. User account is created with a default role assigned.
2. Email verification status is set to unverified.
3. Verification email is queued and sent to the user.
4. Verification token is generated and stored.
Main Success Flow	Actor	System
	1. Client submits email and password via the registration API.	
		2. System validates the request payload and checks email uniqueness in the database.
		3. System creates the user account and assigns a default role.
		4. System generates a secure, time-limited email verification token.
		5. System queues the verification email via the background email service.
		6. System returns a registration success response.
Alternative Flow	Actor	System
	A2.1 Client requests a new verification link via API.	A1 – Duplicate Email
A1.1 System detects the email is already registered.
A1.2 System rejects the request with an error response.

A2 – Resend Verification Email
A2.2 System generates a new verification token.
A2.3 System invalidates all previously issued tokens for the account.
A2.4 System queues a new verification email.
Exceptional Flow	E1 – Invalid or Expired Token
E1.1 Client submits an invalid or expired verification token.
E1.2 System rejects the verification request.
E1.3 System returns a structured error response.
Business Rules	1. Email addresses must be unique across all accounts.
2. Verification tokens are time-limited and single-use.
3. All previously issued tokens are invalidated when a new one is generated.
4. Email delivery is asynchronous and does not delay the registration API response.
Related Functional Requirements	FR-AUTH-01, FR-AUTH-02, FR-AUTH-03, FR-AUTH-04, FR-AUTH-05, FR-AUTH-06, FR-AUTH-07, FR-AUTH-08, FR-AUTH-09

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-AUTH-02
Use Case Name	Multi-Factor Authentication Enrolment
Primary Actor	Client
Secondary Actors	None
System Boundary	Authentication and Identity Management API
Trigger	Client invokes the MFA setup API endpoint.
Preconditions	1. Client is authenticated with a valid active session.
2. MFA is not already enabled on the account.
Postconditions (Success)	1. MFA is active on the client account.
2. TOTP secret is stored in encrypted form.
3. Backup recovery codes have been generated and returned to the client once.
4. An audit log entry records the enrolment event.
Main Success Flow	Actor	System
	1. Client calls the MFA setup initiation endpoint.	
		2. System checks that MFA is not already enabled on the account.
		3. System generates a TOTP secret, encrypts it, and stores it in a provisional state.
		4. System returns the TOTP secret and a QR provisioning URI to the client.
	5. Client configures their authenticator app and submits the first TOTP code to the confirmation endpoint.	
		6. System validates the submitted code against the provisional secret.
		7. System activates MFA and permanently stores the encrypted secret.
		8. System generates backup recovery codes, stores them in hashed form, and returns the plaintext codes to the client.
		9. System records an audit entry for the MFA enrolment event.
Alternative Flow	Actor	System
		A1 – MFA Already Active
A1.1 System detects MFA is already enabled.
A1.2 System returns a 409 conflict response.

A2 – Invalid TOTP Code
	A2.1 Client submits incorrect or expired TOTP code.	A2.2 System returns a 422 error. Provisional secret is kept for retry.
Exceptional Flow	E1 – Provisional Session Expired
E1.1 Client does not submit a verification code within the allowed time window.
E1.2 System discards the provisional secret.
E1.3 Client must restart the enrolment process from the beginning.
Business Rules	1. TOTP secrets must be generated securely and stored encrypted; plaintext secrets must never be stored.
2. Enrolment is not complete until the client successfully verifies a valid TOTP code.
3. Backup codes are returned to the client exactly once and stored in hashed form.
4. Attempting enrolment when MFA is already active returns a 409 conflict response.
Related Functional Requirements	FR-MFA-01, FR-MFA-02, FR-MFA-03, FR-MFA-04, FR-MFA-05, FR-MFA-06, FR-AUDIT-01

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-AUTH-03
Use Case Name	Password Reset Request and Completion
Primary Actor	Client
Secondary Actors	Email Service
System Boundary	Authentication and Identity Management API
Trigger	Client submits their registered email address to the password reset endpoint.
Preconditions	1. The client's email address is registered in the system.
2. The account exists regardless of active or inactive status.
Postconditions (Success)	1. Account credential is updated with the new hashed password.
2. All active sessions for the account are revoked.
3. The consumed reset token is invalidated.
4. Audit entries exist for the request and completion events.
Main Success Flow	Actor	System
	1. Client submits registered email to the reset initiation endpoint.	
		2. System resolves the account, invalidates any existing reset tokens, and generates a new secure time-limited token.
		3. System queues a password reset link email via the background email service.
		4. System returns a generic success response (identical for known and unknown emails).
	5. Client submits the reset token and desired new password to the completion endpoint.	
		6. System retrieves and validates the token — checks it has not expired and has not been used.
		7. System hashes the new password and updates the credential record.
		8. System revokes all active sessions for the account.
		9. System invalidates the consumed token.
		10. System records audit entries for both the request initiation and the successful completion.
Alternative Flow	Actor	System
		A1 – Unknown Email
A1.1 System returns the same generic success response.
A1.2 No token is generated and no email is dispatched.

A2 – Weak Password
	A2.1 Client submits a password that does not meet complexity requirements.	A2.2 System returns a 400 validation error. Token is not consumed and remains valid.
Exceptional Flow	E1 – Expired or Already-Used Token
E1.1 Client submits a token that has expired or was already consumed.
E1.2 System returns a 422 error.
E1.3 Client must initiate a new reset request.
Business Rules	1. System returns the same response for known and unknown emails to prevent account enumeration.
2. Reset tokens are single-use, time-limited, and delivered exclusively via email link.
3. All active sessions are revoked upon successful password reset.
4. All existing unused tokens are invalidated when a new token is issued.
5. Reset token must not appear in any API response.
Related Functional Requirements	FR-PASS-01, FR-PASS-02, FR-PASS-03, FR-PASS-04, FR-PASS-05, FR-PASS-06, FR-PASS-07, FR-AUDIT-04

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-AUTH-04
Use Case Name	Administrator Impersonation Session
Primary Actor	Administrator
Secondary Actors	Audit Service
System Boundary	Authentication and Identity Management API
Trigger	Administrator submits an impersonation request with a target client identifier and a justification reason.
Preconditions	1. Administrator holds the explicit impersonation permission, which is distinct from the standard staff role.
2. Target client account exists and is in an active state.
Postconditions (Success)	1. An impersonation session record exists with start and end timestamps and the justification reason.
2. Audit entries exist for both session start and termination.
3. Impersonation tokens are revoked upon session termination.
Main Success Flow	Actor	System
	1. Administrator submits the target client identifier and justification reason to the impersonation endpoint.	
		2. System verifies that the impersonation permission is explicitly granted to the requesting administrator.
		3. System validates the justification reason is present and non-empty.
		4. System retrieves and confirms the target client account is active.
		5. System generates impersonation-specific access and refresh tokens embedding both the administrator and client identities.
		6. System creates an impersonation session record separately from the standard session store.
		7. System records an audit entry for the session start and returns the tokens to the administrator.
	8. Administrator uses the impersonation tokens to make API requests on behalf of the client.	
		9. System attaches the impersonator identifier to the request context for audit logging throughout the session.
	10. Administrator submits a termination request to the impersonation end endpoint.	
		11. System revokes the tokens, updates the session record with the end timestamp, and records an audit entry for session termination.
Alternative Flow	Actor	System
		A1 – Missing Justification
A1.1 System detects the justification field is absent or empty.
A1.2 System returns a 400 validation error. No session is created.

A2 – Target Account Inactive or Not Found
	A2.1 Administrator submits ID for an inactive or non-existent client.	A2.2 System returns a 404 or 422 response. No session is created.
Exceptional Flow	E1 – Insufficient Permissions
E1.1 Requesting administrator does not hold the explicit impersonation permission.
E1.2 System returns a 403 response, regardless of other role assignments.
Business Rules	1. Impersonation permission is evaluated independently from the standard admin role.
2. Justification reason is a mandatory field; requests without it are rejected.
3. Impersonation tokens are cryptographically distinct from standard session tokens.
4. Impersonation session records are stored separately from standard session records.
5. All API operations during impersonation are audit-logged with both actor and target identities.
Related Functional Requirements	FR-IMP-01, FR-IMP-02, FR-IMP-03, FR-IMP-04, FR-IMP-05, FR-IMP-06, FR-IMP-07, FR-IMP-08, FR-IMP-09, FR-AUDIT-03

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-ORD-01
Use Case Name	Client Places a Service Order
Primary Actor	Client
Secondary Actors	Billing Service, Automation Module, Email Service
System Boundary	Orders and Billing API
Trigger	Client submits a POST request to the order creation endpoint with a plan identifier, add-on identifiers, and custom field responses.
Preconditions	1. Client is authenticated with an active client role.
2. The selected service plan is active and has at least one active pricing entry.
3. Client account is not deactivated or suspended.
Postconditions (Success)	1. An order record exists in pending or active state.
2. An invoice record is created and linked to the order within the same database transaction.
3. An order.created event has been emitted.
4. Client receives an order confirmation email.
Main Success Flow	Actor	System
	1. Client submits plan ID, add-on IDs, and custom field values to the order creation endpoint.	
		2. System authenticates the request and resolves the client account from the session context.
		3. System retrieves the plan record and validates its active status and public visibility.
		4. System verifies at least one active pricing entry exists for the plan.
		5. System validates all submitted add-on IDs against the plan's available add-ons.
		6. System validates all required custom field responses against the service's field definitions.
		7. System creates the order and the associated invoice atomically in a single database transaction.
		8. System returns the created order details including the invoice reference to the client.
		9. System emits an order.created event; Automation Module evaluates trigger rules and queues any configured workflows.
		10. Email Service dispatches an order confirmation notification to the client asynchronously.
Alternative Flow	Actor	System
		A1 – Plan Unavailable
A1.1 System detects the plan is inactive or does not exist.
A1.2 System returns a 404 or 422 error. Order is not saved.

A2 – No Active Pricing Entry
A2.1 System returns a 422 precondition failure. Order is not saved.

A3 – Invalid Add-on
A3.1 System detects an add-on not available for the selected plan.
A3.2 System returns a 422 error identifying the invalid add-on. Order is not saved.
Exceptional Flow	E1 – Database Transaction Failure
E1.1 Transaction fails during order or invoice creation.
E1.2 System rolls back both records and returns a 500 error.
E1.3 A structured error entry is logged with the request correlation identifier.
Business Rules	1. The selected plan must be active and publicly visible before an order is accepted.
2. At least one active pricing entry must exist for the plan; orders without pricing are rejected.
3. Order and invoice are created together in one database transaction.
4. Orders are scoped exclusively to the authenticated client; clients cannot create orders for other accounts.
5. All required custom fields must be present and valid before the order is accepted.
6. Selected add-ons must be available for the chosen plan.
Related Functional Requirements	FR-ORD-01, FR-ORD-02, FR-ORD-03, FR-ORD-04, FR-ORD-05, FR-ORD-06, FR-SVC-09, FR-AUTO-17

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-ORD-02
Use Case Name	Order Cancellation and Downstream Event Chain
Primary Actor	Client or Administrator
Secondary Actors	Provisioning Module, Automation Module, Email Service
System Boundary	Orders API and Internal Event Bus
Trigger	Client or administrator submits a cancellation request to the order cancellation endpoint.
Preconditions	1. The order exists in an active or provisioned state.
2. The requesting user is either the owning client or an administrator with the required permission.
Postconditions (Success)	1. Order status is cancelled or pending_cancellation.
2. An order.cancelled event has been emitted.
3. The associated hosting account is suspended on the server.
4. Any configured automation workflows have been queued for execution.
5. Client receives a cancellation confirmation email.
Main Success Flow	Actor	System
	1. Client or administrator submits a cancellation request to the order cancellation endpoint.	
		2. System validates the requesting user's authority to cancel the specified order.
		3. System retrieves the order and verifies it is in an eligible state for cancellation.
		4. System transitions the order status according to the configured cancellation policy.
		5. System emits an order.cancelled internal event carrying the order and client identifiers.
		6. Provisioning module receives the event and dispatches an account suspend request to the server control panel API asynchronously.
		7. Automation module evaluates configured trigger rules and queues any matching workflows.
		8. Email Service dispatches a cancellation confirmation to the client.
Alternative Flow	Actor	System
		A1 – Order Already Cancelled
A1.1 System detects the order is already in a cancelled state.
A1.2 System returns a 409 conflict response. Event is not re-emitted.

A2 – No Associated Hosting Account
A2.1 Provisioning listener logs a no-op and takes no further action.
Exceptional Flow	E1 – Account Suspension Failure
E1.1 Server control panel API returns an error during suspension.
E1.2 Worker records the failure with a correlation identifier.
E1.3 A suspension.failed alert event is emitted. The order cancellation is not rolled back.
Business Rules	1. Order status transition follows the platform's configured cancellation policy.
2. An order.cancelled event must be emitted regardless of which policy is applied.
3. Hosting account is suspended, not deleted, to preserve data integrity.
4. Cancellation is idempotent; repeated requests for an already-cancelled order return a 409.
5. Clients may only cancel their own orders; administrators may cancel any order.
Related Functional Requirements	FR-ORD-07, FR-ORD-08, FR-ORD-09, FR-ORD-10, FR-ORD-11, FR-ORD-12, FR-PRV-07, FR-AUTO-17

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-DOM-01
Use Case Name	Domain Name Registration
Primary Actor	Client
Secondary Actors	Domain Registrar API (Porkbun), Billing Service, Email Service
System Boundary	Domain Management API
Trigger	Client submits a domain registration request with the desired domain name and registrant contact details.
Preconditions	1. Client is authenticated with a valid client role.
2. The registrar integration is configured with valid credentials.
3. Client account is in an active state.
Postconditions (Success)	1. A domain record is saved and associated with the client's account.
2. An invoice record exists for the registration transaction.
3. Client receives a registration confirmation email.
4. A domain.registered event has been emitted.
Main Success Flow	Actor	System
	1. Client submits domain name, TLD choice, and registrant contact details to the registration endpoint.	
		2. System validates the domain name format and confirms the TLD is supported by the configured registrar.
		3. System checks that the domain is not already registered to the client's account.
		4. System generates an invoice record with pending payment status.
		5. System dispatches the registration request to the registrar API.
		6. System receives a success response and creates a domain record with active status, populating registrar-returned data.
		7. System associates the domain record with the client's account.
		8. System updates the invoice status to reflect the completed transaction.
		9. System queues a registration confirmation email to the client asynchronously.
		10. System emits a domain.registered event.
Alternative Flow	Actor	System
		A1 – Invalid Domain Format
A1.1 System rejects the request with a 400 error. No invoice is created.

A2 – Unsupported TLD
A2.1 System returns a 422 error. No external call is made.

A3 – Duplicate Domain
A3.1 System detects the domain is already registered to the client's account.
A3.2 System returns a 409 conflict response.
Exceptional Flow	E1 – Registrar API Failure
E1.1 Registrar returns an error response.
E1.2 System marks the invoice for review and does not create a domain record.
E1.3 System returns a 502 error to the client identifying the registrar failure.
Business Rules	1. An invoice must be generated before the registrar API is called.
2. Domain name must pass format validation before any external API call is made.
3. Registrar API credentials must never appear in any client-facing response.
4. A domain record is created only after a confirmed success response from the registrar.
5. If registration fails, the invoice must be voided; the client must not be charged for a failed registration.
Related Functional Requirements	FR-DOM-01, FR-DOM-02, FR-DOM-03, FR-DOM-04, FR-DOM-05, FR-DOM-06, FR-DOM-13

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-DOM-02
Use Case Name	Domain Transfer via EPP Authorisation Code
Primary Actor	Client
Secondary Actors	Domain Registrar API, Email Service
System Boundary	Domain Management API
Trigger	Client submits a transfer request with the domain name and EPP authorisation code to the transfer endpoint.
Preconditions	1. Client is authenticated with a valid client role.
2. Registrar integration is active and connected.
3. The domain is not already registered to the client's account.
4. Client possesses the EPP authorisation code for the domain.
Postconditions (Success)	1. A domain transfer record exists with a completed terminal status.
2. The domain record is active and associated with the client's account.
3. Domain log entries exist for both the initiation and resolution of the transfer.
4. Client receives a transfer outcome notification email.
Main Success Flow	Actor	System
	1. Client submits domain name and EPP authorisation code to the transfer initiation endpoint.	
		2. System validates the request parameters and verifies the domain is not already in the account.
		3. System creates a DomainTransfer record in pending state and a Domain record in transferring state.
		4. System dispatches the transfer request to the registrar API with the domain name and EPP code.
		5. System receives a transfer order reference from the registrar and saves it against the transfer record.
		6. System records a domain log entry for the transfer initiation.
		7. System returns a success response indicating the transfer is in progress.
		8. Upon receiving transfer confirmation from the registrar, system transitions domain to active and transfer record to completed.
		9. System dispatches a transfer completion notification to the client via the email service.
Alternative Flow	Actor	System
		A1 – Invalid EPP Code
A1.1 Registrar returns an authorisation failure.
A1.2 System transitions the transfer record to failed and returns a 422 error to the client.
A1.3 System records a domain log entry for the failure.

A2 – Domain Locked at Registrar
A2.1 Registrar rejects the transfer because the domain is locked.
A2.2 System transitions transfer to failed and returns a 422 error advising the client to unlock the domain.
Exceptional Flow	E1 – Registrar API Unavailable
E1.1 Registrar is unreachable at the time of submission.
E1.2 System returns a 503 error. No transfer record is created.
E1.3 Connectivity failure is logged with the request correlation identifier.
Business Rules	1. A transfer record must be created before the registrar API is called.
2. The EPP code is transmitted to the registrar but must never be stored in the platform's database.
3. Transfer status is set to active only upon confirmed completion from the registrar.
4. Domain log entries are recorded for both the initiation and the resolution of the transfer.
Related Functional Requirements	FR-DOM-07, FR-DOM-08, FR-DOM-09, FR-DOM-12, FR-DOM-13

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-BAK-01
Use Case Name	On-Demand Backup Restore
Primary Actor	Administrator
Secondary Actors	Restore Worker, Storage Provider (S3 / SFTP / FTP)
System Boundary	Backup Restore API
Trigger	Administrator submits a restore request via the API with the target backup identifier.
Preconditions	1. Administrator is authenticated with restore permissions.
2. Target backup record exists, is in a completed state, and is accessible in storage.
3. The storage configuration referenced by the backup record is active.
Postconditions (Success)	1. A restore job record exists with a terminal status of completed or failed.
2. If successful, the target environment reflects the restored state.
3. Restore execution logs are saved.
Main Success Flow	Actor	System
	1. Administrator submits a restore request with the backup identifier to the restore endpoint.	
		2. System validates administrator authorisation and retrieves the backup record.
		3. System verifies the backup is in a completed state.
		4. System checks for an existing in-progress restore job for the same backup (idempotency check).
		5. System verifies connectivity to the associated storage configuration.
		6. System enqueues the restore job and returns the job identifier to the administrator immediately.
		7. Worker downloads the backup archive from the storage provider.
		8. Worker extracts the archive contents and restores files and/or database state.
		9. Worker logs each restore step with structured output.
		10. Worker emits a restore completion event and updates the job status to completed.
Alternative Flow	Actor	System
	A1.1 Administrator specifies file-only or database-only restore scope.	A1 – Partial Restore
A1.2 System accepts the scope parameter and restricts the restore to the selected component only.

A2 – Duplicate Restore Request
	A2.1 Administrator submits a restore request for a backup already being restored.	A2.2 System returns the existing job identifier with a 200 response. No duplicate job is created.
Exceptional Flow	E1 – Restore Failure
E1.1 Worker encounters an error during restore execution.
E1.2 Worker logs the failure with a correlation identifier.
E1.3 Worker emits a restore failure event and marks the job as failed.
Business Rules	1. Restore operations are restricted to administrators.
2. Only backup records in a completed state are eligible for restore.
3. Restore operations are asynchronous; the API must not block on completion.
4. If a restore job for the same backup is already in progress, the existing job identifier is returned rather than creating a duplicate.
5. Storage credentials must not be exposed in any restore-related API response.
Related Functional Requirements	FR-BAK-06, FR-BAK-07, FR-BAK-08, FR-BAK-09, FR-BAK-10
Notes	The job identifier returned by the enqueue endpoint allows the caller to poll a dedicated status endpoint for completion state.

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-BAK-02
Use Case Name	Scheduled Retention Policy Enforcement
Primary Actor	System (Retention Worker)
Secondary Actors	Storage Provider (S3 / SFTP / FTP)
System Boundary	Backup Subsystem
Trigger	Retention worker is invoked on its configured schedule or triggered manually via API.
Preconditions	1. Backup storage configurations exist with defined retention policies.
2. Completed backup records exist that may be subject to expiry.
3. Background retention worker is operational.
Postconditions (Success)	1. Expired backup records are removed from both the storage provider and the database.
2. Backup log entries exist for each deleted record.
3. A retention.run.completed event is emitted with a deletion summary.
Main Success Flow	Actor	System
	1. Retention worker is triggered on schedule or by manual API invocation.	
		2. Worker retrieves all storage configurations that have a retention policy defined.
		3. For each configuration, worker queries backup records in completed state that exceed the configured age or count threshold.
		4. For each expired record, worker connects to the storage provider and deletes the archive file.
		5. Worker deletes the database record only after confirming successful storage deletion.
		6. Worker records a structured deletion log entry for each removed backup.
		7. Worker emits a retention.run.completed event with a summary of deletions performed.
Alternative Flow	Actor	System
		A1 – File Not Found on Storage
A1.1 Archive does not exist on the storage provider (e.g., manually removed).
A1.2 Worker logs an inconsistency warning and proceeds to delete the database record.

A2 – Storage Provider Unreachable
A2.1 Worker cannot connect to the storage provider for a specific configuration.
A2.2 Worker logs a connectivity error, skips all backups for that configuration, and continues to the next.
A2.3 Skipped records are re-evaluated in the next scheduled retention run.
Exceptional Flow	E1 – Database Record Deletion Failure
E1.1 Storage file deleted successfully but database record deletion fails.
E1.2 Worker logs the orphaned record reference with a correlation identifier for manual remediation.
Business Rules	1. Retention policies are evaluated independently per storage configuration.
2. A backup record must not be deleted if it is the only completed backup for a target, unless the policy explicitly permits it.
3. The archive file must be deleted from storage before the corresponding database record is removed.
4. Worker must operate idempotently; multiple runs within the same period must not cause unintended deletions.
5. All deletion actions are recorded in the backup audit log.
Related Functional Requirements	FR-BAK-01, FR-BAK-04, FR-BAK-11, FR-BAK-12, FR-BAK-13

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-PRV-01
Use Case Name	Administrator Manually Provisions a Hosting Account
Primary Actor	Administrator
Secondary Actors	Server Control Panel API (VestaCP), Email Service
System Boundary	Provisioning API
Trigger	Administrator invokes the manual provisioning endpoint with the target order identifier.
Preconditions	1. Administrator is authenticated with provisioning permissions.
2. The specified order exists in an active or paid state.
3. No hosting account is already linked to the order.
4. At least one server is active and not in maintenance mode within the applicable server group.
Postconditions (Success)	1. A HostingAccount record is linked to the order, client, and server.
2. Order status is active.
3. Client receives an account creation notification email.
4. A hosting.account.created event has been emitted.
5. Audit and provisioning log entries exist for the operation.
Main Success Flow	Actor	System
	1. Administrator submits the target order identifier to the manual provisioning endpoint.	
		2. System validates authentication and provisioning permission.
		3. System retrieves the order record and verifies it is eligible for provisioning.
		4. System checks that no hosting account already exists for the order.
		5. System selects the target server using the configured server group assignment rules.
		6. System verifies the selected server is active and not in maintenance mode.
		7. System transitions the order status to provisioning_in_progress.
		8. System dispatches an account creation request to the server control panel API.
		9. System creates a HostingAccount record and transitions the order to active on success.
		10. System dispatches an account creation notification to the client via the email service.
		11. System emits a hosting.account.created event.
Alternative Flow	Actor	System
		A1 – Duplicate Account
A1.1 A hosting account already exists for the order.
A1.2 System returns a 409 conflict response. No further action is taken.

A2 – No Available Server
A2.1 No eligible server is found in the applicable group.
A2.2 System returns a 503 error. Order status remains unchanged.
Exceptional Flow	E1 – Server Control Panel API Failure
E1.1 Control panel API returns an error response.
E1.2 System transitions the order to provisioning_failed and emits a provisioning.failed alert event.
E1.3 System returns a 502 error to the administrator.
Business Rules	1. The endpoint is idempotent; an existing account for the order returns a 409 conflict.
2. Server selection follows configured group rules; servers in maintenance mode are excluded.
3. Order transitions from provisioning_in_progress to either active or provisioning_failed — no order is left in an ambiguous state.
4. Server credentials and API keys must never appear in any client-visible response.
Related Functional Requirements	FR-PRV-04, FR-PRV-05, FR-PRV-06, FR-PRV-07, FR-PRV-08, FR-PRV-11, FR-SRV-05, FR-SRV-13

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-PRV-02
Use Case Name	Automatic Provisioning Triggered by order.paid Event
Primary Actor	System (Payment Webhook Processor)
Secondary Actors	Provisioning Worker, Server Control Panel API, Email Service, Billing Service
System Boundary	Provisioning and Billing API
Trigger	Payment gateway dispatches a signed payment.confirmed webhook. Billing module validates it and emits an order.paid internal event.
Preconditions	1. A valid order exists in active state with a pending invoice.
2. The platform is configured to receive payment webhooks from the payment gateway.
3. At least one eligible server exists in the applicable server group.
Postconditions (Success)	1. Invoice is in paid state and order is active.
2. A HostingAccount record is linked to the order, client, and server.
3. Client receives account credentials via email.
4. A hosting.account.created event has been emitted.
Main Success Flow	Actor	System
	1. Payment gateway dispatches a signed payment confirmation webhook to the platform.	
		2. Billing module validates the HMAC signature of the incoming payload.
		3. System updates the invoice to paid and the order to active.
		4. System emits an order.paid internal event carrying the order identifier.
		5. Provisioning module receives the event, performs an idempotency check, and enqueues a provisioning job.
		6. System returns a 200 response to the payment gateway immediately.
		7. Provisioning worker selects the target server via server group assignment rules.
		8. Worker dispatches an account creation request to the server control panel API.
		9. Worker creates a HostingAccount record and transitions the order to a provisioned state on success.
		10. Worker dispatches an account creation notification email to the client.
		11. System emits a hosting.account.created event.
Alternative Flow	Actor	System
		A1 – Duplicate Event (Idempotency)
A1.1 A hosting account already exists for the order at the time of the idempotency check.
A1.2 Provisioning listener discards the event and logs a notice. No duplicate job is created.

A2 – Invalid Webhook Signature
A2.1 HMAC signature validation fails.
A2.2 System returns a 401 response to the gateway. No state changes are made.
Exceptional Flow	E1 – Control Panel API Failure After Retries
E1.1 Server API returns errors across all configured retries with exponential backoff.
E1.2 Worker transitions the order to provisioning_failed and emits a provisioning.failed alert event.
E1.3 Invoice remains in paid state as the payment was successfully received.
Business Rules	1. Incoming webhook payload must pass HMAC signature validation before any state changes occur.
2. Event processing is idempotent; an existing hosting account prevents duplicate provisioning.
3. The webhook receiver returns a 200 response immediately; provisioning runs asynchronously.
4. Invoice remains paid even if provisioning fails; only the order status reflects the provisioning failure.
5. Servers in maintenance mode are excluded from the provisioning target selection pool.
Related Functional Requirements	FR-PRV-10, FR-PRV-11, FR-PRV-12, FR-ORD-10, FR-WEBHOOK-01, FR-WEBHOOK-02, FR-WEBHOOK-03, FR-SRV-05

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-PLG-01
Use Case Name	Administrator Approves a Plugin Version Submission
Primary Actor	Administrator
Secondary Actors	Email Service, Developer Account
System Boundary	Plugin Marketplace Administration API
Trigger	Administrator invokes the plugin approval endpoint with the target submission identifier.
Preconditions	1. Administrator is authenticated with marketplace moderation permission.
2. A plugin version submission exists in a pending_review state.
Postconditions (Success)	1. Plugin version status is approved.
2. Plugin is publicly visible in the marketplace catalog.
3. Submitting developer receives an approval notification email.
4. An audit entry records the approval action with the administrator's identity and timestamp.
Main Success Flow	Actor	System
	1. Administrator retrieves the list of pending plugin submissions via the admin API.	
	2. Administrator selects a submission and submits an approval request.	
		3. System validates the administrator's marketplace moderation permission.
		4. System retrieves the version record and verifies it is in pending_review state.
		5. System transitions the version status to approved and updates the plugin's active version reference.
		6. System sets the plugin's public visibility to active in the marketplace catalog.
		7. System queues an approval notification email to the submitting developer.
		8. System records an audit entry with the administrator's identity and timestamp.
		9. System returns a success response to the administrator.
Alternative Flow	Actor	System
		A1 – Version Not in Pending State
A1.1 Target version is already approved or rejected.
A1.2 System returns a 409 conflict response.

A2 – Submission Not Found
A2.1 Specified submission identifier does not exist.
A2.2 System returns a 404 response.
Exceptional Flow	E1 – Developer Email Dispatch Failure
E1.1 Notification email fails to dispatch.
E1.2 Failure is retried per the email worker retry policy.
E1.3 The approval outcome is not affected; the version remains approved.
Business Rules	1. Only versions in pending_review state may be approved.
2. Approval makes the plugin publicly discoverable without requiring a separate visibility toggle.
3. The developer must be notified programmatically upon approval.
4. If a previously approved version exists, the newly approved version becomes the active catalog version.
5. All approval actions are recorded in the audit log.
Related Functional Requirements	FR-MKT-10, FR-MKT-11, FR-MKT-12, FR-PLG-01, FR-PLG-02, FR-AUDIT-05

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-PLG-02
Use Case Name	Asynchronous Plugin Installation with SSE Progress Streaming
Primary Actor	Administrator
Secondary Actors	Plugin Worker, Plugin Module
System Boundary	Plugin Installation API
Trigger	Administrator submits an async installation request to the plugin installation queue endpoint.
Preconditions	1. Administrator is authenticated with a valid admin role.
2. Target plugin version is in an approved state.
3. For paid plugins, a confirmed purchase record exists for the account.
4. Plugin is not already installed and active.
Postconditions (Success)	1. Plugin installation record exists and the plugin is active.
2. Plugin routes are registered and operational.
3. SSE stream has delivered a terminal completion event to the subscribing client.
4. An audit entry records the installation event.
Main Success Flow	Actor	System
	1. Administrator submits the plugin slug to the async installation endpoint.	
		2. System verifies the plugin version is in approved state.
		3. System verifies a purchase record exists for paid plugins.
		4. System checks for an existing installation record (idempotency check).
		5. System enqueues the installation job and returns the job identifier to the administrator.
	6. Administrator subscribes to the SSE progress stream endpoint using the job identifier.	
		7. Worker emits SSE event: installation_started.
		8. Worker retrieves and validates the plugin ZIP archive structure and manifest compliance.
		9. Worker emits SSE event: validation_passed.
		10. Worker extracts the archive and registers the plugin's routes and configuration with the platform.
		11. Worker emits SSE event: routes_registered.
		12. Worker creates the installation record and marks the job as complete.
		13. Worker emits terminal SSE event: installation_complete.
Alternative Flow	Actor	System
		A1 – Unapproved Plugin
A1.1 Plugin version is not in approved state.
A1.2 System returns a 422 error. No job is queued.

A2 – Missing Purchase Record (Paid Plugin)
A2.1 System detects no confirmed purchase record exists.
A2.2 System returns a 402 response. No job is queued.

A3 – Plugin Already Installed
A3.1 An existing installation record is found.
A3.2 System returns a 200 response with the existing installation record. No duplicate job is created.
Exceptional Flow	E1 – Archive Validation Failure During Installation
E1.1 Worker detects invalid archive structure or manifest during the installation job.
E1.2 Worker emits SSE event: validation_failed with error details.
E1.3 Worker marks the job as failed. No routes are registered and no files are extracted.
Business Rules	1. Only approved plugin versions may be installed.
2. Paid plugins require a confirmed purchase record before installation is queued.
3. Installation is idempotent; an existing installation returns the existing record.
4. Archive validation occurs within the worker to guard against post-approval tampering.
5. Plugin route registration only occurs after the archive passes all validation checks.
6. SSE stream emits a progress event at each significant stage and a terminal event on completion or failure.
Related Functional Requirements	FR-PLG-04, FR-PLG-05, FR-PLG-10, FR-PLG-11, FR-PLG-12, FR-PLG-13, FR-PLG-14, FR-PLG-15, FR-MKT-08, FR-MKT-09

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-PLG-03
Use Case Name	Developer Submits Plugin Version for Marketplace Review
Primary Actor	Developer
Secondary Actors	Administrator, Email Service
System Boundary	Plugin Submission API
Trigger	Developer uploads a ZIP archive and submits a version release request to the plugin version submission endpoint.
Preconditions	1. Developer is authenticated with a valid developer role.
2. The plugin base record exists and is owned by the authenticated developer.
3. Developer has a valid developer profile.
Postconditions (Success)	1. A plugin version record exists in pending_review, approved, or rejected state.
2. Developer has been notified of the review outcome.
3. An audit entry records the submission and review actions.
Main Success Flow	Actor	System
	1. Developer uploads the plugin ZIP archive to the dedicated upload endpoint.	
		2. System validates the archive structure and manifest compliance.
		3. System creates a version record in pending_review state, linked to the plugin and the uploaded archive.
		4. If a prior pending version exists, system supersedes it with the new submission.
		5. System returns the created version record to the developer.
		6. System dispatches a notification to administrators that a new submission is awaiting review.
	7. Administrator reviews the submission and invokes the approval or rejection endpoint.	
		8. On approval: system transitions version to approved, makes plugin publicly visible, and notifies the developer.
		9. On rejection: system transitions version to rejected with the mandatory rejection reason and notifies the developer.
Alternative Flow	Actor	System
		A1 – Invalid Archive Structure
A1.1 ZIP archive fails structural or manifest validation.
A1.2 System returns a 422 error identifying the violations. No version record is created.

A2 – Plugin Not Owned by Developer
A2.1 Plugin identifier does not belong to the authenticated developer.
A2.2 System returns a 403 response.
Exceptional Flow	E1 – Rejection Without a Reason
E1.1 Administrator submits a rejection request without providing a reason.
E1.2 System returns a 400 validation error.
E1.3 Version status is not changed.
Business Rules	1. Archive must be validated at submission time; non-conforming archives are rejected before any record is created.
2. New submissions are assigned pending_review status and are not publicly visible until approved.
3. Developers may not self-approve their own submissions; approval requires a separate administrator action.
4. A new submission supersedes any prior pending version for the same plugin.
5. Rejection requires a mandatory reason field.
Related Functional Requirements	FR-PLG-01, FR-PLG-02, FR-PLG-03, FR-PLG-04, FR-PLG-05, FR-PLG-08, FR-PLG-09, FR-MKT-11, FR-MKT-12

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-AUTO-01
Use Case Name	Administrator Creates and Enables an Automation Profile
Primary Actor	Administrator
Secondary Actors	Task Scheduler, Automation Worker
System Boundary	Automation API
Trigger	Administrator submits a profile creation request via the automation API, followed by task creation and a profile enable request.
Preconditions	1. Administrator is authenticated with a valid admin role.
2. Action types referenced in tasks are registered in the executor service registry.
Postconditions (Success)	1. An automation profile record exists in enabled state with at least one associated task.
2. The profile is registered with the active task scheduler.
3. Audit entries exist for profile creation, task creation, and enable events.
Main Success Flow	Actor	System
	1. Administrator submits a profile creation request with a name, description, and cron expression.	
		2. System validates the cron expression syntax and saves the profile in a disabled state.
	3. Administrator submits task creation requests, each specifying an action type and configuration parameters.	
		4. System validates each action type against the executor registry and saves the task records linked to the profile.
	5. Administrator submits a profile enable request.	
		6. System verifies the profile has at least one associated task.
		7. System transitions the profile status to enabled.
		8. System registers the profile's cron schedule with the active task scheduler at runtime.
		9. System returns a success response confirming the profile is active and scheduled.
		10. At each scheduled time, the scheduler enqueues a run job; the worker executes tasks in ordinal sequence.
Alternative Flow	Actor	System
		A1 – Invalid Cron Expression
A1.1 System returns a 400 validation error at profile creation time.

A2 – Unregistered Action Type
A2.1 Task references an action type not in the executor registry.
A2.2 System returns a 422 error at task creation time.

A3 – Enable with No Tasks
A3.1 Enable request submitted for a profile with zero tasks.
A3.2 System returns a 422 precondition failure.
Exceptional Flow	E1 – Scheduler Registration Failure
E1.1 Scheduler is unavailable (e.g., Redis is down).
E1.2 System returns a 503 error and rolls back the profile status to disabled.
Business Rules	1. A profile with no tasks cannot be enabled.
2. Each task must reference a valid registered action type.
3. Task execution order is determined strictly by the ordinal attribute.
4. Enabling a profile registers it with the scheduler at runtime without requiring a system restart.
5. Disabling a profile deregisters it from the scheduler immediately; in-progress runs are allowed to complete.
Related Functional Requirements	FR-AUTO-01, FR-AUTO-02, FR-AUTO-03, FR-AUTO-04, FR-AUTO-05, FR-AUTO-06, FR-AUTO-07, FR-AUTO-08, FR-AUTO-14, FR-AUTO-18

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-AUTO-02
Use Case Name	Scheduled Automation Profile Executes a Task Run
Primary Actor	System (Task Scheduler)
Secondary Actors	Automation Worker, Audit Service, Notification Engine
System Boundary	Automation Worker and Background Job Queue
Trigger	Task scheduler fires a scheduled execution event based on the profile's cron expression.
Preconditions	1. An automation profile is in an enabled state with at least one associated task.
2. The profile's cron schedule has reached its next execution time.
3. The background job queue and automation worker are operational.
Postconditions (Success)	1. A run record exists with a terminal status of completed or failed.
2. Per-task result records are saved against the run.
3. A run.completed or run.failed lifecycle event has been emitted.
Main Success Flow	Actor	System
	1. Scheduler detects the profile's next execution time has been reached.	
		2. Scheduler enqueues a run job in the background job queue carrying the profile identifier.
		3. Worker creates a run record with running status and a start timestamp.
		4. Worker retrieves the ordered task list for the profile.
		5. For each task in ordinal sequence: worker resolves the action type from the executor registry, executes the action with the configured parameters, and records the task result and completion timestamp.
		6. Worker updates the run record to completed with a final timestamp.
		7. Worker saves structured output for each task against the run record.
		8. Worker emits a run.completed lifecycle event to the audit system and notification engine.
Alternative Flow	Actor	System
		A1 – Task Execution Failure
A1.1 A task throws an error or returns a failure result.
A1.2 Worker assigns a correlation identifier to the error, records the failure, transitions the run to failed, and halts further task execution for this run.
A1.3 Future scheduled runs are unaffected; the profile remains enabled.

A2 – Plugin Action Unavailable
A2.1 Task references a plugin-defined action that is no longer registered.
A2.2 Task fails with an action_not_found error. Run is marked failed with a correlation identifier.
Exceptional Flow	E1 – Worker Crash During Run
E1.1 Worker process terminates mid-execution.
E1.2 BullMQ detects the stalled job and re-enqueues it after the lock expiry period.
E1.3 Worker increments the retry count and resumes from the beginning of the task list.
Business Rules	1. Tasks execute in strict ascending ordinal sequence; no task starts before its predecessor reaches a terminal state.
2. Each run is assigned a unique identifier and a run record is created before any task executes.
3. High-resolution timestamps are captured for run start, each task start, each task completion, and run completion.
4. A task failure terminates the current run but does not prevent future scheduled runs.
5. All run outcomes, including per-task results and errors, are persisted as queryable API records.
Related Functional Requirements	FR-AUTO-05, FR-AUTO-07, FR-AUTO-10, FR-AUTO-11, FR-AUTO-12, FR-AUTO-13, FR-AUTO-15, FR-AUTO-17

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-SVC-01
Use Case Name	Administrator Builds a Service Catalog Entry
Primary Actor	Administrator
Secondary Actors	None
System Boundary	Service Management API
Trigger	Administrator initiates service catalog construction via the service management API.
Preconditions	1. Administrator is authenticated with a valid admin role.
2. A service group exists or will be created as part of this workflow.
Postconditions (Success)	1. Service, plans, pricing entries, features, and add-ons are saved and correctly associated.
2. Publicly visible plans with active pricing entries are available in the client-facing catalog API.
Main Success Flow	Actor	System
	1. Administrator creates a service group with a name and description.	
		2. System saves the service group record.
	3. Administrator creates a service record within the group.	
		4. System saves the service record associated with the group.
	5. Administrator creates service plans with resource limits and billing cycle configurations.	
		6. System saves the plan records linked to the service.
	7. Administrator creates pricing entries per plan specifying billing period, currency, and price.	
		8. System saves the pricing entries linked to each plan.
	9. Administrator creates service features with plan-level values and creates purchasable add-ons.	
		10. System saves feature definitions, feature values per plan, and add-on records.
	11. Administrator sets the service and plans to publicly visible.	
		12. System validates that each visible plan has at least one active pricing entry before exposing it in the client catalog.
		13. Client-facing catalog API begins returning the service and its orderable plans.
Alternative Flow	Actor	System
		A1 – Plan Made Visible Without Pricing
A1.1 Administrator attempts to set a plan as publicly visible with no active pricing entry.
A1.2 System returns a 422 precondition failure.

A2 – Hard Delete Blocked by Active Orders
A2.1 Administrator submits a deletion request for a service referenced by active orders.
A2.2 System returns a 409 conflict response identifying the blocking dependency.
Exceptional Flow	E1 – Duplicate Plan Name
E1.1 A plan with the same name already exists within the service.
E1.2 System returns a 409 conflict response.
Business Rules	1. A plan with no active pricing entry cannot accept orders.
2. Services and plans must be explicitly set to publicly visible; creation alone does not expose them to clients.
3. Hard deletion of a service is blocked if active orders reference it; soft deactivation must be used instead.
4. Feature values are plan-scoped; a feature not assigned to a plan returns null for that plan.
5. Add-on availability must be configured per plan; add-ons are not automatically available on all plans.
Related Functional Requirements	FR-SVC-01, FR-SVC-02, FR-SVC-03, FR-SVC-04, FR-SVC-07, FR-SVC-08, FR-SVC-09, FR-SVC-11, FR-SVC-12, FR-SVC-13, FR-SVC-14, FR-SVC-15

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-WF-01
Use Case Name	External Webhook Triggers Linked Workflow Execution
Primary Actor	System (External HTTP Client)
Secondary Actors	Workflow Engine, Automation Worker
System Boundary	Workflow and Webhook Receiver API
Trigger	An external system dispatches an HTTP POST request to the platform's public webhook receiver endpoint.
Preconditions	1. A workflow definition exists in an active (non-deleted) state.
2. An inbound webhook configuration is registered and bound to the workflow.
3. The workflow has at least one defined step.
Postconditions (Success)	1. A workflow run record exists with a terminal status.
2. Per-step execution results are saved against the run record.
3. The external caller received a 200 response at the time of webhook receipt.
Main Success Flow	Actor	System
	1. External system dispatches a POST request to the registered webhook receiver URL.	
		2. System retrieves the webhook configuration associated with the receiver URL.
		3. System validates the HMAC signature of the payload against the stored webhook secret.
		4. System resolves the workflow definition bound to the webhook and verifies it is active.
		5. System enqueues a workflow execution job with the received payload as the input context.
		6. System returns a 200 response to the external caller immediately.
		7. Workflow engine dequeues the job and resolves the step graph.
		8. Engine resolves variable references in step parameters using the input context and executes each step.
		9. Engine saves per-step execution results and transitions the run record through its lifecycle states.
		10. Engine updates the run record to a terminal status and emits a run.completed event.
Alternative Flow	Actor	System
		A1 – Invalid HMAC Signature
A1.1 Signature validation fails.
A1.2 System returns a 401 response. No workflow execution is queued.

A2 – Workflow Not Found or Soft-Deleted
A2.1 No active workflow is bound to the webhook configuration.
A2.2 System returns a 410 response and discards the event.
Exceptional Flow	E1 – Job Queue Unavailable
E1.1 Job queue is unavailable at the time of webhook receipt.
E1.2 System returns a 503 response to the caller.
E1.3 The caller is responsible for retry logic; the event is not buffered internally.
Business Rules	1. HMAC signature must be validated before any workflow execution is queued.
2. The webhook receiver returns 200 immediately; execution is asynchronous and must not block the response.
3. The received payload is passed as the full input context to the workflow execution.
4. Each webhook invocation results in at most one workflow execution.
5. If the linked workflow is soft-deleted, the event is discarded and a 410 response is returned.
Related Functional Requirements	FR-WF-05, FR-WF-06, FR-WF-07, FR-WF-08, FR-WF-10, FR-WF-11, FR-WF-12, FR-WEBHOOK-03

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-WH-01
Use Case Name	Outbound Webhook Delivery with Exponential Backoff Retry
Primary Actor	System (Webhook Delivery Service)
Secondary Actors	External Webhook Consumer
System Boundary	Webhook Delivery Service and Background Job Queue
Trigger	A system event occurs (e.g., order.paid, hosting.account.created) that matches a registered webhook subscription.
Preconditions	1. A webhook subscription is registered for the event type being emitted.
2. The registered endpoint URL is reachable or the maximum retry count has not been exhausted.
Postconditions (Success)	1. A delivery log record exists for each delivery attempt with response codes and timestamps.
2. If delivered successfully, the external system has received the signed event payload.
3. If permanently failed, the delivery record reflects the exhausted retry state.
Main Success Flow	Actor	System
	1. A system event is emitted by the originating module.	
		2. Webhook delivery service identifies all active subscriptions registered for the event type.
		3. Service constructs the event payload and signs it using HMAC SHA-256 with the subscription's stored secret.
		4. Service enqueues one delivery job per subscription in the background job queue.
		5. Worker dispatches the signed HTTP POST request to the registered endpoint URL.
		6. Target endpoint returns a 2xx response.
		7. Worker records a successful delivery log entry and marks the job as completed.
Alternative Flow	Actor	System
		A1 – Non-2xx Response
A1.1 Target endpoint returns a non-2xx status code.
A1.2 Worker records a failed delivery attempt log entry and re-enqueues the job with an exponential backoff delay.

A2 – Network Timeout
A2.1 HTTP request times out before receiving a response.
A2.2 Worker records a timeout log entry and re-enqueues with exponential backoff.
Exceptional Flow	E1 – Maximum Retries Exhausted
E1.1 Delivery job has been retried the maximum configured number of times without success.
E1.2 Worker marks the delivery as permanently failed and records a final failure log entry.
E1.3 No further retries are attempted.
Business Rules	1. All outbound webhook payloads must be signed with HMAC SHA-256 using the subscription secret before dispatch.
2. Webhook delivery is asynchronous; the originating API response must not be delayed by delivery.
3. Only a 2xx HTTP response counts as successful delivery; all other codes trigger a retry.
4. Retry intervals follow an exponential backoff strategy; fixed-interval polling is not permitted.
5. Delivery attempts stop after the configured maximum retry count.
6. A structured delivery log entry is saved for every delivery attempt.
Related Functional Requirements	FR-WEBHOOK-01, FR-WEBHOOK-02, FR-WEBHOOK-03, FR-WEBHOOK-04, FR-WEBHOOK-05

────────────────────────────────────────────────────────────────────────

Field	Description
Use Case ID	UC-SRV-01
Use Case Name	Administrator Configures Server Group and Default Provisioning Target
Primary Actor	Administrator
Secondary Actors	Server Control Panel API
System Boundary	Server Management API
Trigger	Administrator creates a server group and assigns servers to it via the server management API.
Preconditions	1. Administrator is authenticated with server management permissions.
2. At least one server has been registered or will be registered during this workflow.
Postconditions (Success)	1. A server group record exists with one or more associated servers.
2. One server is designated as the default provisioning target for the group.
3. Future automated provisioning operations targeting this group select the designated default server.
4. Audit entries exist for group creation, server registration, and default designation.
Main Success Flow	Actor	System
	1. Administrator creates a server group with a name and description.	
		2. System saves the server group record.
	3. Administrator submits server creation requests with connection parameters and control panel type.	
		4. System validates each server's credentials by testing connectivity against the control panel API.
		5. System saves each server record and returns its identifier.
	6. Administrator assigns each server to the group via the group assignment endpoint.	
		7. System saves the group assignment for each server.
	8. Administrator designates one server as the default provisioning target for the group.	
		9. System atomically unsets any prior default and sets the new one within the same database transaction.
		10. Future automated provisioning operations for this group select the designated default server.
Alternative Flow	Actor	System
		A1 – Default Already Designated
A1.1 A default server already exists when a new default designation is submitted.
A1.2 System atomically unsets the prior default and sets the new one in a single transaction.

A2 – Server Not Assigned to Group
A2.1 Administrator attempts to set a default for a group the server is not assigned to.
A2.2 System returns a 422 error.
Exceptional Flow	E1 – Credential Validation Failure at Registration
E1.1 Control panel API rejects the server credentials during registration.
E1.2 System returns a 422 error identifying the connectivity failure.
E1.3 Server record is not saved.
Business Rules	1. Each server group must have exactly one default server; designating a new default automatically unsets the previous one.
2. Maintenance mode does not prevent group assignment but does prevent the server from being selected as a provisioning target.
3. If no default server is designated in a group, automated provisioning targeting that group fails with a configuration error.
4. Server credentials must be validated against the control panel API before the server record is saved.
5. Deletion of a server group is rejected if active provisioned accounts exist on servers within the group.
Related Functional Requirements	FR-SRV-01, FR-SRV-02, FR-SRV-05, FR-SRV-06, FR-SRV-07, FR-SRV-08, FR-SRV-09, FR-SRV-10, FR-SRV-13
