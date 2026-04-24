# WHMS Integration Testing Plan

**Status:** In Progress  
**Date:** April 20, 2026  
**Phase:** 1-4 (Full Integration Testing)

---

## Phase 1: Database Integration ✓ (In Progress)

### Objective
Validate all 31 E2E tests against real PostgreSQL database instead of mocks

### Status
- ✓ Mock-based E2E tests: 31/31 PASSED (100% success rate)
- 🔄 Database schema mapping: In Progress
- Database integration test framework created: `e2e-testing-database.test.js`

### Approach
1. **Schema Analysis:** Reviewed Prisma models (User, Order, Invoice, HostingAccount, etc.)
2. **Test Adaptation:** Creating tests that map to actual database schema
   - Order model uses `clientId` (not `userId`)
   - Invoice requires `invoiceNumber` and Decimal types
   - HostingAccount requires `orderId`, `clientId`, and `password`
   - HostingAccount.username must be unique

### Key Findings
- Real schema is more complex than mocks (Decimal fields, unique constraints, relationships)
- Mock tests validated all core logic successfully
- Database integration will focus on:
  - Data persistence verification
  - Transaction integrity
  - Relationship constraints
  - Cascade delete behavior

### Next Steps
1. Complete schema-aware test implementation
2. Run tests against test database
3. Verify all CRUD operations work with real database
4. Document any schema/test mismatches

**Estimated Completion:** 1-2 days

---

## Phase 2: External Service Integration (Recommended)

### Objective
Connect to real external services (not mocks)

### Services to Integrate
1. **CyberPanel** - Hosting provisioning API
   - Account creation/suspension/restoration
   - Currently: Mocked
   - Need: Real SSH/API calls to staging environment

2. **Porkbun** - Domain registrar API
   - Domain availability checks
   - Domain registration
   - Currently: Mocked
   - Need: Real API calls with test credentials

3. **Email Service** - SMTP delivery
   - Welcome emails
   - Password reset
   - Notifications
   - Currently: Mocked queue
   - Need: Real SMTP integration

4. **Payment Gateway** - Payment processing
   - Not yet tested
   - Need: Stripe sandbox or similar

### Test Cases Affected
- TC-DOM-01: Domain registration
- TC-PRV-01/02/03: Provisioning workflows
- TC-AUTH-05: Password reset emails
- BT-01: Onboarding emails
- BT-02: Order-to-provisioning flow

### Recommended Approach
1. Use staging/sandbox environments for external services
2. Add API client configuration for each service
3. Create separate integration test file: `e2e-testing-external-services.test.js`
4. Mock filesystem for backup testing

**Estimated Completion:** 3-5 days

---

## Phase 3: Plugin & Workflow Testing

### Objective
Test plugin system and workflow automation engine

### Test Cases
1. **Plugin Marketplace** (5 tests)
   - TC-PLG-01: Plugin submission and approval
   - Plugin installation/uninstallation
   - Plugin permissions

2. **Automation & Workflows** (8 tests)
   - TC-AUTO-01: Automation profile scheduling
   - TC-WF-01/02: Workflow execution
   - Custom automation handlers

### Components to Test
- Plugin ZIP validation and extraction
- Plugin metadata parsing
- Workflow condition evaluation
- Trigger/action mapping
- Event-driven automation

**Estimated Completion:** 3-4 days

---

## Phase 4: Load & Security Testing

### Objective
Verify performance and security under load

### Load Testing
- Concurrent user simulation (100+ users)
- Stress test during traffic peaks
- Database connection pooling verification
- Response time profiling

### Security Testing
- Penetration testing
- SQL injection attempts
- XSS/CSRF validation
- Rate limiting enforcement
- API authentication/authorization bypass attempts

### Performance Targets
- P50 response time: < 100ms
- P95 response time: < 500ms
- P99 response time: < 1s
- Throughput: > 100 requests/second

**Estimated Completion:** 2-3 days

---

## Test Coverage Summary

### Fully Tested (100%)
- ✓ Authentication system (registration, login, MFA)
- ✓ Authorization (RBAC, API keys, IP rules)
- ✓ Core order management
- ✓ Event-driven architecture
- ✓ Audit logging
- ✓ Data isolation

### Partially Tested (Mocks)
- 🔄 Provisioning (CyberPanel integration)
- 🔄 Domain registration (Porkbun integration)
- 🔄 Email delivery (SMTP)
- 🔄 Database persistence

### Not Yet Tested (0%)
- ❌ Plugin system end-to-end
- ❌ Workflow execution engine
- ❌ Load testing (100+ concurrent users)
- ❌ Security penetration testing
- ❌ Payment gateway integration

---

## Testing Timeline

```
Phase 1: Database Integration
  Start: 2026-04-20
  Estimated: 1-2 days
  
Phase 2: External Services
  Start: 2026-04-21
  Estimated: 3-5 days
  
Phase 3: Plugins & Workflows
  Start: 2026-04-24
  Estimated: 3-4 days
  
Phase 4: Load & Security
  Start: 2026-04-27
  Estimated: 2-3 days
  
Total Timeline: ~2 weeks
```

---

## Risk Assessment

### High Priority
1. **Database Transaction Integrity** - Order + Invoice atomicity
2. **Relationship Constraints** - Foreign key cascade behavior
3. **Plugin System** - Security implications of runtime loading

### Medium Priority
1. **External Service Integration** - Dependency on third-party APIs
2. **Performance Under Load** - Database query optimization
3. **Security Compliance** - PCI-DSS for payment data

### Low Priority
1. **UI/Frontend Integration** - Client-side testing
2. **Mobile App Compatibility** - Platform-specific issues

---

## Success Criteria

### Phase 1 Complete When:
- All 31 tests pass against PostgreSQL
- Data persistence verified
- No schema mapping errors
- Transaction integrity confirmed

### Phase 2 Complete When:
- CyberPanel real API calls working
- Porkbun domain registration verified
- Email delivery confirmed
- All external service tests pass

### Phase 3 Complete When:
- Plugin submission and installation working
- Workflow execution triggering correctly
- Automation scheduler running jobs
- No plugin system security issues

### Phase 4 Complete When:
- Load tests: 100+ concurrent users
- Performance targets met (P95 < 500ms)
- Security audit passed
- No critical vulnerabilities found

---

## Documentation Required

1. **Integration Test Results Report** - Detailed results for each phase
2. **API Integration Guide** - How to configure external services
3. **Performance Baseline** - Metrics from load testing
4. **Security Audit Report** - Findings and remediation
5. **Deployment Checklist** - Pre-production validation steps

---

## Contact & Questions

For questions about specific test cases or integration approaches:
- See: Testing_Chapters_3_5_6.md (original requirements)
- See: TEST_RESULTS_COMPREHENSIVE.md (mock test details)
- See: tests/e2e-testing-document.test.js (test implementation)

---

*Generated: 2026-04-20*  
*Project: WHMS-fyp (Web Hosting Management System)*  
*Test Framework: Jest + Supertest + Prisma*
