# Game Daily Tracker — Backend Skill Roadmap

## Goal

Build a real backend project with NestJS that starts simple and gradually introduces the backend concerns that are easy to miss when most of your experience is on the frontend.

The project is intentionally designed to move beyond CRUD and exercise:

- API design
- Domain modeling
- Authentication and authorization
- PostgreSQL and relational data modeling
- Transactions
- Concurrency and idempotency
- Caching
- Background jobs
- Event-driven architecture
- WebSockets
- Observability
- Testing
- Deployment
- Failure handling

The target architecture is a **modular monolith first**, not microservices.

## Implementation TODO

Use this section as the working checklist. Mark an item complete only after the
behavior is implemented and verified with a test or a manual check. The longer
sections below explain the reasoning behind each milestone.

### Current position

- [x] Generate the NestJS application
- [x] Enable strict TypeScript
- [x] Complete the development bootstrap
- [x] Complete the initial domain model and seed data
- [x] Complete the authentication foundation
- [x] Implement game accounts and daily task listing/completion
- [ ] Finish the V0.1 REST API with completion history and end-to-end verification

### Milestone 0 — Development bootstrap

- [x] Define the local environment variables and an `.env.example`
- [x] Add PostgreSQL with Docker Compose
- [x] Add Prisma and create the initial migration workflow
- [x] Configure NestJS `ConfigModule`
- [x] Add the global validation pipe
- [x] Add a consistent global exception/error response strategy
- [x] Add Swagger/OpenAPI
- [x] Add basic request logging
- [x] Verify the app starts and connects to PostgreSQL from a clean setup

### Milestone 1 — Domain model

- [x] Write down the V0.1 domain rules before creating tables
- [x] Model `User`, `Game`, `GameAccount`, `TaskDefinition`, and `TaskCompletion`
- [x] Decide which fields are required, nullable, or immutable
- [x] Add foreign keys, unique constraints, and indexes intentionally
- [x] Create and apply the first Prisma migration
- [x] Seed the minimum games/tasks needed for local development

#### V0.1 domain decisions

- A user can track multiple games.
- A user can have at most one game account per game.
- `Game` is a shared catalog containing Genshin Impact, Wuthering Waves, and Honkai: Star Rail.
- `TaskDefinition` belongs to a game and is shared across users.
- V0.1 tracks one aggregate daily goal per game.
- `TaskCompletion` is append-only and is created only when a task is completed.
- One completion is allowed per account, task definition, and daily period.
- A separate `ActivityHistory` table is deferred; completion records provide the history.
- Instants use UTC-aware timestamps; the daily period uses a date-only value.

### Milestone 2 — Authentication

- [x] Implement registration with password hashing
- [x] Implement login and JWT access tokens
- [ ] Implement refresh-token storage, rotation/revocation, and logout
- [x] Add the JWT guard and current-user decorator
- [x] Implement `GET /users/me`
- [x] Add authentication tests for success and failure cases

### Milestone 3 — V0.1 REST API

- [x] Create a game account
- [x] List a user’s game accounts
- [x] Expose seeded daily task definitions for a game account
- [x] List today’s tasks
- [x] Complete a task
- [ ] View completion history
- [x] Add DTO validation and ownership checks
- [ ] Add pagination, filtering, and sorting where the collection can grow
- [ ] Document the endpoints in Swagger
- [ ] Add a consistent response and error contract

#### Current slice — Game accounts

- [x] Define the game-account request and response contract
- [x] Generate the `GameAccountsModule`, controller, and service
- [x] Add DTO validation for the selected game
- [x] Create an account using the authenticated user ID
- [x] Resolve the game by its unique code
- [x] Map duplicate user/game accounts to `409 Conflict`
- [x] List only the authenticated user’s game accounts
- [x] Add ownership checks for individual account access
- [x] Add unit tests for the service and controller
- [ ] Verify the flow through Postman

#### Current slice — Daily tasks

- [x] Define the today-task read and completion contracts
- [x] Add the UTC daily-period helper
- [x] List active daily task definitions for an owned game account
- [x] Include the account’s completion status for the current period
- [x] Complete a task for the current UTC period
- [x] Validate account ownership and task/game ownership
- [x] Prevent duplicate completion with the composite database constraint
- [x] Map duplicate completion to `409 Conflict`
- [x] Add service and controller unit tests
- [ ] Add a completion response DTO and complete Swagger metadata
- [ ] Verify the full task flow through Postman or the Vue frontend

### Milestone 4 — Business rules

- [x] Prevent completing an already completed task
- [ ] Define daily and weekly period boundaries
- [ ] Define how task completion affects progress
- [ ] Define and implement streak rules
- [ ] Model character/resource goals only when their first use case is clear
- [ ] Add unit tests for each business invariant

### Milestone 5 — Consistency and concurrency

- [ ] Put multi-write completion behavior behind an explicit transaction
- [ ] Decide which operations must be atomic
- [ ] Reproduce duplicate completion requests concurrently
- [ ] Make completion effects happen once with database constraints/atomic updates
- [ ] Add idempotency handling where retries can repeat a command
- [ ] Add integration/concurrency tests

### Milestone 6 — Infrastructure introduced by need

- [ ] Add Redis only after identifying a measurable dashboard/read-performance problem
- [ ] Add cache-aside behavior for the dashboard
- [ ] Define cache keys, TTLs, and invalidation rules
- [ ] Add BullMQ for work that should not block HTTP requests
- [ ] Make reset/reminder workers retryable and idempotent
- [ ] Add timezone-aware scheduling
- [ ] Introduce domain events only when completion orchestration becomes difficult to maintain
- [ ] Add WebSockets only when clients need server-initiated updates

### Milestone 7 — Authorization and production concerns

- [ ] Enforce resource ownership on every protected resource
- [ ] Add roles/permissions only when a real use case requires them
- [ ] Add structured logs and request IDs
- [ ] Add health checks for required dependencies
- [ ] Add metrics for HTTP, database, cache, and queue behavior
- [ ] Add graceful shutdown
- [ ] Add unit, integration, E2E, and failure-path tests
- [ ] Deploy API, worker, PostgreSQL, and Redis with backups and migration strategy
- [ ] Run deliberate failure experiments and document expected behavior

### Definition of done for V0.1

- [x] A user can register and log in
- [x] A user can create a game account
- [x] A user can list today’s daily tasks
- [x] A user can complete a task exactly once
- [ ] A user can view completion history
- [x] A second user cannot access another user’s data
- [ ] The complete flow is covered by at least one E2E test
- [x] The API runs with only NestJS and PostgreSQL; Redis, queues, WebSockets, CQRS, and microservices are not required yet

---

# 1. Project Concept

A backend for tracking daily and weekly progression across games such as:

- Honkai: Star Rail
- Wuthering Waves
- Genshin Impact

A user can register multiple game accounts and track recurring activities, resource goals, character progression, and completion history.

Example:

```text
User
 ├── GameAccount
 │    ├── DailyTask
 │    ├── WeeklyTask
 │    ├── Resource
 │    └── CharacterGoal
 │
 ├── Reminder
 └── ActivityHistory
```

The domain is familiar enough that most of the learning effort can go into backend engineering rather than inventing business requirements.

---

# 2. Suggested Stack

## Core

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Docker Compose

## API

- REST
- class-validator
- Swagger / OpenAPI

## Authentication

- JWT access token
- Refresh token
- Passport / NestJS Guards

## Infrastructure added later

- Redis
- BullMQ
- WebSockets
- Structured logging
- Health checks

## Testing

- Jest
- Supertest
- Test database

---

# 3. Initial Architecture

Start as a modular monolith.

```text
src/
├── app.module.ts
├── auth/
├── users/
├── game-accounts/
├── tasks/
├── progress/
├── reminders/
├── activity/
├── database/
└── common/
```

Avoid microservices initially.

The goal is to learn how to create clear module boundaries before adding distributed-system complexity.

---

# 4. Milestone 0 — Bootstrap

## Objectives

Create a development environment that is easy to reproduce.

## Tasks

- Create NestJS project
- Enable strict TypeScript
- Configure environment variables
- Add PostgreSQL
- Add Prisma
- Add Docker Compose
- Add validation pipe
- Configure global exception handling
- Add Swagger
- Add basic request logging

## Docker services

```text
NestJS
PostgreSQL
```

Redis can be added later.

## Skills exercised

- Configuration management
- Dependency injection
- NestJS project structure
- Database migrations
- Environment isolation

---

# 5. Milestone 1 — Domain Modeling

Before writing many controllers, model the domain.

Possible entities:

```text
User
Game
GameAccount
TaskDefinition
TaskInstance
CharacterGoal
ResourceGoal
ActivityHistory
Reminder
```

## Example relationships

```text
User
 └── GameAccount
      ├── TaskInstance
      ├── CharacterGoal
      └── ResourceGoal
```

A `TaskDefinition` describes something reusable:

```text
Spend 240 Trailblaze Power
Complete Daily Training
Complete Simulated Universe
```

A `TaskInstance` represents a specific occurrence:

```text
Task:
Spend 240 Trailblaze Power

Date:
2026-09-03

Status:
completed
```

This distinction will become important when implementing resets and history.

## Skills exercised

- Relational database design
- Normalization
- Foreign keys
- Unique constraints
- Indexes
- Domain modeling

---

# 6. Milestone 2 — Authentication

Implement:

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /users/me
```

Learn:

- Password hashing
- JWT access tokens
- Refresh tokens
- Authentication guards
- Current-user decorators
- Token revocation strategy

Example:

```ts
@Get("me")
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: AuthUser) {
  return user;
}
```

## Skills exercised

- Authentication
- Guards
- Decorators
- Security boundaries
- Credential storage

---

# 7. Milestone 3 — Basic REST API

Implement the first usable API.

Example endpoints:

```text
POST   /game-accounts
GET    /game-accounts
GET    /game-accounts/:id

POST   /game-accounts/:id/tasks
GET    /game-accounts/:id/tasks

PATCH  /tasks/:id
POST   /tasks/:id/complete

GET    /dashboard
```

Add:

- DTO validation
- Pagination
- Filtering
- Sorting
- Consistent response/error structure

Example query:

```text
GET /tasks?status=pending&type=daily&page=1&limit=20
```

## Skills exercised

- API design
- DTOs
- Validation
- Controllers
- Services
- Repository/database interaction
- Pagination

---

# 8. Milestone 4 — Business Logic

Do not let the system remain CRUD-only.

Example flow:

```text
User completes task
        │
        ▼
TaskService.complete()
        │
        ├── verify ownership
        ├── verify task state
        ├── update task
        ├── write activity history
        ├── update progress
        └── update streak
```

Possible rules:

- A completed task cannot be completed again.
- Daily tasks only count toward the corresponding day.
- Weekly tasks belong to a specific weekly period.
- Completing all daily tasks increments a streak.
- Missing a day resets the streak.
- Character goals can contain multiple progression stages.

## Skills exercised

- Business rules
- Domain boundaries
- Service design
- Invariants
- Error modeling

---

# 9. Milestone 5 — Transactions

Some actions must succeed together.

Example:

```text
Complete Task
    │
    ├── update task
    ├── insert activity history
    ├── update progress
    └── update streak
```

If any operation fails, everything should roll back.

Use database transactions.

Questions to explore:

- What belongs inside one transaction?
- How long should a transaction remain open?
- What should happen if a transaction fails?
- Should external API calls happen inside transactions?

## Skills exercised

- ACID
- Transaction boundaries
- Rollbacks
- Database consistency

---

# 10. Milestone 6 — Concurrency and Idempotency

Deliberately reproduce race conditions.

Example:

```text
Request A ──┐
            ├── complete task
Request B ──┘
```

Both requests target the same task simultaneously.

Bad result:

```text
Task completed once
XP awarded twice
Two activity records created
```

Possible protections:

- Atomic updates
- Unique constraints
- Transactions
- Optimistic concurrency
- Idempotency keys

Example SQL idea:

```sql
UPDATE task_instances
SET completed_at = NOW()
WHERE id = $1
AND completed_at IS NULL;
```

If affected rows = `0`, the operation has already been completed.

Possible idempotency key:

```text
complete-task:{taskId}:{date}
```

## Skills exercised

- Race conditions
- Atomic operations
- Idempotency
- Database locking concepts
- Distributed request behavior

---

# 11. Milestone 7 — Redis and Caching

Make `/dashboard` an aggregation endpoint.

Example:

```text
GET /dashboard

 ├── daily tasks
 ├── weekly tasks
 ├── resources
 ├── character goals
 ├── streak
 └── recent activity
```

Then cache it.

```text
GET /dashboard
      │
      ▼
    Redis
   /     \
 HIT     MISS
           │
           ▼
       PostgreSQL
```

Possible cache key:

```text
dashboard:{userId}
```

Then solve the harder problem:

## Cache invalidation

When a task changes:

```text
completeTask()
      │
      ├── commit DB transaction
      │
      └── invalidate dashboard:{userId}
```

Experiment with:

- TTL
- Cache-aside
- Explicit invalidation
- Stampede prevention

## Skills exercised

- Redis
- Cache design
- Cache invalidation
- Performance tradeoffs
- Data freshness

---

# 12. Milestone 8 — Background Jobs

Introduce BullMQ.

Use cases:

- Daily resets
- Weekly resets
- Reminder notifications
- Streak recalculation
- Analytics aggregation

Architecture:

```text
NestJS API
    │
    ▼
  Redis
    │
    ▼
 BullMQ
    │
    ▼
NestJS Worker
    │
    ▼
PostgreSQL
```

Example daily-reset job:

```text
daily-reset:user-123:2026-09-04
```

The worker should be safe even if the same job runs twice.

Explore:

- retries
- exponential backoff
- dead-letter behavior
- failed jobs
- job deduplication
- idempotent workers

## Skills exercised

- Async processing
- Queues
- Workers
- Retry strategies
- Job idempotency
- Failure recovery

---

# 13. Milestone 9 — Scheduled Jobs

Add scheduled recurring work.

Examples:

```text
Daily reset
04:00 local server/user timezone

Weekly reset
Monday 04:00
```

Eventually support multiple user timezones.

This introduces an interesting backend problem:

```text
User A → Asia/Jakarta
User B → Asia/Tokyo
User C → America/New_York
```

Do not simply create thousands of cron jobs.

Explore designs such as:

```text
Scheduler runs every minute
        │
        ▼
find users/accounts whose reset_at <= now
        │
        ▼
enqueue reset jobs
```

## Skills exercised

- Scheduling
- Timezones
- UTC storage
- Recurring jobs
- Scalable scheduler design

---

# 14. Milestone 10 — Event-Driven Design

Initially the task completion service may become something like:

```ts
completeTask() {
  updateTask();
  updateProgress();
  updateStreak();
  insertHistory();
  invalidateCache();
  sendNotification();
}
```

This is the moment to introduce domain events.

Example:

```text
TaskCompletedEvent
        │
        ├── ProgressHandler
        ├── StreakHandler
        ├── AnalyticsHandler
        ├── CacheHandler
        └── NotificationHandler
```

Possible implementation:

- NestJS EventEmitter initially
- NestJS CQRS package later

Do not introduce CQRS merely for architecture aesthetics.

Use it after the current design creates a real pain point.

## Skills exercised

- Loose coupling
- Domain events
- Event handlers
- Eventual consistency
- CQRS concepts

---

# 15. Milestone 11 — Authorization

Authentication answers:

```text
Who are you?
```

Authorization answers:

```text
Are you allowed to do this?
```

Implement resource ownership.

Example:

```text
User A owns account A.

User B requests:

PATCH /game-accounts/A

Result:
403 Forbidden
```

Later introduce roles:

```text
User
Moderator
Admin
```

Possible permission system:

```ts
@RequirePermissions("task:update")
```

Flow:

```text
Decorator
   │
   ▼
Metadata
   │
   ▼
Guard
   │
   ▼
ExecutionContext
```

## Skills exercised

- RBAC
- Resource ownership
- Guards
- Metadata
- Permission design

---

# 16. Milestone 12 — WebSockets

Add real-time updates.

Example:

```text
React Client
     │
     │ POST /tasks/:id/complete
     ▼
NestJS
     │
     ├── PostgreSQL
     │
     └── WebSocket Gateway
              │
              ▼
         connected clients
```

Possible events:

```text
task.completed
task.created
progress.updated
daily.reset
```

Explore:

- WebSocket authentication
- Rooms
- User-specific channels
- Reconnection
- Duplicate events
- REST/WebSocket state synchronization

On the frontend this could integrate with TanStack Query.

Example:

```ts
socket.on("task.completed", () => {
  queryClient.invalidateQueries({
    queryKey: ["dashboard"],
  });
});
```

## Skills exercised

- Realtime architecture
- WebSocket authentication
- Event synchronization
- Client/server state consistency

---

# 17. Milestone 13 — Observability

Add structured logging.

Example:

```json
{
  "level": "info",
  "requestId": "req_91823",
  "userId": "usr_123",
  "method": "POST",
  "path": "/tasks/123/complete",
  "durationMs": 43
}
```

Propagate a request ID:

```text
HTTP Request
     │
     ▼
Controller
     │
     ▼
Service
     │
     ▼
Queue
     │
     ▼
Worker
```

Add health checks:

```text
GET /health
GET /health/database
GET /health/redis
```

Eventually expose metrics such as:

```text
HTTP request duration
HTTP error rate
DB query duration
Queue depth
Failed job count
Active worker count
Cache hit ratio
```

This can later integrate nicely with the existing VPS monitoring setup.

## Skills exercised

- Structured logs
- Correlation IDs
- Health checks
- Metrics
- Debugging production systems

---

# 18. Milestone 14 — Testing Strategy

Avoid only testing controllers.

## Unit tests

Test isolated business rules.

Example:

```text
Task cannot be completed twice.
Daily streak increments after all daily tasks complete.
Weekly tasks do not affect daily streak.
```

## Integration tests

Use a real test PostgreSQL instance.

Test:

```text
Service
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
```

## E2E tests

Use Supertest.

Example:

```text
register
  ↓
login
  ↓
create account
  ↓
create task
  ↓
complete task
  ↓
check dashboard
```

## Concurrency tests

Send simultaneous requests and verify that business effects occur once.

## Skills exercised

- Test boundaries
- Integration testing
- E2E testing
- Database fixtures
- Concurrency testing

---

# 19. Milestone 15 — Production Deployment

Target deployment:

```text
Internet
   │
   ▼
Cloudflare
   │
   ▼
Reverse Proxy
   │
   ▼
NestJS API
   │
   ├── PostgreSQL
   ├── Redis
   └── Worker
```

Container layout:

```text
api
worker
postgres
redis
```

Possible deployment platform:

```text
Contabo VPS
```

Add:

- production environment variables
- database backups
- Docker health checks
- restart policies
- graceful shutdown
- migration strategy

## Skills exercised

- Containers
- Deployment
- Process lifecycle
- Database migrations
- Production configuration

---

# 20. Advanced Milestone — Failure Scenarios

Once the happy path works, intentionally break things.

## Redis unavailable

Questions:

```text
Should API requests fail?
Can dashboard fall back to PostgreSQL?
What happens to queued jobs?
```

## PostgreSQL unavailable

Expected:

```text
503 Service Unavailable
```

instead of an unexplained 500.

## Worker crashes halfway

Can the same job safely retry?

## Duplicate queue job

Does the operation happen twice?

## Slow database query

Can it be identified from logs/metrics?

## Two servers running

Do scheduled jobs execute twice?

These exercises are extremely valuable because backend systems are defined as much by their failure behavior as by their normal behavior.

---

# 21. Possible Final Architecture

```text
                          ┌───────────────┐
                          │ React / Astro │
                          │    Client     │
                          └───────┬───────┘
                                  │
                           REST / WebSocket
                                  │
                         ┌────────▼────────┐
                         │     NestJS      │
                         │       API       │
                         └───┬─────┬───┬───┘
                             │     │   │
                  ┌──────────┘     │   └───────────┐
                  ▼                ▼               ▼
             PostgreSQL          Redis         WebSocket
                                     │
                                     ▼
                                  BullMQ
                                     │
                                     ▼
                               NestJS Worker
                                     │
                     ┌───────────────┼──────────────┐
                     ▼               ▼              ▼
                  Reminder         Reset         Analytics
                    jobs           jobs            jobs
```

---

# 22. Topics We Should Avoid Too Early

## Microservices

Do not split the application before module boundaries are understood.

Microservices add:

- network failures
- serialization
- distributed tracing
- service discovery
- eventual consistency
- deployment complexity

First build:

```text
good modular monolith
```

Then identify a real boundary worth extracting.

A possible future candidate:

```text
Notification service
```

because it could independently process:

```text
email
push notifications
Discord/webhook notifications
```

---

## Full CQRS

Do not introduce command/query handlers for every operation from day one.

Start with normal NestJS services.

Introduce CQRS when service complexity gives us a reason.

---

## Kubernetes

Docker Compose is enough for this project initially.

The goal is backend engineering, not infrastructure complexity.

---

# 23. Recommended Learning Order

```text
1. NestJS bootstrap
      ↓
2. PostgreSQL + Prisma
      ↓
3. Domain model
      ↓
4. Authentication
      ↓
5. REST API
      ↓
6. Business rules
      ↓
7. Transactions
      ↓
8. Concurrency / Idempotency
      ↓
9. Redis caching
      ↓
10. BullMQ
      ↓
11. Scheduling
      ↓
12. Domain events
      ↓
13. Authorization
      ↓
14. WebSockets
      ↓
15. Observability
      ↓
16. Testing
      ↓
17. Deployment
      ↓
18. Failure experiments
```

---

# 24. Backend Skills Checklist

By the end of the project, we should be comfortable explaining and implementing:

## NestJS

- [ ] Modules
- [ ] Controllers
- [ ] Providers
- [ ] Dependency injection
- [ ] Pipes
- [ ] Guards
- [ ] Interceptors
- [ ] Exception filters
- [ ] Custom decorators
- [ ] ExecutionContext
- [ ] WebSocket gateways

## API

- [ ] REST conventions
- [ ] DTO validation
- [ ] Pagination
- [ ] Filtering
- [ ] Error contracts
- [ ] API documentation
- [ ] Versioning

## Database

- [ ] Schema design
- [ ] Relationships
- [ ] Foreign keys
- [ ] Indexes
- [ ] Unique constraints
- [ ] Transactions
- [ ] Query optimization
- [ ] Migrations

## Distributed/backend concepts

- [ ] Race conditions
- [ ] Idempotency
- [ ] Cache invalidation
- [ ] Background jobs
- [ ] Retry strategies
- [ ] Eventual consistency
- [ ] Scheduling
- [ ] Queue processing

## Security

- [ ] Authentication
- [ ] Authorization
- [ ] RBAC
- [ ] Resource ownership
- [ ] Password hashing
- [ ] Rate limiting

## Production

- [ ] Structured logging
- [ ] Correlation IDs
- [ ] Health checks
- [ ] Metrics
- [ ] Graceful shutdown
- [ ] Docker deployment
- [ ] Database backups

## Testing

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Database tests
- [ ] Concurrency tests

---

# 25. First Concrete Goal

The first usable version should stay deliberately small.

## Version 0.1

A user can:

```text
register
login
create a game account
create daily tasks
list today's tasks
complete a task
view completion history
```

Architecture:

```text
NestJS
   │
   ▼
PostgreSQL
```

No Redis.

No queues.

No WebSockets.

No CQRS.

No microservices.

The purpose of V0.1 is to establish a strong domain model and clean NestJS structure.

After V0.1 works, each new infrastructure component should solve a problem that we deliberately introduce.

---

# Guiding Principle

For every new backend technology, ask:

> What problem are we solving?

Examples:

```text
Redis
→ repeated expensive reads

BullMQ
→ work should not block HTTP requests

Transactions
→ multiple writes must succeed atomically

Idempotency
→ requests/jobs may execute more than once

WebSockets
→ clients need server-initiated realtime updates

Domain Events
→ one business action triggers several independent reactions

Observability
→ failures must be diagnosable in production
```

That keeps the project focused on understanding backend engineering rather than merely collecting technologies.
