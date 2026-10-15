# Courtesy Desk

**Module name:** Courtesy Desk  
**Parent app:** CRM (sidebar child)  
**Purpose:** Replace Excel-based gift / welcome-kit lists with a reusable, person-based tracking system inside WiseTech.

---

## 1. One-line definition

Reusable people groups (CRM Contacts + HR Employees) → run person-based courtesy / gift drives → track handovers → export CSV / PDF.

---

## 2. Problem this replaces

Today gift / kit distribution is managed in Excel files (Diwali sweets, Ramzan Khajur, client perfume lists, etc.):

- Manual search by company / area / address
- Separate sheets per occasion and company type
- No live delivery status
- Hard to reuse the same people next festival
- No single overall dashboard or clean export

**Courtesy Desk** becomes the system of record. Excel is optional output only (via export), not the workflow.

> Reference sheets were used only to understand the real office habit. Do **not** copy their layout or columns.

---

## 3. Placement in the app

```text
CRM
 ├─ Leads
 ├─ Companies
 ├─ Contacts
 └─ Courtesy Desk          ← new module
      ├─ Overview
      ├─ People Groups
      └─ Drives
```

**Permission key (suggested):** `crm.courtesyDesk`

---

## 4. Locked product decisions

| Topic | Decision |
|--------|----------|
| Module name | **Courtesy Desk** |
| Recipients | **Both** — CRM Contacts (external) + HR Employees (internal) |
| Gift unit | **Person only** — 1 person = 1 gift / kit |
| Company-level gifts | **Not supported** |
| Messaging (WhatsApp / Telegram) | **Not needed** |
| End output | **CSV + PDF export only** |
| Print name / packing slip | **Skip completely** |
| Group naming | Yes — e.g. `Reza Peoples` |
| Drive naming | Yes — e.g. `Perfume for Reza Peoples` |
| Reuse | Yes — same People Group, new Drive (new title / gift), no re-selection |

---

## 5. Core concepts

| Term | Meaning | Example |
|------|---------|---------|
| **People Group** | Reusable list of persons | `Reza Peoples` |
| **Drive** | One gift / kit distribution run | `Perfume for Reza Peoples – Oct 2026` |
| **Recipient** | One person inside a Drive | Aabsar (Contact) |
| **Assignee** | Office person for In Person handover | Mobeen |
| **Overview** | Dashboard of drives + progress | Pending / Delivered counts |

**Why two layers (Group + Drive)?**

- **Group** = “yeh log” (stable audience)
- **Drive** = “is baar yeh gift in logon ko” (one occasion with statuses)

Reusing a group later creates a **new Drive** with the same people and **fresh statuses**. Past drives stay untouched.

---

## 6. Basic flow (core happy path)

```text
1. Create People Group
   → Search Contacts / Employees (company, area, address, name)
   → Multi-select persons
   → Name the group → Save

2. Start a Drive from that Group
   → Choose group
   → Set drive title + occasion + gift item
   → System copies current members into the drive (snapshot)

3. Track delivery (per person)
   → Status, Mode, Assignee (if In Person), optional remark

4. Export
   → CSV and / or PDF for records
```

**Reuse later:**

```text
Same People Group → New Drive → New title / gift → Track → Export
(no need to select people again)
```

---

## 7. Enhanced flow (separate)

This section is the **full recommended office flow**, including enhancements that keep the product simple but more reliable than Excel.

### 7.1 Overview (landing)

User opens **CRM → Courtesy Desk → Overview** and sees:

- Active drives
- Pending handovers
- Delivered (today / this week)
- Progress per drive (Delivered / Total)
- Year filter (e.g. 2025 / 2026)
- Quick actions: **New People Group**, **New Drive**

### 7.2 Build or reuse a People Group

1. Go to **People Groups → New** (or open an existing group).
2. Search / filter from:
   - **Contacts** — company name, area (Bandra, Govandi…), full address, person name
   - **Employees** — all staff or filtered list for welcome kits / internal gifts
3. Multi-select persons (mixed Contact + Employee in one group is allowed).
4. System blocks duplicate of the same Contact / Employee in the same group.
5. Warn / exclude anyone marked **Do not gift** (if set).
6. Name the group (e.g. `Reza Peoples`, `Bandra Clients`, `All Staff – Welcome pool`).
7. Optional short group note (e.g. “Partners only”).
8. Save. Group appears under Active groups with member count.

**Optional group actions:**

- Edit members (add / remove)
- Clone group (new name, same people)
- Archive group (hide from default list; still reusable later)

### 7.3 Start a Drive

1. Go to **Drives → New**.
2. Select an existing **People Group** (or create one first, then continue).
3. Fill:
   - **Drive title** — e.g. `Perfume for Reza Peoples`
   - **Occasion type** — Diwali / Ramzan / Welcome Kit / Client Gift / Custom
   - **Gift item** — Perfume / Khajur / Sweets / Welcome Kit / free text
   - Optional date
4. On create, system **snapshots** current group members into recipient rows:
   - All start as `Pending`
   - Each row stores person link + display fields (name, company if Contact, area / address)
5. Drive status becomes **In Progress** (or stays **Draft** until user starts tracking).

**Important:** Later edits to the People Group do **not** silently change an existing Drive.

**Optional:** Button **“Add new members from group”** if the group grew after the drive was created.

### 7.4 Track handovers

On **Drive detail**:

| Field | Rules |
|--------|--------|
| Person | From Contact or Employee |
| Source badge | `Contact` / `Employee` |
| Company | Shown when Contact has company |
| Area / Address | Read-only helper for routing |
| Gift | From drive (same for all, unless overridden later) |
| Status | `Pending` → `Out` → `Delivered` / `Skipped` |
| Mode | `In Person` / `Courier` |
| Assignee | Required when Mode = In Person |
| Remark | Optional short note |
| Skipped reason | Refused / Not available / Do not gift |

**Ops helpers:**

- Filters: Status, Assignee, Area, Source
- Bulk select → mark Delivered / assign one Assignee / set Mode
- Click person → open Contact or Employee profile
- Read-only insight where available: **Last courtesy date** (e.g. “Last gifted: Diwali 2025”)

### 7.5 Complete and export

1. When done, mark Drive **Completed**.
2. If pending rows remain, show a **warning** (do not hard-block).
3. Export:
   - **CSV** and **PDF**
   - Scope: All / only Pending / only Delivered
   - Columns: Name, Source, Company, Area/Address, Gift, Status, Mode, Assignee, Remark
   - Filename example: `Perfume_Reza_Peoples_2026-10-12.csv`
4. Optionally **Archive** the drive after export so Overview stays clean.

### 7.6 Enhanced flow diagram

```text
┌─────────────────────────────────────────────────────────────┐
│ Overview                                                    │
│  Active drives · Pending · Progress · Year filter           │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐
     │ People Groups    │          │ Drives           │
     │ reusable lists   │─────────▶│ occasion runs    │
     └────────┬─────────┘          └────────┬─────────┘
              │                             │
              │ search Contacts +           │ snapshot members
              │ Employees by company /      │
              │ area / address              ▼
              │                    ┌──────────────────┐
              │                    │ Track recipients │
              │                    │ status · mode ·  │
              │                    │ assignee · remark│
              │                    └────────┬─────────┘
              │                             │
              │                             ▼
              │                    ┌──────────────────┐
              │                    │ Export CSV / PDF │
              │                    │ Complete / Archive│
              │                    └──────────────────┘
              │
              └──▶ Later festival: same Group → New Drive
                   (new title / gift, fresh statuses)
```

---

## 8. Screens (MVP + enhanced)

| Screen | Job |
|--------|-----|
| **Overview** | Dashboard + quick create |
| **People Groups list** | All reusable groups |
| **People Group detail / editor** | Search, select, name, save |
| **Drives list** | All gift / kit runs |
| **Drive detail** | Recipient tracking table + export |
| **Export dialog** | CSV / PDF, column scope |

---

## 9. Delivery status & modes

### Status

| Status | Meaning |
|--------|---------|
| `Pending` | Not yet handed / sent |
| `Out` | Out for delivery / with assignee |
| `Delivered` | Received |
| `Skipped` | Not given (refused / unavailable / do not gift) |

### Mode

| Mode | Meaning |
|------|---------|
| `In Person` | Office person delivers — **Assignee required** |
| `Courier` | Sent by courier — Assignee optional |

### Drive lifecycle

`Draft` → `In Progress` → `Completed` → `Archived`

---

## 10. Data model (suggested)

High-level entities only (implementation detail later):

### PeopleGroup
- id, name, notes, status (Active / Archived)
- createdBy, timestamps

### PeopleGroupMember
- groupId
- memberType (`CONTACT` | `EMPLOYEE`)
- contactId **or** employeeId
- unique per (groupId + memberType + personId)

### CourtesyDrive
- id, title, occasionType, giftItem, driveDate
- sourceGroupId (reference)
- status (`DRAFT` | `IN_PROGRESS` | `COMPLETED` | `ARCHIVED`)
- createdBy, timestamps

### CourtesyRecipient
- driveId
- memberType + contactId / employeeId
- snapshot fields: name, companyName, area, address
- status, mode, assigneeEmployeeId, remark, skippedReason
- timestamps / updatedBy

Optional later:
- Do-not-gift preference on Contact / Employee
- Lightweight activity (who marked delivered)

---

## 11. Permissions (suggested)

Under CRM:

| Action | Permission |
|--------|------------|
| View Overview / lists | read |
| Create / edit Groups & Drives | write |
| Update delivery status | update |
| Export CSV / PDF | export |
| Delete / archive | delete |

Soft delete preferred so records are recoverable.

---

## 12. Explicitly out of scope

Do **not** build in v1:

- WhatsApp / Telegram notify
- Company-level gifts (office gets one box)
- Print name / packing slips
- Courier tracking APIs
- Budget vs actual
- Map / route optimization
- Multi-item quantity catalogs (Kaju Katli 0.5kg style) — unless requested later
- Chat-style “group messaging”

---

## 13. Naming alternatives (if needed)

| Name | When to use |
|------|-------------|
| **Courtesy Desk** | Recommended — professional CRM tone |
| **Gifting Desk** | If staff need the most literal word |
| **Appreciation Desk** | Warmer relationship tone |
| **Care Kits** | If focus is mostly welcome kits / hampers |

**Chosen for this document:** Courtesy Desk.

---

## 14. Success criteria

Courtesy Desk is successful when:

1. User can build a named People Group from Contacts and/or Employees by company / area / address search.
2. User can start a Drive from that group without re-selecting people.
3. User can track each person (status, mode, assignee).
4. User can reuse the same group for a future Drive with a new title / gift.
5. User can export a Drive as CSV and PDF.
6. Excel gift sheets are no longer the primary workflow.

---

## 15. Suggested implementation phases

### Phase 1 — MVP
- Sidebar entry under CRM
- People Groups (Contacts + Employees, named, reusable)
- Drives with person snapshot
- Status / Mode / Assignee
- Overview counts
- CSV + PDF export

### Phase 2 — Enhanced ops
- Bulk status / assignee update
- Do not gift warnings
- Last courtesy date insight
- Clone / archive groups
- Sync new members from group into open drive
- Year filter + assignee workload on Overview

### Phase 3 — Polish (optional)
- Stronger reports
- Activity audit trail
- Finer permissions

---

---

## 16. Prototype (frontend)

A working **frontend prototype** lives at:

- Route: `/courtesy-desk`
- Code: `src/app/pages/employee/courtesy-desk/`

**Included now**
- Overview dashboard (year filter, progress)
- People Groups (create/edit, Contacts + Employees picker, clone/archive)
- Drives (create from group snapshot, delivery tracking, bulk update, sync from group)
- Export CSV + PDF
- Demo seed data in `localStorage` (`wisetech.courtesyDesk.v1`) — use **Reset demo data** on Overview

**Not yet (backend)**
- Prisma models / APIs
- Dedicated `crm.courtesyDesk` permission (prototype reuses Contacts visibility)

*Document version: 1.1 — product specification + prototype notes for WiseTech CRM · Courtesy Desk*
