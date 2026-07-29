# Mini ERP + CRM Operations Portal — Backend

REST API for a wholesale/distribution ERP: role-based auth, customer CRM, product and
inventory management with a full stock movement ledger, and sales challans with
transactional stock deduction.

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict mode) |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Auth | JWT (`jsonwebtoken`) + bcrypt password hashing |

## Architecture

```
src/
  config/env.ts          Environment loading and fail-fast validation
  lib/prisma.ts          Single shared Prisma client instance
  middleware/
    auth.ts              authenticate() verifies JWT, authorize() gates by role
    validate.ts          Zod schema validation, returns 400 with field-level errors
    error.ts             Central error handler, maps Prisma errors to HTTP codes
  utils/
    apiError.ts          Typed error class with HTTP status factories
    asyncHandler.ts      Forwards async controller rejections to the error handler
    pagination.ts        Shared page/limit parsing and response meta
  modules/
    auth/                login, me
    customer/            CRM CRUD, search, detail, follow-up notes
    product/             product CRUD, stock movements, movement ledger
    challan/             challan lifecycle + the stock business logic
  app.ts                 Express wiring
  server.ts              HTTP listener and graceful shutdown
```

Each module is split into `routes` (HTTP surface and role gates), `controller`
(request/response handling), `schema` (Zod validation) and, where the logic is
non-trivial, a `service` layer. The challan module is the only one with a service,
because it is the only one with meaningful business rules.

## Business Logic Notes

These are the decisions worth reviewing:

**Stock only moves on confirmation.** A `DRAFT` challan is a non-binding document and
touches nothing. Stock is deducted when the challan is created directly as `CONFIRMED`,
or when `POST /api/challans/:id/confirm` is called on a draft.

**Stock cannot go negative.** Deduction uses a conditional `updateMany` with
`currentStock: { gte: quantity }` rather than a read-then-write. Postgres evaluates the
predicate and applies the update atomically, so two challans confirming the same last
unit cannot both succeed. If the update affects zero rows, the API returns `422` with the
available quantity and the SKU in the error body.

**Challan items are snapshots, not references.** `ChallanItem` copies `productName`,
`sku`, `category` and `unitPrice` at creation time. `productId` is retained for
traceability, but a later price change on the product master will not rewrite historical
documents.

**Every stock change is logged.** `currentStock` is never edited directly through the
product update endpoint. It changes only via `StockMovement` rows, so the ledger and the
current quantity can never drift apart. Opening stock, manual adjustments, challan
confirmations, and challan cancellations all produce a movement row with a reason and a
`createdBy`.

**Cancellation restores stock.** Cancelling a `CONFIRMED` challan writes compensating
`IN` movements. Cancelling a `DRAFT` does not, since nothing was ever deducted.

**Challan numbers are sequential and gap-free.** A `Counter` table is incremented inside
the same transaction that creates the challan, producing `CH-2026-000001` style numbers
without race conditions.

## Role Permissions

| Resource | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|---|---|---|---|
| Read customers / products / challans | yes | yes | yes | yes |
| Create / edit customers, follow-ups | yes | yes | no | no |
| Create / edit products, stock movements | yes | no | yes | no |
| Create / edit challans | yes | yes | no | no |
| Confirm challan | yes | yes | yes | no |
| Cancel challan | yes | yes | no | no |

`ACCOUNTS` is read-only across all modules.

## Local Setup

Requires Node.js 20+ and a PostgreSQL database (a free Neon or Supabase instance works).

```bash
git clone <repo-url>
cd backend
npm install

cp .env.example .env
# edit .env and set DATABASE_URL and JWT_SECRET

npx prisma migrate dev --name init   # creates the schema
npm run seed                         # creates demo users, products, customers
npm run dev                          # starts on http://localhost:4000
```

Verify with:

```bash
curl http://localhost:4000/health
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string. Use the **pooled** URL on Neon. |
| `JWT_SECRET` | yes | Long random string used to sign tokens. |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `1d`. |
| `PORT` | no | Default `4000`. Render injects this automatically. |
| `NODE_ENV` | no | `development` or `production`. |
| `CORS_ORIGIN` | no | Comma-separated allowed frontend origins. |
| `SEED_PASSWORD` | no | Password applied to every seeded demo account. |

Secrets are never committed. `.env` is gitignored; `.env.example` documents the shape.
On Render they are set through the dashboard's Environment tab.

## Test Credentials

All seeded accounts share the password `Password@123`.

| Role | Email |
|---|---|
| Admin | `admin@erpdemo.com` |
| Sales | `sales@erpdemo.com` |
| Warehouse | `warehouse@erpdemo.com` |
| Accounts | `accounts@erpdemo.com` |

## API Reference

All routes except `/health` and `/api/auth/login` require
`Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Returns JWT and user object |
| GET | `/api/auth/me` | Current user profile |

### Customers
| Method | Path | Description |
|---|---|---|
| GET | `/api/customers` | List. Query: `page`, `limit`, `search`, `status`, `type` |
| GET | `/api/customers/:id` | Detail with follow-ups and recent challans |
| POST | `/api/customers` | Create |
| PATCH | `/api/customers/:id` | Update |
| POST | `/api/customers/:id/follow-ups` | Add a follow-up note |

### Products and Inventory
| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List. Query: `page`, `limit`, `search`, `category`, `lowStock` |
| GET | `/api/products/:id` | Detail with last 50 movements |
| POST | `/api/products` | Create (opening stock logs an `IN` movement) |
| PATCH | `/api/products/:id` | Update (cannot change stock directly) |
| POST | `/api/products/:id/movements` | Record an `IN` or `OUT` movement |
| GET | `/api/products/movements` | Full ledger. Query: `productId`, `type` |

### Sales Challans
| Method | Path | Description |
|---|---|---|
| GET | `/api/challans` | List. Query: `page`, `limit`, `status`, `customerId`, `search` |
| GET | `/api/challans/:id` | Detail with snapshot line items |
| POST | `/api/challans` | Create as `DRAFT` or `CONFIRMED` |
| PATCH | `/api/challans/:id` | Edit a draft only |
| POST | `/api/challans/:id/confirm` | Confirm and deduct stock |
| POST | `/api/challans/:id/cancel` | Cancel and restore stock if it was confirmed |

### Response Shape

Success:
```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

Error:
```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "mobile", "message": "Mobile must be exactly 10 digits" }] }
```

### Status Codes
| Code | Used for |
|---|---|
| 200 | Successful read or update |
| 201 | Resource created |
| 400 | Validation failure or malformed request |
| 401 | Missing, invalid, or expired token |
| 403 | Authenticated but role not permitted |
| 404 | Resource does not exist |
| 409 | State conflict (duplicate SKU, already-confirmed challan) |
| 422 | Business rule violation (insufficient stock) |
| 500 | Unhandled server error |

## Deployment (Render + Neon)

**Database.** Create a project on [neon.tech](https://neon.tech), copy the pooled
connection string.

**Backend on Render.** New > Web Service, connect the repo, root directory `backend`.

- Build command: `npm install && npx prisma migrate deploy && npm run build`
- Start command: `npm start`
- Environment: set `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, and
  `CORS_ORIGIN` pointing at the deployed frontend URL.

Seed the deployed database once from your local machine by temporarily pointing
`DATABASE_URL` at the production database and running `npm run seed`.

Note that Render's free tier sleeps after inactivity, so the first request after an idle
period takes roughly 30 seconds.

## Known Limitations

- No refresh token rotation; a single access token with a 1 day lifetime.
- No automated test suite. Endpoints were verified manually via the Postman collection.
- Invoicing, payments, and purchase orders were out of scope for this exercise.
- Stock is tracked at product level only, not per warehouse location. The `location`
  field is descriptive.
- The low-stock filter is applied in application code rather than SQL, because Prisma
  cannot compare two columns in a `where` clause.
- No rate limiting on the login endpoint.
