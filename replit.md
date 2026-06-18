# PAP Hostel App — Golden Beach Guest House

Sistema de Auto Check-in Digital para o Golden Beach Guest House, Faro, Portugal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/hostel-app run dev` — run the frontend (Vite MPA)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vanilla HTML5 / CSS3 / JavaScript (ES6+) served via Vite MPA
- API: Express 5 (api-server artifact)
- Firebase: Firestore + Firebase Auth (client-side via CDN)
- Integrations: TTLock API (smart door lock codes), Nodemailer (SMTP email), PDFKit (invoice PDF)

## Where things live

- `artifacts/hostel-app/public/` — all HTML pages, CSS, JS, images, and videos
- `artifacts/hostel-app/public/js/firebase.js` — Firebase client config (credentials hardcoded)
- `artifacts/api-server/src/routes/hostel.ts` — all hostel API routes (TTLock, PDF, email)
- `artifacts/api-server/src/lib/ttlock.ts` — TTLock API integration
- `lib/api-spec/openapi.yaml` — API contract (healthz endpoint only; hostel routes are Express-only)

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Landing page with video background |
| Self Check-in | `selfcheckin.html` | Guest digital check-in |
| Booking | `booking.html` | 3-step room booking wizard |
| Payment | `payment.html` | Payment + PDF invoice generation |
| Register | `register.html` | Guest account creation |
| Client Area | `client.html` | Guest dashboard |
| Admin Panel | `admin.html` | Admin dashboard |
| Staff Panel | `staff.html` | Staff dashboard |
| Login (Admin) | `login-admin.html` | Admin login |
| Login (Staff) | `login-staff.html` | Staff login |

## API Routes

All routes prefixed with `/api`:

- `GET /api/healthz` — health check
- `GET /api/config` — app config (TTLock mode, email mode)
- `POST /api/gerar-codigo` — generate TTLock door access code
- `POST /api/generate-invoice-pdf` — generate PDF invoice (base64)
- `POST /api/send-invoice` — send invoice PDF by email
- `POST /api/send-ttlock-code` — send TTLock code by email
- `POST /api/test-email` — test email configuration

## Architecture decisions

- Vite serves as a Multi-Page App (MPA) server for the vanilla HTML/CSS/JS frontend — no React or component bundling
- Firebase Firestore is used for all data persistence (bookings, rooms, users) — no PostgreSQL needed
- TTLock runs in `simulado` (simulated) mode by default; set `TTLOCK_MODE=real` for production hardware
- pdfkit and node-fetch are externalized in `build.mjs` to avoid CJS/ESM issues with fontkit
- Email defaults to `log` mode; set `EMAIL_MODE=real` + SMTP env vars to send real emails

## Environment Variables (Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Optional | SMTP server (default: smtp.gmail.com) |
| `SMTP_USER` | Optional | SMTP username |
| `SMTP_PASS` | Optional | SMTP password |
| `SMTP_FROM` | Optional | Sender email address |
| `SMTP_PORT` | Optional | SMTP port (default: 587) |
| `EMAIL_MODE` | Optional | `real` or `log` (default: log) |
| `TTLOCK_MODE` | Optional | `real` or `simulado` (default: simulado) |
| `TTLOCK_CLIENT_ID` | Optional | TTLock API client ID |
| `TTLOCK_CLIENT_SECRET` | Optional | TTLock API client secret |
| `TTLOCK_USERNAME` | Optional | TTLock account username |
| `TTLOCK_PASSWORD` | Optional | TTLock account password |

## Gotchas

- Firebase service account key (`serviceAccountKey.json`) is NOT in the repo — Firebase Admin SDK is not set up server-side; Firebase client SDK works via CDN in the browser
- Do NOT run `pnpm dev` at workspace root — each artifact needs `PORT` and `BASE_PATH` wired by the workflow
- pdfkit must stay externalized in `build.mjs` — fontkit (a pdfkit dependency) has CJS helpers that break ESM bundling

## User preferences

_Populate as you build._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
