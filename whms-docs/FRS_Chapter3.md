3.4 FUNCTIONAL REQUIREMENTS

3.4.1 Authentication and Session Management

3.4.1.1 User Account Module
FR-AUTH-01 The system shall allow users to register an account by providing an email address and password through a publicly accessible API endpoint.
FR-AUTH-02 The system shall ensure that email addresses are unique in the database, and reject any registration request that uses an already-registered email address with an appropriate error response.
FR-AUTH-03 The system shall automatically assign a default role to newly created user accounts upon successful registration.
FR-AUTH-04 The system shall generate a secure, time-limited email verification token when a new user account is successfully created.
FR-AUTH-05 The system shall send an email verification link to the user's registered email address through a background email service, so that email delivery does not delay the API response.
FR-AUTH-06 The system shall provide a dedicated API endpoint through which users may request a new email verification link, accessible to both authenticated and unauthenticated users.
FR-AUTH-07 The system shall verify email ownership by processing a verification token submitted to the designated API endpoint.
FR-AUTH-08 The system shall update the email verification status of the corresponding user account upon successful token validation.
FR-AUTH-09 The system shall invalidate all previously issued verification tokens for an account once email verification is successfully completed.

3.4.1.2 Authentication and Session Management
FR-AUTH-10 The system shall authenticate users by verifying the email address and password submitted to a designated API endpoint, and return an appropriate error response for invalid credentials.
FR-AUTH-11 The system shall issue signed JWT access tokens and refresh tokens as the only authentication credentials upon successful login.
FR-AUTH-12 The system shall store refresh tokens as session records in the database, allowing them to be revoked and audited.
FR-AUTH-13 The system shall support multiple active sessions per user, where each session represents a different device or client.
FR-AUTH-14 The system shall record the originating IP address and browser user-agent string with each session record at the time it is created.
FR-AUTH-15 The system shall allow users to end their active session by calling a logout API endpoint, which immediately revokes the associated session record.
FR-AUTH-16 The system shall allow authenticated users to revoke individual sessions or all active sessions at once through dedicated API endpoints.
FR-AUTH-17 The system shall provide an authenticated API endpoint that returns the current user's identity, assigned roles, and active session information.

3.4.1.3 Password Management
FR-PASS-01 The system shall allow users to start a password reset by submitting their registered email address to a public API endpoint.
FR-PASS-02 The system shall generate secure, time-limited password reset tokens that cannot be guessed or reused.
FR-PASS-03 The system shall send password reset links to the user's registered email address through a background email service.
FR-PASS-04 The system shall verify that a password reset token is valid and has not expired before allowing the associated password to be changed.
FR-PASS-05 The system shall allow users to set a new password by submitting a valid reset token and their desired new password to the designated API endpoint.
FR-PASS-06 The system shall revoke all active sessions for an account when a password reset is successfully completed.
FR-PASS-07 The system shall record audit log entries for both password reset requests and successful password reset completions.

3.4.1.4 Role-based Profile Management
FR-PROFILE-01 The system shall automatically create a role-specific profile record — covering client, administrator, reseller, and developer profile types — based on the roles assigned to a user account.
FR-PROFILE-02 The system shall maintain separate profile data for each portal type, so that profile attributes remain specific to their context.
FR-PROFILE-03 The system shall expose profile data only through API endpoints, with no user interface logic included in the response format.

3.4.1.5 Administrative and User Management
FR-ADMIN-01 The system shall restrict all administrative API endpoints to users who have the required role and permission assignments, enforced at the API middleware layer.
FR-ADMIN-02 The system shall maintain a dedicated administrative profile record for users assigned administrator roles.
FR-ADMIN-03 The system shall provide administrative API endpoints through which authorised operators can view, search, and manage user account records.
FR-ADMIN-04 The system shall allow administrators to assign and remove roles from user accounts through authenticated API endpoints.
FR-ADMIN-05 The system shall allow administrators to deactivate user accounts through an API endpoint, which suspends platform access without deleting associated records.
FR-ADMIN-06 The system shall allow administrators to revoke all active sessions of a specified user account through a dedicated API endpoint.
FR-ADMIN-07 The system shall check the requesting user's permissions before executing any state-changing administrative operation.

3.4.1.6 Impersonation
FR-IMP-01 The system shall allow authorised administrators to start a user impersonation session by submitting a request to a designated API endpoint.
FR-IMP-02 The system shall require an explicit justification reason as a required field in the impersonation request.
FR-IMP-03 The system shall issue separate access and refresh tokens for impersonation sessions, which are distinct from standard login tokens.
FR-IMP-04 The system shall store impersonation session records separately from regular user sessions, maintaining an independent audit trail.
FR-IMP-05 The system shall include the impersonating administrator's identifier in the request context throughout the duration of an active impersonation session.
FR-IMP-06 The system shall allow administrators operating within an impersonation session to perform API operations on behalf of the impersonated user.
FR-IMP-07 The system shall allow administrators to end an active impersonation session at any time through a designated API endpoint.
FR-IMP-08 The system shall save structured audit records capturing both the start and end of all impersonation sessions.
FR-IMP-09 The system shall expose impersonation session details and status to authorised users through authenticated API endpoints.

3.4.1.7 Multi-factor Authentication (mfa)
FR-MFA-01 The system shall allow users to enrol in multi-factor authentication by calling a designated API endpoint, which returns the required setup information.
FR-MFA-02 The system shall generate TOTP (Time-based One-Time Password) secrets and store them in an encrypted form in the database.
FR-MFA-03 The system shall require an MFA verification step during login for all users who have MFA enabled.
FR-MFA-04 The system shall verify submitted TOTP codes against the stored secret before issuing login tokens to MFA-enabled users.
FR-MFA-05 The system shall generate a set of single-use backup recovery codes when MFA is enabled, allowing users to recover their account if they lose access to their authentication device.
FR-MFA-06 The system shall allow previously trusted devices to skip the MFA challenge, based on a stored device identifier recorded during a prior successful login.

3.4.1.8 Api Key Management
FR-API-01 The system shall allow authenticated users to generate API keys through a designated API endpoint, returning the full key value only at the time of creation.
FR-API-02 The system shall store API keys only in hashed form in the database, so that the original key value cannot be recovered.
FR-API-03 The system shall allow users to attach a specific set of permissions to individual API keys, limiting the operations each key is allowed to perform.
FR-API-04 The system shall authenticate incoming API requests that carry a valid API key, identifying the associated user and their permitted operations for access control checks.
FR-API-05 The system shall allow users to revoke API keys through a designated API endpoint, immediately disabling the key for all subsequent requests.
FR-API-06 The system shall maintain structured audit records for API key creation, usage, and revocation events, including the originating IP address and request timestamp.

3.4.1.9 Role-based Access Control (rbac)
FR-RBAC-01 The system shall load predefined role and permission definitions from a central source at system startup.
FR-RBAC-02 The system shall maintain defined associations between permission identifiers and roles, enabling fine-grained access control.
FR-RBAC-03 The system shall maintain defined associations between roles and user accounts, supporting the assignment of multiple roles to a single user.
FR-RBAC-04 The system shall check the requesting user's roles and permissions against the access requirements of each API endpoint before executing the requested operation.
FR-RBAC-05 The system shall expose the current user's resolved roles and permissions through an authenticated API endpoint, allowing client applications to manage what they display based on the user's access level.

3.4.1.10 Ip Access Control
FR-IP-01 The system shall allow administrators to define IP-based access rules, including allow-list and deny-list entries, through authenticated API endpoints.
FR-IP-02 The system shall support access rule definitions using exact IP addresses, wildcard address patterns, and CIDR subnet notation.
FR-IP-03 The system shall evaluate all applicable IP access rules against the originating request address during authentication and API authorisation.
FR-IP-04 The system shall provide administrative API endpoints to view, update, and delete IP access rule records.

3.4.1.11 Audit Logging
FR-AUDIT-01 The system shall save structured audit records for all authentication attempts, capturing the outcome, timestamp, IP address, and browser user-agent.
FR-AUDIT-02 The system shall maintain audit records for session lifecycle events, including session creation, token refresh, and revocation.
FR-AUDIT-03 The system shall record all impersonation activity in the audit log, including the identity of the administrator, the target user, and the session duration.
FR-AUDIT-04 The system shall create audit entries for password reset requests, completions, and email verification events.
FR-AUDIT-05 The system shall record all administrative changes to role assignments and permission settings in the audit log.

3.4.1.12 Webhooks
FR-WEBHOOK-01 The system shall send structured webhook event payloads for authentication and security-related activities when they occur.
FR-WEBHOOK-02 The system shall deliver webhook events asynchronously through a background service, so that webhook delivery does not delay the API response.
FR-WEBHOOK-03 The system shall sign all outgoing webhook payloads using HMAC SHA-256, allowing the receiving system to verify that the payload has not been altered.
FR-WEBHOOK-04 The system shall retry failed webhook deliveries using an exponential backoff strategy, for cases where the recipient endpoint returns an error or is temporarily unavailable.
FR-WEBHOOK-05 The system shall store structured delivery log records for all webhook delivery attempts, including response codes, timestamps, and retry history.

3.4.2 Automation Module

FR-AUTO-01 The system shall provide RESTful API endpoints for full CRUD operations on automation profiles, each containing scheduling settings, execution context, and lifecycle metadata.
FR-AUTO-02 The system shall accept standard cron expression syntax submitted through the API to create and register scheduled execution triggers in the task scheduler.
FR-AUTO-03 The system shall provide API endpoints to enable or disable automation profiles, applying the change to the active scheduler at runtime without requiring a system restart.
FR-AUTO-04 The system shall provide RESTful API endpoints to manage automation tasks within a profile, allowing tasks to be created, retrieved, updated, and deleted.
FR-AUTO-05 The system shall determine task execution order within a profile based on a user-defined ordering value submitted through the API.
FR-AUTO-06 The system shall provide API endpoints to trigger the immediate execution of a full automation profile or a single task on demand, returning a run identifier for tracking the result.
FR-AUTO-07 The system shall send all automation task executions to a background job queue, so that the API response is returned immediately without waiting for task completion.
FR-AUTO-08 The system shall maintain a set of built-in automation action types — including HTTP request dispatch and notification actions — accessible through a unified interface via the API.
FR-AUTO-09 The system shall support calling plugin-defined action handlers through a standard interface, allowing external plugins to add new execution logic to the automation engine.
FR-AUTO-10 The system shall record and expose the full execution history of each automation run — including status changes, timestamps, and output data — as stored records accessible through the API.
FR-AUTO-11 The system shall process automation jobs through an independent worker model that isolates faults between concurrent runs and supports horizontal scaling.
FR-AUTO-12 The system shall generate structured audit log entries for all automation operations, including profile changes and task execution failures, enriched with actor identity, IP address, and request correlation metadata.
FR-AUTO-13 The system shall assign a unique identifier to each automation execution error to support precise log tracing.
FR-AUTO-14 The system shall validate all incoming API request data before saving or executing it, returning structured error responses for invalid input.
FR-AUTO-15 The system shall capture and store execution environment metadata — including worker identification and retry count — for each job processed by the automation worker.
FR-AUTO-16 The system shall allow external plugins to register custom action handlers and storage adapters with the automation service at runtime, extending its capabilities without modifying the core system.
FR-AUTO-17 The system shall forward internal execution lifecycle events — such as job completion and failure — to the audit system and notification engine to allow follow-up workflows to be triggered.
FR-AUTO-18 The system shall expose all automation capabilities exclusively through RESTful API endpoints, with no user interface logic embedded within the module.

3.4.3 Plugin Module

3.4.3.1 Plugin Submission and Versioning
FR-PLG-01 The system shall allow authenticated developers to submit new plugin entries by providing metadata — including name, description, category, and pricing model — through a designated RESTful API endpoint.
FR-PLG-02 The system shall assign a draft status to all newly submitted plugins, keeping them in a pending state and not visible to the public until an administrator approves them.
FR-PLG-03 The system shall allow developers to submit new plugin versions independently from updates to the plugin's main metadata record.
FR-PLG-04 The system shall only accept plugin packages in ZIP archive format that conform to the platform's defined manifest structure, rejecting all other formats at the API level.
FR-PLG-05 The system shall check the internal structure and manifest of an uploaded plugin archive before saving it, returning a structured error response for any non-conforming submission.

3.4.3.2 Plugin Asset Management
FR-PLG-06 The system shall provide separate API endpoints for uploading plugin icon images and screenshot assets, independent from the plugin archive submission process.
FR-PLG-07 The system shall allow developers to update the pricing configuration of an existing plugin through a dedicated API endpoint, without needing to resubmit the plugin archive.
FR-PLG-08 The system shall provide an authenticated API endpoint for developers to view aggregated analytics for their published plugins, including install count, revenue summary, and rating distribution.
FR-PLG-09 The system shall allow developers to view and update their public developer profile through authenticated API endpoints, returning only profile data with no user interface attributes included.

3.4.3.3 Plugin Installation and Lifecycle
FR-PLG-10 The system shall provide a synchronous API endpoint to install a plugin, completing package extraction, route registration, and configuration storage within a single API transaction.
FR-PLG-11 The system shall provide an asynchronous installation API endpoint that adds the installation job to a queue and immediately returns a job identifier, without waiting for installation to complete.
FR-PLG-12 The system shall provide a job status endpoint that allows callers to check the current state and outcome of a queued installation job.
FR-PLG-13 The system shall provide a Server-Sent Events (SSE) endpoint to stream real-time installation progress updates to connected API clients.
FR-PLG-14 The system shall provide an API endpoint to check whether a newer approved version of an installed plugin is available, returning version comparison details.
FR-PLG-15 The system shall provide an update API endpoint that installs the latest approved version of a plugin while preserving all existing plugin configuration data.

3.4.4 Workflows Module

3.4.4.1 Workflow Definition and Management
FR-WF-01 The system shall provide RESTful API endpoints for full CRUD operations on workflow definitions, including step structure, inter-step variable bindings, and trigger rule settings.
FR-WF-02 The system shall allow workflow definitions to be retrieved by either their unique system identifier or a human-readable slug through dedicated API endpoints.
FR-WF-03 The system shall support soft deletion of workflow definitions and provide a restore API endpoint to recover a previously deleted workflow record.
FR-WF-04 The system shall provide a workflow validation API endpoint that checks a submitted step structure for errors without saving it to the database.
FR-WF-05 The system shall resolve and substitute variable references within workflow step input parameters at the time of execution, using the context data available at runtime.

3.4.4.2 Workflow Execution
FR-WF-06 The system shall provide an API endpoint to immediately execute a workflow definition, accepting an optional input payload and returning a unique run identifier for status tracking.
FR-WF-07 The system shall send workflow step execution to a background job queue, so that the API endpoint returns immediately without waiting for the execution to finish.
FR-WF-08 The system shall store execution records for each workflow run, capturing the overall run status and the result of each individual step, which can be retrieved through the API.
FR-WF-09 The system shall provide API endpoints to retrieve the execution history of a workflow and summary statistics including success rate, failure rate, and average execution duration.

3.4.4.3 Triggers and Webhooks
FR-WF-10 The system shall allow trigger rules to be registered against workflow definitions through an API endpoint, linking named system event types to workflow execution with optional filter conditions.
FR-WF-11 The system shall provide API endpoints to create, list, and delete inbound webhook endpoint configurations that are linked to specific workflow definitions.
FR-WF-12 The system shall provide a publicly accessible webhook receiver endpoint that accepts incoming HTTP payloads, verifies them against the registered webhook configuration, and starts the associated workflow with the received payload as input.

3.4.5 Marketplace Module

3.4.5.1 Catalog and Discovery
FR-MKT-01 The system shall provide a publicly accessible API endpoint to list available marketplace plugins, supporting filtering by category, pricing model, and rating.
FR-MKT-02 The system shall provide a publicly accessible API endpoint to retrieve the full details of a marketplace plugin by its slug, including version history, media assets, and pricing information.
FR-MKT-03 The system shall provide public API endpoints to retrieve plugin rankings sorted by total install count and by average rating.
FR-MKT-04 The system shall provide an API endpoint to retrieve computed statistics for a specified plugin, including total install count, average rating, and review count.

3.4.5.2 Ratings and Reviews
FR-MKT-05 The system shall allow authenticated users to submit a numerical rating and optional text review for a marketplace plugin through a designated API endpoint.
FR-MKT-06 The system shall enforce a limit of one review per user per plugin, updating the existing review record when the same user submits a new review for the same plugin.
FR-MKT-07 The system shall provide authenticated administrative API endpoints to list all marketplace reviews and delete individual reviews that violate the platform's content policy.

3.4.5.3 Purchase and Access Control
FR-MKT-08 The system shall require a confirmed purchase record before allowing a paid plugin to be installed.
FR-MKT-09 The system shall provide an API endpoint to record a marketplace plugin purchase, linking the purchase to the authenticated user's account.

3.4.5.4 Administrative Moderation
FR-MKT-10 The system shall provide an authenticated administrative API endpoint to list all plugin version submissions that are currently awaiting review.
FR-MKT-11 The system shall provide an administrative API endpoint to approve a submitted plugin version, changing its status to approved and making it publicly visible in the marketplace catalog.
FR-MKT-12 The system shall provide an administrative API endpoint to reject a submitted plugin version, requiring a rejection reason to be provided and automatically notifying the submitting developer.

3.4.6 System Backup

3.4.6.1 Storage Configuration
FR-BAK-01 The system shall provide RESTful API endpoints to create, retrieve, update, and delete backup storage configuration records, supporting S3-compatible, FTP, and SFTP storage providers.
FR-BAK-02 The system shall encrypt all storage provider credentials using the platform's encryption utility before saving them, ensuring credentials are never stored in plaintext.
FR-BAK-03 The system shall provide an API endpoint to test connectivity to a storage configuration, returning a structured result without modifying any saved configuration record.
FR-BAK-04 The system shall reject deletion requests for storage configuration records that are currently used by existing backup records or scheduled backup operations, returning a structured conflict error response.
FR-BAK-05 The system shall remove all sensitive credential fields from storage configuration records in API responses, ensuring credential values are not returned after the initial submission.

3.4.6.2 Backup Operations
FR-BAK-06 The system shall provide an API endpoint to queue an on-demand backup job, accepting a backup type (full, files, or config), a storage configuration identifier, and a target resource specification.
FR-BAK-07 The system shall execute all backup jobs asynchronously through a background job queue, so that backup initiation requests return immediately without waiting for the job to finish.
FR-BAK-08 The system shall provide API endpoints to list backup records and retrieve details for individual backup entries, including execution logs, archive size, and storage destination.
FR-BAK-09 The system shall provide an API endpoint to generate a time-limited, pre-signed download URL for a completed backup archive, so that storage credentials are not exposed to the requesting user.
FR-BAK-10 The system shall support initiating restore operations through an API endpoint, running the restore process in the background and providing a status endpoint for the caller to check on progress.

3.4.6.3 Retention and Analytics
FR-BAK-11 The system shall apply configurable retention policies per storage configuration, automatically removing backup records that exceed the defined age or count thresholds.
FR-BAK-12 The system shall provide an API endpoint to retrieve aggregated statistics for the backup system, including total backup count, total storage used, and success and failure rates.
FR-BAK-13 The system shall provide an API endpoint to retrieve time-series backup analytics data, showing backup size and frequency over time for use in reporting and capacity planning.

3.4.7 Domain Management

3.4.7.1 Registrar Configuration
FR-DOM-01 The system shall provide authenticated API endpoints to configure the active domain registrar integration, accepting a provider type and encrypted API credentials.
FR-DOM-02 The system shall provide an API endpoint to test registrar API credentials and verify connectivity to the registrar service, without modifying any saved configuration.
FR-DOM-03 The system shall hide all registrar API credential values from configuration API responses, returning only non-sensitive metadata fields.

3.4.7.2 Domain Discovery and Registration
FR-DOM-04 The system shall provide a publicly accessible API endpoint to check domain name availability across one or more TLDs, returning availability status and registration pricing per TLD.
FR-DOM-05 The system shall provide an API endpoint to perform WHOIS lookups through the configured registrar, returning structured registrant, contact, and expiry data.
FR-DOM-06 The system shall provide an API endpoint to register a domain, generating and saving an associated invoice before sending the registration request to the registrar API.
FR-DOM-07 The system shall provide an API endpoint to initiate a domain transfer by accepting an EPP authorisation code, creating a transfer record in a pending state and submitting the request to the registrar.
FR-DOM-08 The system shall update the domain transfer record status to active or failed based on the response received from the registrar, and update the local domain record accordingly.

3.4.7.3 Domain Lifecycle Management
FR-DOM-09 The system shall provide authenticated API endpoints for clients to list their domains, view individual domain records, submit renewal requests, and update nameserver assignments.
FR-DOM-10 The system shall provide an administrative API endpoint to list all domain records across all client accounts, with filtering and cursor-based pagination support.
FR-DOM-11 The system shall provide an administrative API endpoint to retrieve all domain records whose expiry date falls within a configurable advance notice threshold, to support proactive renewal management.
FR-DOM-12 The system shall provide administrative API endpoints to override domain record fields, synchronise the local record against the registrar's current data, and perform soft deletion of domain records.
FR-DOM-13 The system shall record a log entry for each state-changing operation performed on a domain record and expose the log through an authenticated administrative API endpoint.

3.4.7.4 Dns Management
FR-DOM-14 The system shall provide authenticated API endpoints to create, retrieve, update, and delete DNS records for a domain, sending all changes through the configured registrar API.
FR-DOM-15 The system shall update the locally stored DNS record state to match the registrar-confirmed result after each create, update, or delete operation.

3.4.8 Clients

3.4.8.1 Client Account Management
FR-CLI-01 The system shall provide an administrative API endpoint to create client accounts, automatically creating an associated client profile and sending a welcome email through the background email service.
FR-CLI-02 The system shall provide an administrative API endpoint to retrieve a paginated, filterable list of client accounts, with filter options for status, registration date, and search terms.
FR-CLI-03 The system shall provide an administrative API endpoint to retrieve a full client account view, including profile details, order summary statistics, and invoice summary data.
FR-CLI-04 The system shall provide an administrative API endpoint to update client profile information — including personal details, organisation, address fields, and custom metadata — through a structured update request.
FR-CLI-05 The system shall provide an administrative API endpoint that returns aggregated client account statistics, broken down by account status and registration date range.

3.4.8.2 Client Lifecycle Operations
FR-CLI-06 The system shall provide administrative API endpoints to activate and deactivate client accounts, changing their access rights without deleting associated historical records.
FR-CLI-07 The system shall provide an administrative API endpoint to revoke all active sessions for a specified client account, immediately ending all active sessions.
FR-CLI-08 The system shall provide an administrative API endpoint to trigger a client password reset, sending the reset link by email without including the new password value in the API response.

3.4.8.3 Access Control and Data Scoping
FR-CLI-09 The system shall restrict all client-facing API endpoints to return only records that belong to the authenticated user.
FR-CLI-10 The system shall provide an administrative API endpoint to start a client impersonation session, enforcing explicit authorisation and recording an audit entry with the administrator's identity, the target client, and the session timestamp.
FR-CLI-11 The system shall enforce role-based access control on all administrative client management operations, requiring a dedicated impersonation permission that is separate from the standard staff role assignment.
FR-CLI-12 The system shall preserve all historical records associated with a deactivated client account — including orders, invoices, and support tickets — and prevent them from being deleted when the account is deactivated.

3.4.9 Services

3.4.9.1 Service Groups
FR-SVC-01 The system shall provide RESTful API endpoints to create, retrieve, update, and delete service group records, which serve as logical categories within the product catalog.
FR-SVC-02 The system shall provide API endpoints to set the display order of service groups and to toggle the public catalog visibility of individual groups independently of their associated services.

3.4.9.2 Service Management
FR-SVC-03 The system shall provide RESTful API endpoints to create, retrieve, update, and soft-deactivate service records within a designated service group.
FR-SVC-04 The system shall reject deletion requests for service records that are linked to one or more active order records, returning a conflict error response that identifies the dependency.
FR-SVC-05 The system shall provide API endpoints for bulk operations on service records, including changing the status of multiple services and deleting multiple records at once using arrays of identifiers.
FR-SVC-06 The system shall provide API endpoints to export service catalog definitions to a portable format and to import such definitions from external sources.

3.4.9.3 Plans and Pricing
FR-SVC-07 The system shall provide RESTful API endpoints to create, retrieve, update, and manage the availability status of service plans associated with a parent service.
FR-SVC-08 The system shall provide API endpoints to define and manage multiple pricing entries per service plan, each representing a different combination of billing period and currency.
FR-SVC-09 The system shall prevent orders from being created for a service plan that has no active pricing entries, returning an appropriate precondition error response.
FR-SVC-10 The system shall provide a pricing comparison API endpoint that returns a pricing matrix for a given service, enabling comparison across billing periods and plan tiers.

3.4.9.4 Features and Add-ons
FR-SVC-11 The system shall provide API endpoints to create, update, and delete service feature definitions and to assign feature values to individual service plans.
FR-SVC-12 The system shall provide a feature comparison API endpoint that returns the resolved feature values for all plans within a service, structured for tabular display by client applications.
FR-SVC-13 The system shall provide API endpoints to create, update, and manage purchasable service add-ons, including configuring their availability per plan and associated pricing entries.

3.4.9.5 Client Catalog
FR-SVC-14 The system shall restrict the client-facing service catalog API to return only active and publicly visible services and plans, excluding all administratively hidden or deactivated entries.
FR-SVC-15 The system shall provide API endpoints for cross-sell service suggestions and upgrade path definitions, returning structured relationship data with no user interface attributes embedded in the response.

3.4.10 Orders

3.4.10.1 Order Creation and Retrieval
FR-ORD-01 The system shall provide an authenticated API endpoint for clients to create service orders by submitting a plan identifier, selected add-on identifiers, and responses to any applicable custom fields.
FR-ORD-02 The system shall verify that the specified plan is available and active before saving the order, returning an appropriate error response if the plan does not meet ordering requirements.
FR-ORD-03 The system shall generate and save an associated invoice record at the time of order creation, within the same database operation, before returning the order response to the client.
FR-ORD-04 The system shall provide authenticated API endpoints for clients to retrieve a paginated list of their orders and the details of individual order entries, with all responses restricted to the authenticated user's account.
FR-ORD-05 The system shall provide an API endpoint to retrieve the full details of a specified order's add-on selections, including the price of each add-on at the time the order was created.
FR-ORD-06 The system shall provide an API endpoint that returns the authenticated client's total lifetime spending and spending within the current billing period.

3.4.10.2 Order Lifecycle
FR-ORD-07 The system shall provide an authenticated API endpoint for clients to submit a cancellation request for an order, updating the order status according to the platform's cancellation policy.
FR-ORD-08 The system shall provide an authenticated API endpoint for clients to manually renew an order, generating a corresponding renewal invoice record.
FR-ORD-09 The system shall emit an order.cancelled system event when an order is cancelled, making it available for the Automation and Provisioning modules to act on.
FR-ORD-10 The system shall emit an order.paid system event when an invoice is confirmed as paid, triggering downstream provisioning workflows without requiring any manual administrator action.

3.4.10.3 Administrative Order Management
FR-ORD-11 The system shall provide administrative API endpoints to list all order records across all client accounts, with filtering by order status, client identifier, service identifier, and date range.
FR-ORD-12 The system shall provide administrative API endpoints to override order status, billing cycle settings, and next renewal date, and to perform privileged cancellation or renewal operations on behalf of any client account.

3.4.11 Provisioning

3.4.11.1 Client Account Access
FR-PRV-01 The system shall provide authenticated API endpoints for clients to list their provisioned hosting accounts and view resource usage statistics per account.
FR-PRV-02 The system shall provide an authenticated API endpoint for clients to retrieve the hosting account associated with a specified order identifier.
FR-PRV-03 The system shall provide authenticated API endpoints for clients to request the addition of domain entries and email accounts within their hosting account through the server control panel API.

3.4.11.2 Administrative Provisioning Operations
FR-PRV-04 The system shall provide administrative API endpoints to list all provisioned hosting accounts across all clients and registered servers, with pagination support.
FR-PRV-05 The system shall provide an administrative API endpoint to manually create a hosting account for a specified order, selecting a target server according to the configured server group rules before calling the control panel API.
FR-PRV-06 The system shall update the associated order record to a provisioning_failed status and emit a structured alert event if the server-side account creation request returns an error, ensuring no order record is left in an unclear intermediate state.
FR-PRV-07 The system shall provide administrative API endpoints to suspend and restore hosting accounts on the target server, keeping all account data and configuration intact throughout the suspension.
FR-PRV-08 The system shall provide an administrative API endpoint to synchronise resource usage statistics for a specified hosting account from the server to the local database record.
FR-PRV-09 The system shall provide an administrative API endpoint to start a batch synchronisation of all hosting account records as a background job, ensuring no existing local data is incorrectly overwritten during the process.

3.4.11.3 Automation and Security
FR-PRV-10 The system shall automatically start hosting account provisioning when an order.paid event is received, without requiring any manual administrator action.
FR-PRV-11 The system shall ensure that no server credentials, control panel API keys, or internal provisioning configuration values are returned through any client-facing API endpoint.
FR-PRV-12 The system shall expose all provisioning capabilities exclusively through RESTful API endpoints, with no user interface logic embedded within the provisioning module.

3.4.12 Server Management

3.4.12.1 Server Registry
FR-SRV-01 The system shall provide RESTful API endpoints to create, retrieve, update, and delete server records, each containing connection parameters, server type classification, and capacity configuration.
FR-SRV-02 The system shall provide an authenticated API endpoint to test connectivity to a registered server, returning a diagnostic result without modifying the server record or its operational state.
FR-SRV-03 The system shall provide an authenticated API endpoint to retrieve current resource usage metrics for a specified server, including CPU load, memory usage, and storage usage.
FR-SRV-04 The system shall provide an authenticated API endpoint to retrieve historical resource usage metrics for a server over a specified time range, supporting analysis of server performance over time.
FR-SRV-05 The system shall provide an authenticated API endpoint to put a server into or out of maintenance mode, which prevents the server from being selected as a provisioning target during the maintenance window.
FR-SRV-06 The system shall provide an authenticated API endpoint to retrieve the capability profile of a registered server, listing its supported features and declared resource capacity limits.
FR-SRV-07 The system shall provide an authenticated API endpoint returning an overview of the entire server estate, including per-server account counts and combined resource usage summaries.

3.4.12.2 Server Groups
FR-SRV-08 The system shall provide RESTful API endpoints to create, retrieve, update, and delete server group records, which serve as logical provisioning pools to which servers are assigned.
FR-SRV-09 The system shall provide an authenticated API endpoint to assign a registered server to a designated server group.
FR-SRV-10 The system shall provide an authenticated API endpoint to set a specific server as the default provisioning target within its group, which will be selected during automated provisioning target resolution.

3.4.12.3 Server Accounts and Logs
FR-SRV-11 The system shall provide authenticated API endpoints to list and create managed hosting accounts on a specified server, and to retrieve per-account resource usage data and update resource quota allocations.
FR-SRV-12 The system shall provide authenticated API endpoints to suspend and delete managed hosting accounts on a server by sending the corresponding instructions to the server's control panel API.
FR-SRV-13 The system shall provide authenticated API endpoints to retrieve server-level provisioning log records and a chronological activity timeline for each registered server.

3.4.12.4 Provisioning Queue
FR-SRV-14 The system shall provide administrative API endpoints to list all provisioning queue jobs and retrieve the details of individual jobs, including execution status, target server assignment, and structured error information.
FR-SRV-15 The system shall provide an administrative API endpoint to retry a failed provisioning job, ensuring the retry operation does not result in duplicate order or hosting account records being created.
