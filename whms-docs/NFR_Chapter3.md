3.5 NON-FUNCTIONAL REQUIREMENTS

3.5.1 Performance

NFR-PERF-01 The system shall return API responses for standard read and list operations within 500 milliseconds under normal operating load conditions, excluding network transmission time.

NFR-PERF-02 The system shall delegate all long-running operations — including backup execution, email dispatch, plugin installation, automation task execution, and server provisioning — to a persistent background job queue, ensuring that the initiating API request returns immediately with a job identifier without waiting for operation completion.

NFR-PERF-03 The system shall enforce pagination on all API endpoints that return collections of records, accepting limit and offset or cursor-based parameters and returning total count metadata within the response envelope.

NFR-PERF-04 The system shall impose a maximum request body size limit of 10 megabytes on all API endpoints to prevent resource exhaustion caused by oversized payloads.

NFR-PERF-05 The system shall assign and propagate a unique request identifier to every inbound API request, attaching it to the response via the x-request-id header to facilitate end-to-end request tracing and latency profiling.

3.5.2 Security

NFR-SEC-01 The system shall hash all user passwords using the bcrypt adaptive hashing algorithm with a minimum cost factor of ten prior to persistence, ensuring that raw credential values are never stored in the data store in recoverable form.

NFR-SEC-02 The system shall issue JWT access tokens with an expiry duration not exceeding fifteen minutes and refresh tokens with an expiry duration not exceeding seven days, enforcing mandatory re-authentication upon token expiry.

NFR-SEC-03 The system shall apply an explicit Cross-Origin Resource Sharing policy, permitting requests only from registered and authorised origin domains and rejecting all others at the HTTP preflight stage.

NFR-SEC-04 The system shall apply rate limiting on all authentication-related API endpoints — including login, password reset, and MFA verification — restricting the number of requests permitted per IP address within a configurable time window.

NFR-SEC-05 The system shall encrypt all sensitive configuration data at rest — including backup storage provider credentials, TOTP secrets, and third-party API keys — using the platform's designated symmetric encryption utility prior to database persistence.

NFR-SEC-06 The system shall validate all inbound API request payloads against a defined schema prior to processing, rejecting non-conforming requests with a structured 400-level error response that identifies the offending fields.

NFR-SEC-07 The system shall sign all outbound webhook payloads using HMAC SHA-256, including the signature in a dedicated request header, enabling receiving endpoints to verify payload integrity and authenticity.

NFR-SEC-08 The system shall enforce IP-based access control rules at the authentication and authorisation middleware layer, evaluating allow-list and deny-list rules against the normalised originating IP address of each inbound request before any processing proceeds.

NFR-SEC-09 The system shall ensure that no sensitive values — including plaintext passwords, raw API keys, encryption keys, or storage provider credentials — are transmitted in any API response, log entry, or error message at any point in the request lifecycle.

3.5.3 Scalability

NFR-SCAL-01 The system shall implement a stateless API architecture in which no session state is retained within the application process, with all authentication and session state persisted exclusively in the database and Redis store, enabling multiple application instances to serve requests interchangeably.

NFR-SCAL-02 The system shall implement background worker processes as logically independent execution units that may be deployed on nodes separate from the API server, communicating exclusively via the job queue interface.

NFR-SCAL-03 The system shall manage all database access through a connection-pooled ORM layer, ensuring that concurrent API requests share a bounded pool of database connections rather than establishing individual connections per request.

NFR-SCAL-04 The system shall organise all functional capabilities into self-contained modules, each encapsulating its own routing, controller, service, and data access layers, such that individual modules may be independently extended or replaced without modification to other modules.

NFR-SCAL-05 The system shall support configurable concurrency within the background job worker, permitting multiple independent jobs to be processed simultaneously without a long-running job blocking the execution of subsequently enqueued jobs.

3.5.4 Reliability and Availability

NFR-REL-01 The system shall execute all operations involving the creation or modification of multiple interdependent records — including order creation with associated invoice generation — within a single atomic database transaction, ensuring that partial completion cannot produce an inconsistent data state.

NFR-REL-02 The system shall persist all background job definitions in the Redis-backed queue store such that enqueued jobs survive application server restarts and are not discarded in the event of an unplanned process termination.

NFR-REL-03 The system shall implement an exponential backoff retry strategy for all failed outbound webhook deliveries, retrying at progressively increasing intervals to recover from transient downstream availability failures without flooding the target endpoint.

NFR-REL-04 The system shall transition provisioning-related order records to an explicit failure status and emit a structured alert event upon encountering a server-side provisioning error, ensuring that no order record remains in an ambiguous intermediate state following a failure.

NFR-REL-05 The system shall validate the structural integrity and manifest compliance of all uploaded plugin archives at the API boundary prior to any file persistence or installation attempt, rejecting non-conforming packages before any partial system state is created.

NFR-REL-06 The system shall enforce referential integrity constraints at the service layer by rejecting deletion requests for records that are actively referenced by dependent entities, returning a structured conflict response that identifies the blocking dependency.

3.5.5 Maintainability

NFR-MAINT-01 The system shall enforce a strict separation between the controller layer and the service layer, with controllers responsible exclusively for request parsing and response serialisation, and all business logic residing within dedicated service components.

NFR-MAINT-02 The system shall define all API request payload validation schemas in dedicated schema definition files, separate from route and controller definitions, and apply them as reusable validation middleware across all mutation endpoints.

NFR-MAINT-03 The system shall manage all environment-specific configuration values — including database connection strings, API credentials, encryption keys, and external service endpoints — exclusively through environment variables, with no hardcoded configuration values present in the application source code.

NFR-MAINT-04 The system shall provide an OpenAPI specification document generated from the application's route definitions, serving as the authoritative and up-to-date reference for all API endpoint contracts, request schemas, and response structures.

NFR-MAINT-05 The system shall register all module routes through a centralised application entry point, ensuring that the complete API surface is discoverable from a single configuration location and that global middleware is applied consistently across all registered routes.

3.5.6 Observability

NFR-OBS-01 The system shall assign a unique correlation identifier to every inbound API request and propagate it throughout the request lifecycle, attaching it to all log entries and error records generated during that request's processing to enable end-to-end traceability.

NFR-OBS-02 The system shall maintain a persistent, structured audit log for all state-modifying operations performed via the API, capturing the actor identity, target resource, operation type, timestamp, and originating IP address for each recorded event.

NFR-OBS-03 The system shall record the complete execution lifecycle of all background jobs — including enqueue time, start time, completion time, execution status, retry count, and structured error output — as persistent records accessible via authenticated API endpoints.

NFR-OBS-04 The system shall emit structured log entries for all unhandled errors and exceptions, including the correlation request identifier, error classification, and contextual metadata, to a persistent log output target using a structured logging library.

NFR-OBS-05 The system shall expose all audit log and operational log records through authenticated API endpoints, enabling authorised operators to query, filter, and retrieve log data programmatically without requiring direct database or filesystem access.

3.5.7 API Design and Interoperability

NFR-API-01 The system shall structure all API responses in a consistent JSON envelope format, distinguishing successful responses from error responses through defined fields and HTTP status codes, with no endpoint deviating from the established response schema.

NFR-API-02 The system shall return structured error responses for all error conditions, including a machine-readable error code, a human-readable message, the applicable HTTP status code, and the request correlation identifier.

NFR-API-03 The system shall implement role-based access control enforcement as a composable middleware layer applied declaratively at the route definition level, ensuring that access requirements are explicit, auditable, and consistently enforced without duplicating authorisation logic within controller implementations.

NFR-API-04 The system shall expose all system capabilities exclusively through RESTful API endpoints, with no system function accessible through direct database manipulation, filesystem operations, or out-of-band mechanisms during normal operation.

NFR-API-05 The system shall expose a machine-readable OpenAPI specification document at a designated API endpoint, providing a self-describing interface contract that enumerates all available endpoints, required parameters, authentication requirements, and response schemas.
