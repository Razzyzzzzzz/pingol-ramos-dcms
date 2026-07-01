# Pingol Ramos Dental Clinic — Management System

A full-stack clinic management system: **React + Tailwind** front end, **PHP REST API** (MySQLi, JWT auth), **MySQL** database.

It covers appointments, patients, online dental records with file uploads, inventory, revenue, expenses, reporting, a calendar, an AI-style assistant, notifications, and role-based access for **Admin / Dentist / Staff**.

---

## Tech stack

| Layer      | Technology |
|------------|-----------|
| Front end  | React 18, Vite 5, Tailwind CSS 3, React Router 6, Recharts, Axios, lucide-react |
| Back end   | PHP 8 (no framework), MySQLi, stateless JWT (HS256) |
| Database   | MySQL 5.7+ / MariaDB 10.4+ (InnoDB, utf8mb4) |
| Auth       | JWT bearer tokens, bcrypt password hashing, role gating |

---

## Project structure

```
pingol-ramos-dcms/
├── database/
│   ├── schema.sql          # 15 tables (run first)
│   └── seed.sql            # reference + demo data (run second) — no user accounts
├── backend/
│   ├── config.php          # env-driven config (DB, JWT, CORS, uploads)
│   ├── db.php              # MySQLi connection + response helpers
│   ├── jwt.php             # pure-PHP JWT encode/decode
│   ├── bootstrap.php       # loads everything, CORS, requireAuth()
│   ├── setup.php           # ONE-TIME account bootstrap — delete after running
│   ├── htaccess.example    # copy to .htaccess on your server
│   ├── uploads/            # patient file storage (PHP execution blocked)
│   └── api/                # 15 REST endpoints (auth, patients, appointments, …)
└── frontend/
    ├── .env.example        # copy to .env and point VITE_API_URL at your API
    ├── package.json
    └── src/
        ├── pages/          # Login, Dashboard, Appointments, Patients, …
        ├── components/     # UI primitives, layout, chatbot
        ├── context/        # Auth + Toast providers
        ├── services/       # API endpoint wrappers
        └── lib/            # axios instance + formatters
```

---

## Setup — local (XAMPP / MAMP / LAMP)

### 1. Database

Create the schema and load demo data (phpMyAdmin → Import, or CLI):

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

This creates the `pingol_ramos_dcms` database with reference data (services, dentists, suppliers) and realistic demo records. **No login accounts are created yet** — that's the next step.

### 2. Back end

1. Copy the project's `backend/` folder into your web root (e.g. `htdocs/pingol-ramos-dcms/backend`).
2. Copy `backend/htaccess.example` → `backend/.htaccess`.
3. Open `backend/config.php` and confirm the DB credentials match your MySQL (defaults: host `localhost`, db `pingol_ramos_dcms`, user `root`, empty password). For production, set the environment variables instead of editing the file (see **Configuration** below).
4. **Create the login accounts** by running the one-time setup script:
   - In a browser: `http://localhost/pingol-ramos-dcms/backend/setup.php?run=1`
   - or via CLI: `php backend/setup.php`
5. **Delete `backend/setup.php`** once the accounts exist.

### 3. Front end

```bash
cd frontend
cp .env.example .env          # then edit VITE_API_URL if your path differs
npm install
npm run dev                   # http://localhost:5173
```

The default `VITE_API_URL` is `http://localhost/pingol-ramos-dcms/backend/api`. Adjust it to wherever you placed the backend.

### 4. Sign in

| Role    | Email                      | Password     |
|---------|----------------------------|--------------|
| Admin   | admin@pingolramos.com      | `Admin@123`  |
| Dentist | dentist@pingolramos.com    | `Dentist@123`|
| Staff   | staff@pingolramos.com      | `Staff@123`  |

**Change these immediately** in Settings → Password after first login.

---

## Production build & deploy (e.g. Hostinger)

**Front end**

```bash
cd frontend
npm run build          # outputs to frontend/dist
```

Upload the contents of `frontend/dist` to your public web folder. Because the app uses client-side routing, add an `.htaccess` in that folder to route all paths to `index.html`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Set `VITE_API_URL` in `.env` to your live API URL **before** building.

**Back end**

Upload `backend/` (typically outside or alongside the public folder), copy `htaccess.example` → `.htaccess`, create the database, run `setup.php` once, then delete it. Point your production env vars (below) at the live database and set a strong `JWT_SECRET`.

---

## Configuration (environment variables)

`backend/config.php` reads these env vars and falls back to safe local defaults. Set them in your host panel or the server `.htaccess` (`SetEnv`) for production:

| Variable        | Purpose                                   |
|-----------------|-------------------------------------------|
| `DB_HOST`       | Database host                             |
| `DB_NAME`       | Database name (`pingol_ramos_dcms`)       |
| `DB_USER`       | Database user                             |
| `DB_PASS`       | Database password                         |
| `JWT_SECRET`    | **Set a long random string in production**|
| `CORS_ORIGINS`  | Comma-separated allowed front-end origins |

The front end reads a single build-time variable, `VITE_API_URL`.

---

## Feature matrix

| Module | Status | Notes |
|--------|--------|-------|
| JWT auth + roles (Admin/Dentist/Staff) | ✅ Built | Login, token refresh on boot, forgot-password endpoint, change password |
| Admin dashboard | ✅ Built | 10 stat cards + 4 charts + recent-activity feeds |
| Appointment management | ✅ Built | Filter/search, create/edit, inline status change, double-booking guard, print |
| Calendar | ✅ Built | Custom month grid, per-day appointment view |
| Patients | ✅ Built | Search, full CRUD, medical info |
| Patient detail + timeline | ✅ Built | Appointments, treatments, files, payments tabs |
| Online dental records (uploads) | ✅ Built | Secure upload (MIME-sniffed), in-app preview, download |
| Treatments (clinical records) | ✅ Built | Per-patient, linked to dentist/appointment |
| Inventory | ✅ Built | Stock states, low/out/expired filters, reorder alerts |
| Revenue / payments | ✅ Built | Daily/weekly/monthly/annual, method breakdown, trend |
| Expenses | ✅ Built | Category breakdown + trend, CRUD |
| Reports | ✅ Built | Preview, CSV export, print (patients, appts, revenue, expenses, inventory) |
| Global search | ✅ Built | Topbar search → patient directory |
| Notifications | ✅ Built | Bell with polling, low-stock & payment alerts |
| AI assistant (chatbot) | ✅ Built | Floating assistant; rule-based FAQ over live clinic data |
| Settings | ✅ Built | Clinic info, password, admin user management |
| Print support | ✅ Built | Appointments, full patient record, all reports |

### Possible next steps
- Swap the rule-based assistant for a hosted LLM endpoint.
- Add password-reset **email** delivery (the reset-token endpoint already exists).
- Native XLSX/PDF export (currently CSV + print-to-PDF).
- SMS/email appointment reminders.

---

## Security notes

- **Passwords** are hashed with bcrypt (`password_hash`); plain passwords are never stored.
- **Auth** uses stateless JWTs sent as `Authorization: Bearer` headers — set a strong `JWT_SECRET` in production.
- **SQL**: all writes use prepared statements; list filters are sanitised.
- **Uploads**: files are MIME-sniffed with `finfo`, matched to an extension whitelist, size-capped (10 MB), renamed to unguessable names, and stored in a directory where PHP execution is blocked. Files are streamed back only through the authenticated endpoint.
- **CORS** is restricted to the origins in `CORS_ORIGINS`.
- **Delete `backend/setup.php`** after creating accounts — it is guarded and idempotent, but should not remain on a live server.
- Sensitive PHP includes (`config.php`, `db.php`, `jwt.php`, `bootstrap.php`) and `.sql` files are denied direct web access by the shipped `.htaccess`.

---

## API overview

All endpoints live under `backend/api/` and return a consistent envelope:

```json
{ "success": true, "message": "", "data": { } }
```

Auth is required on every endpoint except `auth.php?action=login|forgot-password|reset-password`. Send the token as `Authorization: Bearer <token>`.

Key endpoints: `auth.php`, `dashboard.php`, `patients.php`, `appointments.php`, `treatments.php`, `dental_records.php`, `inventory.php`, `payments.php`, `expenses.php`, `lookups.php`, `users.php`, `settings.php`, `notifications.php`, `chatbot.php`.

---

© Pingol Ramos Dental Clinic. Built as a complete, runnable v1.
