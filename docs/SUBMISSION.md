# Submission Checklist

Mapped against the case study's stated requirements.

| # | Required | Status | Where |
|---|---|---|---|
| 1 | GitHub repository link | done | this repo |
| 2 | Live frontend URL | done | Deployed on Vercel; URL submitted with the form |
| 3 | Live backend API URL | done | Deployed on Render; URL submitted with the form |
| 4 | Test login credentials, all roles | done | `README.md` |
| 5 | Postman collection / API docs | done | `postman/` and `backend/README.md` |
| 6 | README with setup + deployment | done | `README.md`, `backend/README.md` |
| 7 | Short architecture explanation | done | `ARCHITECTURE.md` |
| 8 | Known limitations | done | `README.md` |

## Required Documentation

| Asked for | Where |
|---|---|
| How the server was set up | `ARCHITECTURE.md`, `backend/README.md` |
| How environment variables are managed | `backend/README.md` |
| How to run the project locally | `README.md` |
| How to deploy the project | `backend/README.md` |
| Any assumptions made | `README.md` |

## Core Modules

| Module | Requirement | Status |
|---|---|---|
| Auth | JWT login, 4 roles | done |
| CRM | All 10 customer fields | done |
| CRM | Add, edit, search, detail page, follow-up notes | done |
| Products | All 7 product fields | done |
| Products | Add, edit | done |
| Products | Movement log: product, qty, IN/OUT, reason, author, timestamp | done |
| Challan | Select customer, multiple products, quantities | done |
| Challan | Auto challan number | done |
| Challan | Draft / Confirmed | done |
| Challan | Confirm reduces stock | done |
| Challan | Stock cannot go negative | done |
| Challan | Proper error on insufficient stock | done, 422 |
| Challan | Product snapshot, not only ID | done |
| Challan | All 7 challan fields | done |

## API Expectations

| Requirement | Status |
|---|---|
| Clean REST APIs | done |
| Input validation | Zod on every write endpoint |
| Proper HTTP status codes | 400/401/403/404/409/422/500, table in `ARCHITECTURE.md` |
| Error messages | consistent envelope with field-level detail |
| Pagination | customers, products, challans, movements |
| Search / filter | customers, products, challans |

## Not Attempted

Bonus items, deliberately skipped given the time window:

- Docker setup
- GitHub Actions deployment
- Export invoice as PDF
- Product image upload to S3
