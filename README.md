# Meridian — Pharmaceutical Catalog + Enquiry Site

A public website that showcases a company's **medicines** and lets visitors send
**enquiries**. An **admin panel** (login-gated) manages the catalog and reads the
enquiries inbox — replacing spreadsheets/Google Sheets. Optional email
notifications alert you to new enquiries.

There is **no consumer checkout and no buyer accounts** — the public browses and
enquires; only the site owner logs in.

---

## Stack

- **Next.js 15** (App Router, TypeScript) — pinned to 15 so `middleware.ts` is
  canonical (see [Upgrading to Next.js 16](#upgrading-to-nextjs-16)).
- **Tailwind CSS 3**
- **Supabase** — Postgres (catalog + enquiries), Auth (admin login), Storage
  (medicine images), via `@supabase/ssr`.
- **Zod** validation, **react-hook-form** forms.
- Optional **Resend** for enquiry email notifications (no SDK; plain REST).

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in your Supabase values

# In Supabase: run the schema (creates tables, RLS, storage bucket, seed data)
#   Dashboard → SQL Editor → paste & run supabase/schema.sql

npm run dev                    # http://localhost:3000
```

Scripts: `npm run dev` · `npm run build` · `npm run start` · `npm run typecheck` · `npm run lint`.

### Create your first admin

1. Supabase Dashboard → **Authentication → Users → Add user** (email + password).
2. Run this SQL (replace the email) to grant admin access:
   ```sql
   insert into public.admins (id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (id) do nothing;
   ```
3. Sign in at **/login** → you land in **/admin**.

---

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL (browser + server). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon key (browser + server). |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | **Server-only.** Enquiry inserts + admin writes/uploads. |
| `RESEND_API_KEY` | optional | Enables enquiry email notifications. |
| `ENQUIRY_NOTIFY_EMAIL` | optional | Where notifications are sent. |
| `ENQUIRY_FROM_EMAIL` | optional | Verified "from" address (defaults to Resend sandbox). |

Without the Resend vars, enquiries still save and appear in the admin inbox —
email is just skipped.

### Deploying on Vercel

- Add the variables above under **Project → Settings → Environment Variables**
  (Production and Preview), then redeploy. `.env.local` is never committed, so
  without them the build stops with `supabaseUrl is required`.
- [vercel.json](vercel.json) runs the server functions in **icn1 (Seoul)**, next
  to the Supabase database (ap-northeast-2). Every page and admin action makes
  several database round trips; from Vercel's default region (Washington DC)
  each one crosses the Pacific. If the Supabase project ever moves, change the
  region to match.
- Set **Settings → Git → Production Branch** to `prod`.

---

## How it works

### Public site
- **/** — home: hero, categories, featured medicines, how-it-works.
- **/medicines** — searchable, category-filterable catalog (active medicines).
- **/medicines/[id]** — medicine detail + "Enquire" button.
- **/about**, **/contact** (enquiry form + details), **/terms**, **/privacy**, **/disclaimer**.

### Enquiries
Every "Enquire" button and the contact form submit through one Server Action
([lib/actions/enquiry.ts](lib/actions/enquiry.ts)): it validates with Zod, inserts
the row via the **service-role** client (so the `enquiries` table is never
publicly writable), then fires an optional email notification. Enquiries appear
in **/admin/enquiries**, where you can mark them read / archived / delete.

### Admin panel (`/admin`, login required)
- **Dashboard** — counts (medicines, enquiries, new enquiries).
- **Medicines** — add / edit / remove, including image upload to the public
  `medicine-images` bucket, active/hidden toggle, category, strengths, pack, etc.
- **Enquiries** — the inbox.

### Access control (three layers)
1. **Middleware** ([middleware.ts](middleware.ts) → [lib/supabase/middleware.ts](lib/supabase/middleware.ts))
   refreshes the session and sends signed-out visitors of `/admin/**` to `/login`;
   everything else is public. The JWT is verified locally (`getClaims()`).
2. **Layout guard** ([lib/auth/guards.ts](lib/auth/guards.ts)) checks admin
   membership in the `/admin` layout (once per request).
3. **RLS** in Postgres is the real boundary (public reads active medicines only;
   enquiries and inactive rows are admin-only).

---

## Folder structure

```
app/
  page.tsx                 Home
  medicines/               Catalog listing + [id] detail
  about/ contact/          Public pages (contact has the enquiry form)
  terms/ privacy/ disclaimer/   Legal shells (TODO copy)
  login/                   Admin login (page + action)
  admin/                   Gated: layout, dashboard, medicines CRUD, enquiries
  auth/signout/route.ts    POST → sign out
components/
  site-header, site-footer, medicine-card, legal-page
  catalog/medicine-catalog     Search + filter (client)
  enquiry/enquiry-form, enquiry-button   Enquiry UI (client)
  admin/medicine-form, delete-medicine-button, enquiry-row-actions
  auth/login-form, ui/field
lib/
  supabase/{client,server,middleware,admin}.ts
  auth/{access,guards}.ts, routes.ts
  catalog.ts (public reads), admin/data.ts (admin reads)
  actions/enquiry.ts, validations/*, email.ts, storage.ts, site.ts
types/db.ts                Types for categories, medicines, enquiries, admins
supabase/schema.sql        Tables + RLS + storage bucket + seed + admin bootstrap
```

---

## Customising

- **Branding / contact details:** [lib/site.ts](lib/site.ts) (name, tagline,
  email, phone, WhatsApp, address, nav).
- **Theme colours:** the `brand` palette in [tailwind.config.ts](tailwind.config.ts).
- **Categories:** seeded in `supabase/schema.sql`; edit in the Supabase dashboard.
- Look for `TODO` markers for company/legal copy.

---

## Upgrading to Next.js 16

Next.js 16 renames `middleware.ts` → **`proxy.ts`** (export `proxy`). If you
upgrade, rename the root file and its export; the Supabase logic in
`lib/supabase/middleware.ts` is unchanged.
