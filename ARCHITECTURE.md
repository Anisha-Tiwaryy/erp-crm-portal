# Architecture

## Overview

Two deployable units against one PostgreSQL database.

```
┌──────────────────┐        HTTPS/JSON        ┌──────────────────┐
│  React (Vite)    │  ───────────────────────▶│  Express + TS    │
│  SPA, port 5173  │◀─────────────────────────│  REST, port 4000 │
└──────────────────┘   Bearer JWT on every    └────────┬─────────┘
                       request except login            │ Prisma
                                                       ▼
                                              ┌──────────────────┐
                                              │  PostgreSQL      │
                                              │  (Neon)          │
                                              └──────────────────┘
```

Frontend and backend are separate packages rather than one Next.js project. The brief
asks for a React frontend and a Node/Express REST API as distinct deliverables, and
keeping them separate means the API can be consumed by anything (Postman, a mobile
client, another service) without being coupled to a rendering framework.

## Request Lifecycle

```
Request
  │
  ├─▶ helmet            security headers
  ├─▶ cors              origin allowlist from CORS_ORIGIN
  ├─▶ express.json      body parsing, 1mb cap
  ├─▶ morgan            request logging
  │
  ├─▶ authenticate      verifies JWT, attaches req.user      → 401 on failure
  ├─▶ authorize(roles)  checks req.user.role against route   → 403 on failure
  ├─▶ validate(schema)  Zod parse of body/query              → 400 with field errors
  │
  ├─▶ controller        request/response handling
  │     └─▶ service     business rules (challan module only)
  │           └─▶ prisma
  │
  └─▶ errorHandler      ApiError → status, Prisma error → status, else 500
```

Controllers are wrapped in `asyncHandler`, so a rejected promise anywhere in the chain
lands in the central error handler rather than hanging the request.

## Layering

| Layer | Responsibility | Example |
|---|---|---|
| `routes` | HTTP surface, role gates, schema binding | `challan.routes.ts` |
| `schema` | Input shape and constraints (Zod) | `challan.schema.ts` |
| `controller` | Request/response, transaction boundaries | `challan.controller.ts` |
| `service` | Business rules | `challan.service.ts` |
| `lib/prisma` | Data access | shared client |

Only the challan module has a service layer. The other three modules are CRUD with
validation, and adding a pass-through service to each would be structure for its own
sake. The rule applied: a service exists where there is logic that would be wrong to
duplicate or hard to test through a controller.

## Data Model

```
User ──┬──< Customer >──< FollowUp
       │        │
       │        └──< Challan >──< ChallanItem >── Product
       │                                             │
       └──────────────< StockMovement >──────────────┘
```

`ChallanItem` holds a foreign key to `Product` *and* a copy of the product's name, SKU,
category and unit price. The foreign key preserves traceability; the copy makes the
document immutable against later master-data edits.

`Counter` is a single-row-per-year table used to allocate challan numbers.

## Key Decisions

**Stock is derived from an append-only ledger, not edited in place.**
`Product.currentStock` is never writable through the product update endpoint. It changes
only alongside a `StockMovement` row inside the same transaction, so the ledger always
explains the current quantity. Opening stock, manual corrections, challan confirmations
and cancellations all produce a movement with a reason and an author.

**Negative stock is prevented at the database, not in application logic.**
Deduction is a conditional `updateMany` with `currentStock: { gte: quantity }`. Postgres
evaluates the predicate and applies the decrement atomically. A read-then-write would
leave a window where two concurrent confirmations both read sufficient stock and both
succeed. Zero affected rows means the guard fired, and the API returns 422 naming the
SKU, the available quantity and the required quantity.

**Cancellation compensates rather than deletes.**
Cancelling a confirmed challan writes offsetting `IN` movements and sets status to
`CANCELLED`. Nothing is removed. The ledger remains a complete audit trail.

**Challan numbers are allocated inside the creating transaction.**
The `Counter` row is incremented in the same transaction that inserts the challan, so
concurrent requests cannot receive the same number and no numbers are skipped.

**Draft is non-binding.**
A `DRAFT` challan reserves nothing. This is deliberate: the alternative (soft reservation)
requires an expiry mechanism and a reconciliation job, which is out of proportion to the
scope here. The tradeoff is that two drafts can be written against the same last unit and
only the first to confirm will succeed — which is the correct failure, surfaced clearly.

**JWT is stateless with no refresh rotation.**
A single access token, one day lifetime, verified per request. No session store. For a
system with four internal roles and no external users, session revocation was not worth
the infrastructure.

## Role Model

| Capability | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|---|---|---|---|
| Read all modules | yes | yes | yes | yes |
| Write customers, follow-ups | yes | yes | — | — |
| Write products, stock movements | yes | — | yes | — |
| Create/edit challans | yes | yes | — | — |
| Confirm challan | yes | yes | yes | — |
| Cancel challan | yes | yes | — | — |

Enforced by `authorize()` on the route, before the controller runs. The frontend also
hides unavailable actions, but that is presentation only — every check is server-side and
is demonstrated in the Postman collection's "Business Rule Checks" folder.

## Error Contract

Every failure returns the same shape:

```json
{ "success": false, "message": "human readable", "errors": [ ... ] }
```

| Status | Meaning | Source |
|---|---|---|
| 400 | Input failed validation | Zod, via `validate` middleware |
| 401 | No/invalid/expired token | `authenticate` |
| 403 | Valid token, wrong role | `authorize` |
| 404 | Resource absent | controller or Prisma P2025 |
| 409 | State conflict | duplicate SKU (P2002), re-confirming a challan |
| 422 | Business rule violated | insufficient stock |
| 500 | Unhandled | caught and logged, details not leaked |

422 is used rather than 400 for insufficient stock because the request was well-formed and
correctly authorised — it was refused by a domain rule, not a parsing failure.
