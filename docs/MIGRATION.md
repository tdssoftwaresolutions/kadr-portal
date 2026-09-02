# Enterprise Migration & Modernization — Node.js + Vue 2 → Spring Boot + Angular

Do not blindly rewrite the application. Preserve existing functionality and business rules unless there is a clear architectural/security reason to change them.

---

# 1. BUSINESS CONTEXT

This is a mediation platform used by customers and internal users.

The existing platform contains three primary layers:

### Layer 1 — Public Website

The current application contains a static/public website with:

* Landing/home pages
* Company/service information
* Dynamically generated content
* Blog pages
* SEO-oriented pages
* Contact forms
* Server-controlled content such as:

  * phone numbers
  * email addresses
  * company information
  * other configurable website content

The public website needs to remain **SEO-friendly**.

Blog URLs/pages must be server-renderable/indexable by search engines.

---

### Layer 2 — Authenticated Vue 2 Application

The current Vue 2 application contains the main business application, including functionality such as:

* User registration/signup
* Login/logout
* Authentication
* Role-based access control
* User management
* Dashboard
* Case management
* Creating/managing cases
* Working on cases
* Mediation workflows
* Payments/payment gateway integration
* Document management
* Upload/download documents
* User profile
* Administrative functionality
* Other existing business functionality discovered during codebase analysis

The current compiled frontend is deployed from the `dist` directory.

---

### Layer 3 — Node.js Backend

The Node.js application currently provides:

* REST/API endpoints
* Authentication
* Authorization
* Business logic
* Database access
* Payment integration
* Document management
* Email functionality
* Website content handling
* Contact form processing
* Other integrations

The database is MySQL.

---

# 2. CURRENT INFRASTRUCTURE

Current/available infrastructure:

* AWS EC2
* AWS S3 bucket
* MySQL
* Docker is available/desired for deployment

There is **NO Redis**.

Do not introduce Redis.

Do not introduce technologies that require additional paid licenses unless explicitly approved.

---

# 3. TARGET ARCHITECTURE

The target system must be a:

## MODULAR MONOLITH

This is extremely important.

We deliberately do NOT want microservices.

The entire backend should be:

```text
ONE Spring Boot application
        |
        +-- Authentication
        +-- Users
        +-- Cases
        +-- Mediation
        +-- Documents
        +-- Payments
        +-- Notifications
        +-- Website
        +-- Blogs
        +-- Contact
        +-- Administration
        +-- Audit
```

All of this must remain one deployable application.

The application must be designed so it can initially run as:

```text
AWS EC2
   |
Docker
   |
Spring Boot application
```

Do not create separate backend services unless absolutely unavoidable.

Do not introduce microservices.

Do not introduce Kubernetes unless explicitly requested.

Do not introduce Kafka unless explicitly requested.

Do not introduce Redis.

---

# 4. TARGET TECHNOLOGY STACK

## Backend

Use:

* Java 21 or Java 25 LTS
* Spring Boot
* Spring MVC
* Spring Security
* Spring Data JPA
* Hibernate
* Jakarta Bean Validation
* Maven
* Flyway
* JUnit 5
* Mockito
* Testcontainers
* OpenAPI

Use the latest stable Spring Boot version compatible with the selected LTS Java version.

Do not use deprecated Spring Boot patterns.

Do not use legacy Java EE namespaces.

Use Jakarta namespaces.

---

# 5. FRONTEND

Replace Vue 2 with:

* Modern Angular
* TypeScript
* Angular standalone components
* Angular Signals where appropriate
* RxJS where appropriate
* Angular Router
* Angular HttpClient
* Angular reactive forms
* Angular Material or another mature enterprise-grade component system

Do NOT use AngularJS.

AngularJS is not acceptable.

Use modern Angular architecture and current supported APIs.

Avoid unnecessary third-party dependencies.

Every dependency added must have a clear reason.

---

# 6. MOBILE ARCHITECTURE

The authenticated Angular application must be designed so that it can later be packaged for:

* Android
* iOS

using:

* Ionic
* Capacitor

However:

## DO NOT make Ionic mandatory for the initial web migration.

The initial target is the Angular web application.

The architecture must nevertheless avoid coupling business logic directly to browser-specific APIs.

Create appropriate abstraction boundaries for future mobile functionality.

For example:

```text
FileService
NotificationService
StorageService
CameraService
BiometricService
LocationService
```

The initial implementations may use web/browser functionality.

Later they can be implemented using Capacitor/native functionality.

Do not scatter Capacitor-specific code throughout business components.

---

# 7. PUBLIC WEBSITE ARCHITECTURE

The public website is different from the authenticated Angular application.

Do NOT blindly convert the SEO/public website into a client-side Angular SPA.

The public website has important SEO requirements.

Use:

## Spring Boot + server-side rendering

Prefer Thymeleaf for the public website unless the existing code analysis demonstrates a strong reason for another server-rendering approach.

The Spring Boot application should therefore serve:

```text
Public Website
        |
        +-- Home
        +-- About
        +-- Services
        +-- Contact
        +-- Blogs
        +-- SEO pages
```

while also serving:

```text
REST API
        |
        +-- Authentication
        +-- Users
        +-- Cases
        +-- Payments
        +-- Documents
        +-- Mediation
        +-- Administration
```

The authenticated Angular application should consume these APIs.

---

# 8. ONE DEPLOYABLE APPLICATION

The desired deployment model is:

```text
AWS EC2
   |
Docker
   |
ONE Spring Boot application
```

The Angular production build should be packaged/served as part of the same deployable application where practical.

The public server-rendered website should also be served by the same Spring Boot application.

The final deployment should not require:

```text
Node.js server
Vue server
separate API server
separate website server
separate mobile backend
```

unless codebase analysis reveals a genuine unavoidable requirement.

The goal is one application and one deployment artifact.

---

# 9. RECOMMENDED APPLICATION STRUCTURE

Use a domain-oriented modular monolith.

Do NOT organize the entire backend only as:

```text
controllers/
services/
repositories/
models/
```

with all domains mixed together.

Prefer:

```text
com.company.platform

├── common/
│
├── security/
│   ├── authentication/
│   ├── authorization/
│   └── audit/
│
├── website/
│   ├── controller/
│   ├── service/
│   ├── model/
│   └── repository/
│
├── blog/
│   ├── controller/
│   ├── service/
│   ├── model/
│   └── repository/
│
├── users/
│
├── cases/
│
├── mediation/
│
├── documents/
│
├── payments/
│
├── notifications/
│
└── administration/
```

Each business domain should have clear boundaries.

Avoid circular dependencies between domains.

Common/shared functionality should remain genuinely generic.

Do not put business logic into a giant `common` package.

---

# 10. DATABASE

Continue using:

## MySQL

Do not migrate to another database unless there is a compelling requirement discovered during analysis.

Use:

* JPA
* Hibernate
* Proper entity relationships
* Transactions
* Indexes
* Constraints
* Optimized queries

Use:

## Flyway

for schema versioning.

Never require developers to manually execute arbitrary production SQL migrations.

Migration structure should look like:

```text
V1__initial_schema.sql
V2__add_case_status.sql
V3__add_document_metadata.sql
...
```

Before changing the schema:

1. Understand the existing schema.
2. Identify all dependencies.
3. Preserve existing data.
4. Create reversible/safe migration strategies where practical.
5. Never silently destroy existing production data.

---

# 11. DOCUMENT STORAGE

AWS S3 is already available.

Use:

## S3 for document/file storage.

Do NOT store large documents directly in MySQL unless the existing business requirement absolutely requires it.

MySQL should store metadata such as:

```text
document_id
case_id
filename
content_type
file_size
storage_key
uploaded_by
created_at
updated_at
checksum
status
```

Actual files should be stored in S3.

For large uploads/downloads, consider S3 pre-signed URLs so the application server does not unnecessarily proxy large files.

Document access must always be authorized.

Never expose arbitrary S3 object keys directly to unauthorized users.

---

# 12. AUTHENTICATION

Do not invent a custom authentication system.

Use:

* Spring Security
* OAuth 2.0 / OpenID Connect where an existing identity provider is available

First inspect the current authentication implementation and identify:

* Password handling
* Token generation
* Sessions
* Refresh tokens
* Password reset
* Email verification
* MFA if present
* Login flows
* Logout
* Account locking
* Existing identity provider integrations

Then design the migration carefully.

If the current application does not have an external identity provider, document the recommended production-grade authentication approach before replacing the existing mechanism.

Never store plaintext passwords.

Use modern password hashing such as Argon2id or an appropriately configured BCrypt implementation.

Never implement cryptography manually.

---

# 13. AUTHORIZATION

Role-based access control must be implemented server-side.

Do NOT rely on Angular route guards alone.

Angular route guards are for UX/navigation.

The backend is the source of truth for authorization.

Implement:

```text
Authentication
    ↓
Who is the user?

Role authorization
    ↓
What role does the user have?

Resource/object authorization
    ↓
Is this user actually allowed to access this specific case/document/payment?
```

For example:

```text
Mediator A
    |
    +-- Can access assigned cases

Mediator B
    |
    +-- Cannot access Mediator A's cases
```

Every sensitive API must enforce authorization.

Pay special attention to:

* Cases
* Documents
* Payments
* User profiles
* Administrative operations
* Role changes
* Downloads
* Case assignment
* Sensitive mediation information

Never assume that knowing an ID means a user is authorized to access that resource.

---

# 14. API SECURITY

Follow OWASP API Security principles.

Protect against:

* Broken object-level authorization
* Broken function-level authorization
* Authentication failures
* Excessive data exposure
* Mass assignment
* Injection
* SSRF where relevant
* Security misconfiguration
* Unrestricted resource consumption
* Unsafe third-party API consumption

Use:

* Input validation
* Output DTOs
* Parameterized queries/JPA
* Rate limiting where appropriate
* Request size limits
* File upload restrictions
* Content-type validation
* Security headers
* CSRF protection where applicable
* CORS configuration
* HTTPS
* Secure cookies/tokens as appropriate
* Proper exception handling

Never expose stack traces or internal implementation details to clients.

---

# 15. API DESIGN

Build clean REST APIs.

Use a versioning strategy such as:

```text
/api/v1/...
```

Examples:

```text
/api/v1/users
/api/v1/cases
/api/v1/cases/{id}
/api/v1/documents
/api/v1/payments
/api/v1/mediation
/api/v1/blogs
```

Do not design APIs around Angular page names.

Avoid endpoints such as:

```text
/getEverythingForDashboard
/loadCustomerScreen
```

Prefer domain-oriented APIs.

---

# 16. OPENAPI

Use OpenAPI as the API contract.

The backend should expose a well-defined OpenAPI specification.

Generate or maintain the Angular TypeScript API client/models where practical.

Avoid manually duplicating:

```text
Java DTO
TypeScript interface
API documentation
```

when these can be generated reliably.

The OpenAPI contract should be part of the development process.

---

# 17. DTOs

Do not expose JPA entities directly through REST APIs.

Use:

```text
Entity
   ↓
Service
   ↓
DTO
   ↓
REST response
```

This prevents:

* accidental data exposure
* entity coupling
* mass assignment problems
* serialization problems
* API/database coupling

Separate:

```text
Request DTO
Response DTO
Entity
```

where appropriate.

---

# 18. BUSINESS LOGIC

Business logic belongs in the service/domain layer, not controllers.

Avoid controllers containing large amounts of business logic.

Prefer:

```text
Controller
    ↓
Application Service
    ↓
Domain/business logic
    ↓
Repository/integration
```

Transactions should be applied at appropriate service boundaries.

Do not create giant services containing the entire application.

---

# 19. PAYMENT ARCHITECTURE

Analyze the existing payment gateway integration carefully.

Never trust the frontend to declare that a payment succeeded.

Preferred flow:

```text
Angular
   |
   | initiate payment
   ↓
Spring Boot
   |
   ↓
Payment Gateway
   |
   ↓
Gateway confirmation/webhook
   |
   ↓
Spring Boot
   |
   ↓
Verify transaction
   |
   ↓
MySQL
```

Implement:

* Idempotency
* Transaction verification
* Webhook verification
* Proper payment status state machine
* Audit trail
* Failure/retry handling
* Duplicate webhook handling

Never store sensitive payment card data unless explicitly required and legally/compliantly supported.

Prefer gateway-hosted/tokenized payment flows.

---

# 20. DOCUMENT SECURITY

Documents may contain highly sensitive case information.

Implement:

* Authorization before download
* Authorization before viewing
* Authorization before deletion
* File type allowlists
* File size limits
* Filename sanitization
* Malware/virus scanning strategy if appropriate
* S3 private buckets
* No public S3 document access
* Short-lived pre-signed URLs
* Audit events for sensitive document access

Do not trust client-provided MIME types alone.

---

# 21. BLOG / SEO SYSTEM

The public blog system must support:

* SEO-friendly URLs/slugs
* Server-side rendering
* Meta title
* Meta description
* Canonical URL
* Open Graph metadata
* Structured data/JSON-LD where appropriate
* Sitemap generation
* Robots.txt
* Proper HTTP status codes
* 404 handling
* Published/unpublished status
* Publication dates
* Author information
* Featured images

Example:

```text
/blog/what-is-mediation
```

should return complete HTML suitable for search engine indexing.

Do not require JavaScript execution for search engines to discover the primary blog content.

---

# 22. WEBSITE CONFIGURATION

Existing server-controlled values such as:

* email
* phone
* company information
* contact details
* social links
* configurable content

should be modeled cleanly.

For example:

```text
SiteSettingsService
        ↓
MySQL
        ↓
Thymeleaf
```

Do not hard-code these values throughout HTML/Java code.

Where appropriate, cache configuration in application memory rather than introducing Redis.

Configuration that changes frequently should be designed carefully so administrators can update it without code deployment.

---

# 23. CONTACT FORM

The public contact form should:

```text
Browser
   ↓
POST /contact
   ↓
Validation
   ↓
Spam/bot protection
   ↓
Save inquiry
   ↓
Send notification email
```

Validate:

* name
* email
* phone
* message
* length
* content

Protect against:

* spam
* injection
* email header injection
* excessive requests
* malicious payloads

Do not trust client-side validation alone.

---

# 24. EMAIL

Centralize email handling.

Use a service such as:

```text
EmailService
```

Do not scatter SMTP/API implementation throughout business code.

Email templates should be separated from business logic.

Configuration must come from environment/secrets rather than source code.

---

# 25. AUDIT LOGGING

This is a mediation platform handling cases, documents, payments and multiple roles.

Implement a proper audit trail.

At minimum, consider recording:

```text
userId
action
entityType
entityId
timestamp
IP address where appropriate
request/correlation ID
relevant metadata
```

Examples:

```text
CASE_CREATED
CASE_UPDATED
CASE_ASSIGNED
CASE_STATUS_CHANGED

DOCUMENT_UPLOADED
DOCUMENT_VIEWED
DOCUMENT_DOWNLOADED
DOCUMENT_DELETED

PAYMENT_INITIATED
PAYMENT_COMPLETED
PAYMENT_FAILED

USER_CREATED
ROLE_CHANGED
USER_DISABLED
```

Do not put sensitive secrets or unnecessary personal information into logs.

Audit records should not be casually editable/deletable by ordinary users.

---

# 26. ERROR HANDLING

Implement centralized API exception handling.

Use a consistent error response.

For example:

```json
{
  "code": "CASE_NOT_FOUND",
  "message": "Case could not be found.",
  "traceId": "..."
}
```

Do not expose:

* stack traces
* SQL errors
* internal class names
* infrastructure details
* secrets

to clients.

Generate correlation/trace IDs.

---

# 27. LOGGING

Use structured logging.

Logs should make production troubleshooting possible.

Include appropriate fields such as:

```text
timestamp
level
traceId
requestId
userId where appropriate
endpoint
HTTP status
duration
error code
```

Never log:

* passwords
* access tokens
* refresh tokens
* full payment credentials
* sensitive document contents
* unnecessary personal information

---

# 28. SCALABILITY

The application must be designed to scale to thousands of users.

The application should be stateless wherever possible.

Do not rely on local server memory for critical shared state.

Do not rely on local filesystem storage for customer documents.

Documents belong in S3.

Database remains the source of truth.

The architecture should allow:

```text
Initially:

EC2
 |
Docker
 |
Spring Boot


Later:

Load Balancer
     |
 ┌───┼────┐
 │   │    │
EC2 EC2  EC2
 │   │    │
Docker containers
 │   │    │
Spring Boot
```

The application code should not require redesign when moving from one instance to multiple instances.

Do not introduce Redis to achieve this.

---

# 29. CACHING WITHOUT REDIS

Redis is explicitly NOT available.

Do not add Redis.

If caching is required, use appropriate alternatives such as:

* Spring Cache
* Caffeine/in-memory cache

only for data where local caching is safe.

Never use local cache for authoritative business state.

Document what is cached and why.

---

# 30. FILESYSTEM

Do not rely on the EC2 container filesystem for persistent customer data.

Containers may be destroyed/recreated.

Persistent data must live in:

```text
MySQL
S3
```

Temporary files should be explicitly managed and cleaned.

---

# 31. FRONTEND ARCHITECTURE

Angular should use domain/feature-oriented organization.

Example:

```text
src/app/

├── core/
│   ├── auth/
│   ├── http/
│   ├── guards/
│   ├── interceptors/
│   └── configuration/
│
├── shared/
│   ├── components/
│   ├── directives/
│   └── utilities/
│
├── features/
│   ├── dashboard/
│   ├── cases/
│   ├── mediation/
│   ├── documents/
│   ├── payments/
│   ├── users/
│   └── administration/
│
└── platform/
    ├── browser/
    └── mobile/
```

Use lazy loading for large feature areas.

Avoid putting all application state into one global store unnecessarily.

Use Signals where they simplify local/reactive state.

Use RxJS where asynchronous streams are appropriate.

---

# 32. ANGULAR SECURITY

Never assume Angular security replaces backend authorization.

Implement:

* Route guards
* HTTP interceptors
* Authentication state
* Token handling
* Secure logout
* Error handling
* XSS-safe rendering
* Strict typing
* Environment configuration

Never bypass Angular's sanitization without a very strong reason.

Never use `innerHTML` with untrusted content.

Treat blog/admin HTML content carefully and sanitize where required.

---

# 33. ANGULAR API LAYER

Do not make API calls directly from every component.

Prefer:

```text
Component
   ↓
Feature service/facade
   ↓
API client
   ↓
HTTP
   ↓
Spring Boot
```

Keep backend API details out of UI components.

---

# 34. RESPONSIVE DESIGN

The Angular application should be responsive.

Design with the future mobile requirement in mind.

However, do not make the web UI artificially resemble a mobile app.

Desktop web should remain optimized for desktop users.

Mobile should be possible through the same business/application architecture with appropriate responsive/mobile UI adaptations.

---

# 35. STATE MANAGEMENT

Do not automatically introduce Redux/NgRx just because this is an enterprise application.

First evaluate actual state complexity.

Use:

* Angular Signals
* Services
* RxJS

for most state.

Introduce NgRx only if the existing application genuinely requires complex centralized state management.

The goal is maintainability, not framework accumulation.

---

# 36. TESTING

Migration must include tests.

At minimum:

### Backend

* Unit tests
* Service tests
* Controller/API tests
* Repository/integration tests
* Security/authorization tests
* Payment tests
* Document authorization tests

Use:

* JUnit 5
* Mockito
* Spring Boot Test
* Testcontainers where useful

### Frontend

Use appropriate modern Angular testing tools.

Test:

* Authentication
* Routing
* Forms
* Case workflows
* Payments
* Documents
* Role-based UI behavior
* Critical business workflows

### End-to-end

Use Playwright or an equivalent mature E2E framework.

Critical workflows should have E2E coverage.

---

# 37. MIGRATION STRATEGY

Do NOT simply delete the Vue2/Node.js application and rewrite everything without understanding it.

First perform a complete codebase audit.

Create a migration inventory containing:

### Frontend

* All routes
* All components
* All services
* All API calls
* Authentication flows
* State management
* Forms
* Role/permission logic
* Document flows
* Payment flows
* Third-party integrations

### Backend

* All API endpoints
* Authentication
* Authorization
* Business rules
* Database queries
* Scheduled jobs
* Emails
* Payment gateway
* File handling
* External integrations

### Database

* Tables
* Columns
* Foreign keys
* Indexes
* Stored procedures
* Triggers
* Views
* Existing migrations
* Data relationships

### Website

* Routes
* Static pages
* Dynamic pages
* Blogs
* SEO metadata
* Contact form
* Configurable content

---

# 38. BEFORE WRITING CODE

Your first task is NOT to start coding.

First inspect the entire repository.

Understand:

```text
Architecture
Dependencies
Build system
Frontend
Backend
Database
Configuration
Authentication
Authorization
Payments
Documents
Website
Blogs
Emails
External APIs
Deployment
```

Identify technical debt.

Identify security vulnerabilities.

Identify undocumented business logic.

Identify duplicated functionality.

Identify dead code.

Identify code that must be preserved exactly.

Then create a migration plan.

Do not ask for confirmation after every small discovery.

Work systematically.

---

# 39. CREATE A MIGRATION DOCUMENT

Before major implementation, create:

```text
MIGRATION_ARCHITECTURE.md
```

It must document:

1. Current architecture
2. Current dependencies
3. Current frontend architecture
4. Current backend architecture
5. Current database
6. Current authentication
7. Current authorization
8. Current payment integration
9. Current document management
10. Current website/blog architecture
11. Identified technical debt
12. Security concerns
13. Target architecture
14. Target technology stack
15. Mapping from old components to new components
16. Database migration strategy
17. API migration strategy
18. Deployment strategy
19. Testing strategy
20. Rollback strategy
21. Risks and mitigations

---

# 40. FUNCTIONAL PARITY

The migration must preserve existing business functionality.

Create a feature matrix:

```text
Current Feature
      ↓
Current Implementation
      ↓
Target Implementation
      ↓
Migration Status
      ↓
Test Coverage
```

Do not accidentally remove obscure but important features.

If something in the existing code appears unused but may be business-critical, investigate before deleting it.

---

# 41. DATABASE MIGRATION

The existing MySQL database may contain production data.

Do not casually recreate it.

Analyze:

```text
Existing schema
      ↓
Target schema
      ↓
Migration scripts
      ↓
Data compatibility
      ↓
Validation
```

Preserve IDs and relationships wherever practical.

If schema changes are required, create Flyway migrations.

Never silently drop production tables or columns.

---

# 42. API MIGRATION

Map every existing Node.js endpoint.

Create:

```text
CURRENT API
     ↓
TARGET SPRING BOOT API
     ↓
Angular consumer
```

Maintain compatibility where required.

Where APIs can be improved, document the change.

Do not change API behavior simply for stylistic reasons if doing so creates unnecessary migration risk.

---

# 43. SECURITY REVIEW DURING MIGRATION

While reading the existing code, actively search for:

* Hardcoded secrets
* Password exposure
* Weak password hashing
* JWT vulnerabilities
* Insecure token storage
* Missing authorization checks
* IDOR/BOLA vulnerabilities
* SQL injection
* XSS
* CSRF
* CORS misconfiguration
* Insecure file uploads
* Public S3 objects
* Sensitive information in logs
* Payment verification flaws
* Email injection
* Missing rate limits
* Weak session handling
* Dependency vulnerabilities

Do not reproduce an insecure implementation simply because it exists in the old application.

If a security behavior must change, document it.

---

# 44. CONFIGURATION AND SECRETS

Never commit secrets into Git.

Use environment variables or AWS Secrets Manager/appropriate secret management.

Separate:

```text
Development
Testing
Staging
Production
```

configuration.

Do not hardcode:

* database passwords
* JWT secrets
* API keys
* AWS credentials
* payment gateway secrets
* SMTP credentials

---

# 45. DOCKER

Create a production-ready Dockerfile.

Prefer a multi-stage build.

The final runtime image should contain only what is required to run the application.

Do not require Node.js at runtime unless absolutely necessary.

Example conceptual build:

```text
Stage 1
Angular build

        ↓

Stage 2
Maven/Spring Boot build

        ↓

Stage 3
Minimal Java runtime

        ↓

Spring Boot application
```

The final image should be secure and reasonably small.

Run the application as a non-root user where practical.

---

# 46. DEPLOYMENT

The final application should be deployable using:

```text
Docker image
    ↓
AWS EC2
    ↓
Spring Boot
```

Provide clear deployment documentation.

Include:

* Environment variables
* Database configuration
* S3 configuration
* Email configuration
* Payment configuration
* Authentication configuration
* Health checks
* Logging
* Backup considerations
* Rollback procedure

---

# 47. HEALTH CHECKS

Implement Spring Boot Actuator appropriately.

Provide health/readiness information suitable for Docker/AWS.

Do not expose sensitive actuator endpoints publicly.

---

# 48. OBSERVABILITY

Implement production-ready:

* Structured logs
* Health checks
* Metrics
* Correlation IDs
* Error tracking where infrastructure permits

Make it possible to diagnose:

```text
User
 ↓
Angular
 ↓
API
 ↓
Business service
 ↓
Database/S3/payment gateway
```

using correlation/trace identifiers.

---

# 49. PERFORMANCE

Do not prematurely optimize.

But inspect for:

* N+1 queries
* Missing DB indexes
* Excessive API calls
* Large payloads
* Unnecessary Angular change detection
* Large bundles
* Unoptimized images
* Large document proxying
* Inefficient pagination

Use pagination for large datasets.

Never return thousands of database records simply because the UI currently displays a table.

---

# 50. API PAGINATION

For cases, documents, users, transactions and similar collections, implement pagination.

Example:

```text
GET /api/v1/cases?page=0&size=25
```

Return metadata such as:

```json
{
  "content": [],
  "page": 0,
  "size": 25,
  "totalElements": 1000,
  "totalPages": 40
}
```

Adapt the exact format to the project's existing conventions.

---

# 51. BACKWARD COMPATIBILITY

During migration, consider whether existing users may have:

* bookmarked URLs
* saved links
* old API clients
* existing sessions
* old documents
* payment references
* email links

Where appropriate, implement redirects or compatibility layers.

Do not break existing public URLs unnecessarily.

SEO URLs should be preserved or redirected with proper HTTP status codes.

---

# 52. CODE QUALITY

The resulting codebase must be:

* Clean
* Strongly typed
* Testable
* Modular
* Documented where necessary
* Consistent
* Easy for a new developer to understand

Avoid:

* Giant classes
* Giant methods
* Generic `Utils` dumping grounds
* Generic `CommonService`
* Copy/paste business logic
* Magic strings
* Hardcoded configuration
* Circular dependencies
* Unnecessary abstractions
* Overengineering

---

# 53. ENTERPRISE DOES NOT MEAN OVERENGINEERING

Do NOT introduce technology merely because it is considered "enterprise."

The following are intentionally NOT required:

* Microservices
* Kubernetes
* Kafka
* Redis
* Service mesh
* Event-driven architecture everywhere
* CQRS everywhere
* Distributed systems
* Multiple databases

Prefer:

```text
Simple
+
Modular
+
Secure
+
Testable
+
Scalable
+
Maintainable
```

over unnecessary infrastructure.

---

# 54. FUTURE MOBILE REQUIREMENT

The final architecture should allow:

```text
                    Spring Boot
                         │
               REST/OpenAPI APIs
                         │
             ┌───────────┴───────────┐
             │                       │
       Angular Web             Angular/Ionic
                                  + Capacitor
                                  │
                           ┌──────┴──────┐
                           │             │
                        Android         iOS
```

Do not create a separate mobile backend.

Do not duplicate business logic for mobile.

Mobile and web should consume the same backend APIs.

---

# 55. MIGRATION EXECUTION

After the architecture review, execute the migration systematically.

Recommended order:

### Phase 1

Analyze and document the current system.

### Phase 2

Create target architecture and project structure.

### Phase 3

Set up Spring Boot foundation.

### Phase 4

Set up database/Flyway.

### Phase 5

Implement security/authentication/authorization.

### Phase 6

Migrate core domain/business modules.

Suggested order:

```text
Users
   ↓
Cases
   ↓
Mediation
   ↓
Documents
   ↓
Payments
   ↓
Administration
   ↓
Notifications
```

Adapt this order based on actual dependencies discovered in the codebase.

### Phase 7

Build Angular foundation.

### Phase 8

Migrate Angular features incrementally.

### Phase 9

Migrate public website/blog functionality to server-rendered Spring Boot/Thymeleaf.

### Phase 10

Integrate S3 document management.

### Phase 11

Integrate payment gateway.

### Phase 12

Add comprehensive tests.

### Phase 13

Dockerize.

### Phase 14

Production deployment documentation.

---

# 56. DO NOT DELETE THE OLD APPLICATION PREMATURELY

Keep the existing Node.js/Vue2 code available during migration.

Use it as:

* Functional reference
* Business-rule reference
* API reference
* UI behavior reference
* Regression reference

Only remove legacy code after the replacement has demonstrated functional parity.

---

# 57. WHEN YOU FIND AMBIGUITY

If the existing application behavior is unclear:

1. Search the entire repository.
2. Check frontend usage.
3. Check backend implementation.
4. Check database relationships.
5. Check tests.
6. Check configuration.
7. Check documentation.
8. Infer only when sufficient evidence exists.

Do not invent business rules.

If an important architectural decision cannot safely be inferred, document the uncertainty in:

```text
MIGRATION_DECISIONS.md
```

and choose the safest backward-compatible implementation.

---

# 58. REQUIRED FINAL DELIVERABLES

At the end of the migration, provide:

```text
MIGRATION_ARCHITECTURE.md
MIGRATION_DECISIONS.md
MIGRATION_STATUS.md
API_MIGRATION.md
DATABASE_MIGRATION.md
DEPLOYMENT.md
SECURITY.md
```

Also provide:

* Updated README
* Local development instructions
* Production deployment instructions
* Docker instructions
* Environment variable documentation
* Testing instructions
* Database migration instructions
* Rollback instructions

---

# 59. FINAL QUALITY BAR

Do not consider the migration complete merely because:

```text
Application compiles
```

The migration is complete only when:

* Existing major functionality works
* Authentication works
* Authorization works
* Case management works
* Mediation workflows work
* Payments work
* Documents work
* S3 integration works
* Public website works
* Blogs work
* SEO requirements are preserved
* Contact forms work
* Dynamic website settings work
* Angular application works
* API contract is documented
* Database migrations work
* Tests exist for critical functionality
* Security issues have been addressed
* Docker deployment works
* Production configuration is documented
* Existing production data can be migrated safely
* Application can run on EC2
* Application does not depend on Redis
* Application remains a single modular monolith

---

# 60. YOUR FIRST TASK

Before making major code changes:

## STEP 1

Inspect the complete repository.

## STEP 2

Map the current architecture.

## STEP 3

Map all frontend routes/features.

## STEP 4

Map all backend APIs.

## STEP 5

Map the database.

## STEP 6

Map authentication/authorization.

## STEP 7

Map payments.

## STEP 8

Map document management/S3.

## STEP 9

Map public website/blog/SEO functionality.

## STEP 10

Identify security vulnerabilities and technical debt.

## STEP 11

Create `MIGRATION_ARCHITECTURE.md`.

## STEP 12

Create the target Spring Boot + Angular project structure.

## STEP 13

Begin the migration incrementally while maintaining functional parity.

Do not start by deleting the old Vue2/Node.js code.

Do not create microservices.

Do not add Redis.

Do not introduce unnecessary infrastructure.

The final result should be a **secure, scalable, maintainable, enterprise-grade modular monolith** using:

```text
Frontend:
Modern Angular + TypeScript

Public Website:
Spring Boot + Thymeleaf/server-side rendering

Backend:
Java 21/25 LTS + Spring Boot

Security:
Spring Security + OAuth2/OIDC where applicable

Database:
MySQL

Database migrations:
Flyway

Documents:
AWS S3

Caching:
No Redis; use local/in-memory caching only where justified

API:
REST + OpenAPI

Testing:
JUnit + Mockito + Testcontainers + Angular tests + Playwright

Deployment:
Docker → AWS EC2

Future Mobile:
Ionic + Capacitor using the Angular application

Architecture:
Modular Monolith
```

**Prioritize correctness, security, maintainability, functional parity and simplicity over introducing more technologies.**

**Do not perform a big-bang rewrite. Maintain a working build at each migration milestone, and after every major domain migration run the existing and new application against representative test data and compare behavior.**