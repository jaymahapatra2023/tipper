# Tipper - Hotel Tipping Web Application

## Context

Build a modern, responsive web application that allows hotel guests to tip cleaning staff digitally. Guests scan a QR code in their hotel room, confirm their stay details, choose a tip amount, and pay via Stripe. Staff view earnings and manage room assignments. Hotel admins manage staff, rooms, QR codes, and analytics. The MVP focuses on hotel tipping, with a general-purpose tipping platform planned for Phase 2.

**Key Decisions:**

- Frontend: React + Next.js (App Router)
- Backend: Node.js + Express
- Database: PostgreSQL on AWS RDS
- Payments: Stripe Connect (destination charges)
- Hotel Detection: QR codes in rooms (opaque tokens)
- Deployment: AWS ECS Fargate
- Guest Auth: Optional (tip without account)

---

## 1. Epics & User Stories

### Epic 1: Guest Tipping Flow (MVP Core)

| ID   | Story                                                                                   | Acceptance Criteria                                                         |
| ---- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| G-1  | As a guest, I scan a QR code and land on a tipping page pre-populated with hotel + room | Page loads with hotel name, room number pre-filled; invalid QR shows error  |
| G-2  | As a guest, I can confirm or correct my room number                                     | Room number field is editable; validated against hotel's room list          |
| G-3  | As a guest, I enter my check-in and check-out dates                                     | Date picker enforces check-in < check-out                                   |
| G-4  | As a guest, I choose to tip per-day OR flat amount                                      | Toggle between modes; per-day shows calculated total                        |
| G-5  | As a guest, I select suggested amounts or enter custom                                  | Suggested amounts configurable per hotel (e.g., $5, $10, $15); custom >= $1 |
| G-6  | As a guest, I leave an optional message for staff                                       | Textarea, max 500 chars, sanitized                                          |
| G-7  | As a guest, I pay via credit card, Apple Pay, or Google Pay                             | Stripe Payment Element; all methods functional                              |
| G-8  | As a guest, I see a confirmation screen after payment                                   | Shows tip amount, hotel, room, date                                         |
| G-9  | As a guest, I can optionally enter email for receipt                                    | Receipt sent within 60 seconds via SES                                      |
| G-10 | As a guest, I can optionally create an account for tip history                          | OAuth (Google) or email/password; links tip to account                      |

### Epic 2: Staff Portal

| ID  | Story                                                   | Acceptance Criteria                                        |
| --- | ------------------------------------------------------- | ---------------------------------------------------------- |
| S-1 | As staff, I log in with credentials from hotel admin    | Email + password login; redirect to dashboard              |
| S-2 | As staff, I see a dashboard of tips received            | List with date, room, amount, message; sortable/filterable |
| S-3 | As staff, I see total earnings for configurable periods | Week, month, year, custom; gross/net breakdown             |
| S-4 | As staff, I claim rooms I cleaned on a given date       | Date + room selector; prevents double-claiming             |
| S-5 | As staff, I view my room assignments                    | List of assignments from admin                             |
| S-6 | As staff, I opt into/out of tip pooling                 | Toggle with explanation                                    |
| S-7 | As staff, I set up my bank account for payouts          | Stripe Connect Express onboarding                          |

### Epic 3: Hotel Admin Portal

| ID  | Story                                                        | Acceptance Criteria                         |
| --- | ------------------------------------------------------------ | ------------------------------------------- |
| A-1 | As admin, I register my hotel on the platform                | Form: name, address, contact, rooms, floors |
| A-2 | As admin, I manage cleaning staff (CRUD)                     | Deactivation preserves tip history          |
| A-3 | As admin, I assign staff to rooms/floors                     | Bulk assignment by floor supported          |
| A-4 | As admin, I bulk import staff via CSV                        | Template downloadable; validation report    |
| A-5 | As admin, I generate/download QR codes for all rooms         | PDF (one per page) or ZIP of PNGs           |
| A-6 | As admin, I view analytics (total tips, per-room, per-staff) | Charts with date range filter; CSV export   |
| A-7 | As admin, I configure tip pooling rules                      | Enable/disable; equal or weighted split     |
| A-8 | As admin, I configure suggested tip amounts                  | Set 3 defaults; set min/max custom          |
| A-9 | As admin, I regenerate QR codes if compromised               | Regenerate invalidates old QR               |

### Epic 4: Platform Administration

| ID  | Story                                                   | Acceptance Criteria                   |
| --- | ------------------------------------------------------- | ------------------------------------- |
| P-1 | As platform admin, I view all hotels                    | Searchable, sortable list             |
| P-2 | As platform admin, I approve/reject hotel registrations | Review queue with approve/reject      |
| P-3 | As platform admin, I configure platform fee percentage  | Global default + per-hotel override   |
| P-4 | As platform admin, I view platform-wide analytics       | Total volume, revenue, growth metrics |

### Epic 5: Notifications & Receipts

| ID  | Story                                     | Acceptance Criteria                  |
| --- | ----------------------------------------- | ------------------------------------ |
| N-1 | Guest receives email receipt when tipping | Transactional email with tip details |
| N-2 | Staff receives notification on new tip    | In-app + optional email              |
| N-3 | Staff receives notification on payout     | Email with amount and ETA            |

---

## 2. Data Model (PostgreSQL)

### Core Tables

- **users** - All roles (guest, staff, hotel_admin, platform_admin) with email, password_hash, role
- **oauth_accounts** - Google/Apple OAuth linked to users
- **hotels** - Name, address, status, Stripe Connect account, pooling config, suggested amounts
- **hotel_admins** - Join table: user <-> hotel
- **rooms** - hotel_id, room_number, floor, room_type
- **qr_codes** - room_id, opaque `code` token (12-char hex), status (active/revoked), scan_count
- **staff_members** - user_id, hotel_id, Stripe Connect account, pool opt-in status
- **room_assignments** - staff_member_id, room_id, assigned_date, is_claimed
- **tips** - hotel_id, room_id, guest info, tip_method (per_day/flat), amount, Stripe PaymentIntent ID, status
- **tip_distributions** - tip_id, staff_member_id, amount (how a tip is split)
- **payouts** - staff_member_id, amount, Stripe transfer ID, status
- **platform_settings** - default platform fee
- **audit_logs** - user_id, action, entity_type, entity_id, metadata

### Key Relationships

```
users 1--N staff_members, hotel_admins
hotels 1--N rooms, staff_members, tips
rooms 1--N qr_codes, room_assignments, tips
staff_members 1--N room_assignments, tip_distributions, payouts
tips 1--N tip_distributions
```

---

## 3. API Design (REST, base: `/api/v1`)

### Public

- `GET /qr/:code` - Resolve QR to hotel + room info
- `POST /tips` - Create tip (initiates Stripe payment)
- `GET /tips/:id/status` - Check payment status
- `POST /tips/:id/receipt` - Send receipt email

### Auth

- `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`
- `POST /auth/forgot-password`, `/auth/reset-password`
- `POST /auth/oauth/google`

### Staff (authenticated)

- `GET /staff/dashboard`, `/staff/tips`, `/staff/assignments`, `/staff/payouts`
- `POST /staff/assignments/:id/claim`
- `PUT /staff/pool-opt-in`
- `POST /staff/stripe/onboard`

### Hotel Admin (authenticated)

- `GET|PUT /admin/hotel`, `/admin/hotel/settings`
- CRUD: `/admin/staff`, `/admin/rooms`, `/admin/assignments`
- `POST /admin/staff/import` (CSV)
- `GET /admin/rooms/:id/qr`, `POST /admin/rooms/:id/qr/regenerate`
- `POST /admin/qr/batch` (ZIP download)
- `GET /admin/analytics/overview|rooms|staff|export`

### Platform Admin (authenticated)

- `GET /platform/hotels`, `PUT /platform/hotels/:id/approve|suspend`
- `GET /platform/analytics`, `PUT /platform/settings`

### Webhooks

- `POST /webhooks/stripe` - Stripe webhook handler

---

## 4. Project Structure (Turborepo Monorepo)

```
Tipper/
├── turbo.json, package.json, pnpm-workspace.yaml
├── docker-compose.yml              # Local PostgreSQL + Redis
├── apps/
│   ├── web/                        # Next.js 16 (App Router)
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (guest)/tip/[code]/page.tsx    # QR landing + tipping
│   │       │   ├── (auth)/login|register/
│   │       │   ├── (staff)/dashboard|tips|assignments|payouts|settings/
│   │       │   ├── (admin)/dashboard|staff|rooms|qr-codes|analytics|settings/
│   │       │   └── (platform)/hotels|analytics|settings/
│   │       ├── components/{ui,guest,staff,admin,shared}/
│   │       ├── hooks/
│   │       └── lib/
│   └── api/                        # Express.js backend
│       └── src/
│           ├── routes/, controllers/, services/, validators/
│           ├── middleware/ (auth, rbac, rateLimiter, errorHandler)
│           └── config/ (env, database, stripe, email)
├── packages/
│   ├── database/                   # Prisma schema, migrations, seed
│   ├── shared/                     # Types, constants, Zod schemas
│   ├── email-templates/            # React Email templates
│   ├── eslint-config/
│   └── typescript-config/
└── infrastructure/
    └── terraform/modules/ (vpc, rds, ecs, alb, ecr, cloudfront, s3, ses, secrets-manager)
```

---

## 5. Tech Stack

| Layer         | Tech                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| Frontend      | Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, React Hook Form, Zod |
| Payments UI   | @stripe/stripe-js + @stripe/react-stripe-js (Payment Element)           |
| Charts        | Recharts                                                                |
| Backend       | Node.js 22 LTS, Express 5, TypeScript, Prisma 7, Zod                    |
| Auth          | JWT (jsonwebtoken + bcryptjs), Auth.js v5 on frontend                   |
| Email         | React Email + AWS SES                                                   |
| QR Generation | `qrcode` (Node), `qrcode.react` (frontend)                              |
| Monorepo      | Turborepo + pnpm                                                        |
| Testing       | Vitest (unit/integration), Playwright (E2E)                             |
| CI/CD         | GitHub Actions                                                          |
| Linting       | ESLint, Prettier, Husky + lint-staged, Commitlint                       |

---

## 6. AWS Architecture

```
Route 53 → CloudFront → ALB → ECS Fargate (web:3000, api:4000)
                                    ↓
                         RDS PostgreSQL (private subnet)
                         ElastiCache Redis (caching, rate limiting)
                         S3 (QR images, CSV uploads)
                         SES (transactional email)
                         Secrets Manager (Stripe keys, DB creds)
```

- **VPC**: Public subnets (ALB), private subnets (ECS, RDS, Redis)
- **WAF**: On ALB for rate limiting, SQL injection protection
- **CloudWatch**: Logging, metrics, alarms
- **ACM**: SSL certs
- **Estimated staging cost**: ~$85/mo

---

## 7. QR Code Strategy

- Each QR encodes: `https://tipper.app/tip/{opaque-12-char-hex-token}`
- Opaque tokens (not room/hotel IDs) for security + revocability
- Resolution: `GET /api/v1/qr/:code` → joins rooms + hotels → returns hotel name, room number, suggested amounts
- Admin can regenerate codes (revokes old, creates new)
- Batch download as PDF (one per page) or ZIP of PNGs

---

## 8. Stripe Connect Integration

- **Model**: Destination Charges (Tipper is merchant of record)
- **Flow**: Guest pays → Tipper takes platform fee → remainder transfers to hotel's connected account → hotel distributes to staff
- **Onboarding**: Hotels and staff each complete Stripe Express onboarding
- **Tip Distribution**: Direct to assigned staff OR pooled among opted-in staff
- **Payouts**: Daily scheduled job creates Stripe Transfers to staff accounts
- **Webhooks**: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `account.updated`, `payout.paid/failed`

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

- Initialize Turborepo monorepo with pnpm
- Scaffold Next.js app + Express API
- Set up shared packages (database, shared, configs)
- Prisma schema + initial migration + seed script
- docker-compose for local PostgreSQL
- User auth (register, login, JWT) + RBAC middleware
- Husky, lint-staged, commitlint, GitHub Actions CI

### Phase 2: QR + Guest Tipping MVP (Weeks 3-4)

- QR code generation service + admin endpoints
- QR scan resolution endpoint
- Guest tipping page (multi-step form: room confirm → dates → amount → message → payment)
- Stripe test mode integration (Payment Element + PaymentIntent)
- Confirmation/receipt page
- Mobile-first responsive design

### Phase 3: Stripe Connect (Weeks 5-6)

- Hotel + staff Stripe Express onboarding
- Destination charges with platform fee
- Tip distribution logic (direct + pooled)
- Webhook handler for payment events
- Edge cases: failures, refunds, disputes

### Phase 4: Staff Portal (Weeks 7-8)

- Staff dashboard, tip history, earnings
- Room assignment view + claiming
- Pool opt-in/out
- Stripe onboarding for staff bank accounts
- Payout history

### Phase 5: Hotel Admin Portal (Weeks 9-11)

- Staff CRUD + CSV import
- Room management + QR batch generation
- Room assignment management
- Tip pooling configuration
- Analytics dashboard (Recharts) + CSV export

### Phase 6: Email Notifications (Week 12)

- React Email templates (receipt, tip notification, payout, welcome, password reset)
- SES integration

### Phase 7: Platform Admin + Polish (Weeks 13-14)

- Hotel approval workflow, platform analytics, global settings
- Audit logging, security hardening, rate limiting
- Accessibility audit (WCAG 2.1 AA)

### Phase 8: Infrastructure + Deployment (Weeks 15-16)

- Terraform modules (VPC, RDS, ECS, ALB, CloudFront, ECR, S3, SES, Secrets Manager)
- Dockerfiles (multi-stage builds)
- GitHub Actions deploy pipelines (staging + prod)
- Auto-scaling, CloudWatch alarms, load testing

---

## 10. Security

- **PCI**: Never touch card data; Stripe Payment Element handles all card input (SAQ-A eligible)
- **Auth**: bcrypt (cost 12), JWT (15min access + 7day refresh in httpOnly cookies), RBAC middleware
- **Data**: RDS encryption at rest, TLS everywhere, Secrets Manager for credentials
- **API**: Rate limiting, Zod validation, Prisma (no SQL injection), Helmet security headers, CORS whitelist
- **Stripe**: Webhook signature verification, idempotency keys, server-side amount validation
- **Infra**: Private subnets for ECS/RDS, WAF on ALB, least-privilege IAM roles
- **Monitoring**: Sentry error tracking, CloudWatch alarms, audit log table

---

## Verification Plan

1. **Local dev**: `docker-compose up` for PostgreSQL → `pnpm dev` runs both Next.js + Express
2. **Guest flow**: Seed demo hotel → generate QR → scan URL → complete tipping with Stripe test card `4242424242424242`
3. **Staff flow**: Login as seeded staff → verify dashboard shows tip → claim room
4. **Admin flow**: Login as admin → add staff, rooms → generate QR codes → view analytics
5. **Payments**: Use Stripe Dashboard (test mode) to verify PaymentIntents, transfers, connected accounts
6. **Tests**: `pnpm test` runs Vitest unit/integration tests; `pnpm test:e2e` runs Playwright
7. **Deploy**: Terraform apply to staging → smoke test all flows → promote to production
