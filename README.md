# SiteOps — Enterprise Construction Management Platform
> Modeled on **Onsite Teams** (`web.onsiteteams.com`) — Connecting Office Executives and Site Field Teams in a single system.

---

## 1. System Architecture

- **Backend:** Python 3.12 + Django 5.1 + Django REST Framework + SimpleJWT + DRF Spectacular (Swagger/OpenAPI).
- **Web Frontend:** React 18 + Vite + Tailwind CSS + Lucide Icons (Red & White construction safety design system).
- **Mobile Companion:** Flutter single codebase (iOS & Android) with GPS Geofencing Radar, offline-first sync queue, quick DPR entry, and photo eSnagging.
- **Multi-Tenancy:** Row-level organization tenancy via `TenantModel` base class on every entity.
- **Security & RBAC:** Configurable 11-role permission matrix (`Module × Action`) with field-level cost masking for restricted roles.

---

## 2. Quick Start

### Backend (Python / Django)
```bash
# 1. Activate virtual environment
cd backend
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/Mac

# 2. Run migrations
python manage.py migrate

# 3. Seed realistic enterprise construction dataset
python manage.py seed_siteops_demo

# 4. Start DRF development server
python manage.py runserver 8000
```
- **API Base:** `http://localhost:8000/api/v1/`
- **Swagger Documentation:** `http://localhost:8000/api/docs/`
- **Admin Panel:** `http://localhost:8000/admin/`

### Web Frontend (Desktop & Mobile Simulation)
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 3. Seed User Accounts & Roles

All accounts come pre-configured in the database with password **`Password123!`**:

| Role | Email | Scope | Key Capabilities |
|---|---|---|---|
| **Super Admin** | `admin@siteops.io` | Organization | Full system administration, billing, and all modules |
| **Owner / Director** | `owner@siteops.io` | Organization | Executive portfolio metrics, high-value approvals (> ₹50 Lakhs) |
| **Project Manager** | `pm@siteops.io` | Assigned Projects | WBS schedule, BOQ budget vs actual, PO approvals, DPR review |
| **Site Engineer** | `site@siteops.io` | Site | DPR submission, eSnagging defect logging, GPS attendance, material requests |
| **Finance / Accounts** | `finance@siteops.io` | Organization | 3-Way match verification (PO vs GRN vs Invoice), payments, vendor ledger |
| **Procurement Officer** | `procure@siteops.io` | Organization | Material requests to RFQ, vendor quotes, Purchase Order issuance |
| **Store Keeper** | `store@siteops.io` | Site | Goods Receipt Note (GRN) verification at gate, inventory stock issues |
| **Client (Viewer)** | `client@siteops.io` | Assigned Project | Read-only milestone progress & photos (financial costs masked) |

---

## 4. Key Workflows Implemented

### 1. Procurement 7-Step Loop
1. **Material Request:** Site Engineer raises request (`MR-0012` for 40 MT TMT Steel).
2. **Approval:** PM authorizes request based on threshold.
3. **RFQ:** Multi-vendor quotes compared (Tata Tiscon vs UltraTech).
4. **Purchase Order:** `PO-0089` issued to selected supplier.
5. **Site GRN:** Gatekeeper verifies weighbridge ticket & mill test certificate (`GRN-0045`).
6. **3-Way Match:** Automated check matching PO rate vs GRN accepted goods vs Invoice billed total.
7. **Ledger & Stock:** Vendor balance updated and yard inventory incremented.

### 2. GPS Geofenced Attendance
- Mathematical **Haversine formula** calculates worker distance to site latitude/longitude in meters.
- Verified clock-ins flag `is_inside_geofence: True` only within site radius (e.g. 300m).
- Automatic weekly payroll calculation: $(\text{Days Worked} \times \text{Daily Wage}) + (\text{OT Hours} \times \text{OT Rate})$.

### 3. Site Execution (DPR & eSnagging)
- **Daily Progress Reports (DPR):** Work summary, weather conditions, manpower tally by trade (38 workers), materials consumed, delay reasons, and PM sign-off.
- **eSnagging:** Photo-based issue logging, severity classification (`CRITICAL`, `MAJOR`, `MINOR`), rectification proof, and verification sign-off.

### 4. Generalized Approvals Engine
- Value-based threshold routing:
  - Tier 1 ($\le$ ₹25,000): Site Engineer / Supervisor
  - Tier 2 ($\le$ ₹5,00,000): Project Manager
  - Tier 3 ($>$ ₹5,00,000 to ₹5 Cr): Owner / Director
- Complete immutable audit log of actor, timestamp, action, and review comments.
