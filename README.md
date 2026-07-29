# Mini ERP + CRM Operations Portal

A small ERP/CRM for a wholesale and distribution business. Internal users across sales,
warehouse and accounts manage customers, products and stock, and sales challans, with
role-based access throughout.

Built as a technical case study submission.

## Contents

| Path | What it is |
|---|---|
| `backend/` | Node.js + TypeScript + Express REST API, Prisma, PostgreSQL |
| `frontend/` | React + TypeScript SPA (Vite) |
| `postman/` | Postman collection, 36 requests with assertions |
| `docs/` | Case study documentation and submission checklist |
| `ARCHITECTURE.md` | Design decisions and rationale |
| `backend/README.md` | Full API reference and backend setup |

## Deployment

The application is deployed across three free-tier services:

| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend API | Render |
| Database | Neon (PostgreSQL) |

| Component | URL |
|---|---|
| Frontend | https://erp-crm-portal-anisha-tiwary-s-projects.vercel.app |
| Backend API | https://erp-crm-portal-wcr4.onrender.com |
| Health check | https://erp-crm-portal-wcr4.onrender.com/health |

Deployment configuration and build commands are documented in `backend/README.md`.

The API runs on Render's free tier, which sleeps after a period of inactivity. The first
request after an idle period may take several seconds while the service wakes.

## Test Credentials

| Role | Email | Password | Can do |
|---|---|---|---|
| Admin | `admin@erpdemo.com` | `admin123` | Everything |
| Sales | `sales@erpdemo.com` | `sales123` | Customers, follow-ups, challans |
| Warehouse | `warehouse@erpdemo.com` | `warehouse123` | Products, stock, confirm challans |
| Accounts | `accounts@erpdemo.com` | `account123` | Read only |

## Tech Stack

**Backend** — Node.js, TypeScript (strict), Express.js, PostgreSQL, Prisma, Zod, JWT, bcrypt
**Frontend** — React 18, TypeScript, Vite, React Router
**Database** — PostgreSQL (Neon)

## Running Locally

Requires Node.js 18+ and a PostgreSQL database. A free Neon project works and takes about
two minutes to create.

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set:

- `DATABASE_URL` — your Postgres connection string (use Neon's **pooled** string)
- `JWT_SECRET` — any long random value:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Then:

```bash
npx prisma migrate dev --name init   # create schema
npm run seed                         # demo users, products, customers
npm run dev                          # http://localhost:4000
```

Check `http://localhost:4000/health`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env      # defaults to http://localhost:4000
npm run dev               # http://localhost:5173
```

The login form is pre-filled with the admin account and lists all four demo logins.

### Postman

Import `postman/ERP-CRM.postman_collection.json`. Run **1. Auth → Login as Admin** first;
it stores the JWT into a collection variable that every other request inherits.

The **5. Business Rule Checks** folder contains the negative cases — 400 validation, 401
unauthenticated, 403 wrong role, 409 duplicate SKU, 422 insufficient stock.

## Modules

**Authentication and roles.** JWT login, four roles, per-route authorisation. Passwords
hashed with bcrypt. Login returns an identical message for unknown email and wrong
password so the endpoint does not enumerate accounts.

**Customer CRM.** Full customer record including GST number, customer type and status.
Paginated list with search across name, mobile, business name and email, plus status and
type filters. Detail page with follow-up note history and recent challans.

**Products and inventory.** Product master with SKU, category, unit price, current stock,
minimum stock alert and warehouse location. Low-stock filter. Every stock change is
recorded in an append-only movement log with type, quantity, reason, author and timestamp.

**Sales challans.** Select a customer, add multiple products with quantities, save as
Draft or Confirmed. Auto-generated `CH-YYYY-NNNNNN` numbers. Confirming deducts stock
inside a transaction and refuses to let stock go negative. Line items store a snapshot of
product name, SKU and price rather than only a foreign key. Cancelling a confirmed challan
writes compensating movements to restore stock.

## Business Rules

The rules worth reviewing, with rationale in `ARCHITECTURE.md`:

1. Stock moves only on confirmation. Drafts reserve nothing.
2. Stock cannot go negative. Enforced by a conditional atomic update at the database
   level, not by a read-then-check in application code.
3. Insufficient stock returns 422 with the SKU, available quantity and required quantity.
4. `Product.currentStock` is never editable directly. It changes only alongside a logged
   movement, so the ledger always reconciles.
5. Challan line items are immutable snapshots. Later price changes do not rewrite history.
6. Cancellation compensates with offsetting movements rather than deleting records.
7. Challan numbers are allocated inside the creating transaction, so they are sequential
   and gap-free under concurrency.

## Assumptions

- Users are internal employees. There is no public self-registration; accounts are seeded.
- Roles are fixed at the four the brief specifies. There is no permission editor.
- Stock is tracked per product, not per warehouse location. The `location` field is
  descriptive.
- A draft challan places no soft reservation on stock. Two drafts can be written against
  the same units, and the first to confirm wins.
- GST number is optional and validated against the standard 15-character format when
  present.
- Prices and totals are stored as `Decimal` rather than float, to avoid rounding drift.
- Demo passwords are for evaluation only.

## Known Limitations

- No signup flow. New users cannot register themselves; accounts are provisioned through
  the seed script, which is the intended behaviour for an internal tool but means adding a
  colleague currently requires a developer.
- The API may wake slowly. On Render's free tier the backend sleeps when unused, so the
  first request after an idle period can take several seconds before the service responds
  normally.
- No automated test suite. Endpoints are covered by assertions in the Postman collection,
  which is a weaker guarantee than unit and integration tests.
- No refresh token rotation. A single one-day access token.
- No rate limiting on the login endpoint.
- Invoicing, payments and purchase orders were out of scope.
- The low-stock filter is applied in application code rather than SQL, because Prisma
  cannot compare two columns in a `where` clause.
- Challan editing is limited to drafts. Confirmed challans can only be cancelled.
- No file uploads, so no product images.
