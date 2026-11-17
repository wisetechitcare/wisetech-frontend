# Export & Download Architecture Audit

**Date:** 2026-11-14 · **Scope:** `wisetech-frontend` + `wisetech-backend` · **Status:** audit only, nothing changed.

Path prefixes used throughout: **FE** = `wisetech-frontend/src/`, **BE** = `wisetech-backend/src/`.
Items marked ✅ were re-checked by reading the code after the initial sweep; items marked *(unverified)* could not be confirmed from code alone.

---

## 0. Summary

| Area | Finding |
|---|---|
| Excel / CSV | All generated **in the browser**; no backend endpoint produces a spreadsheet. One shared engine (`ExportButton`) plus one bespoke payslip workbook. |
| PDF | Three engines: server **Puppeteer** (HTML → PDF, 7 features), server **Word COM** (DOCX → PDF, lead proposals, Windows-only), browser **jsPDF** (reports table, Company Profile) and **@react-pdf** (organization report). |
| Word | Two engines: HTML-wrapped `.doc` (billing documents) and docxtemplater `.docx` (lead proposals). |
| Pagination | 4 server-paginated tables export **only the current page**; 4 billing reports **silently cap at 1,000 rows**. |
| Security | 1 arbitrary-file-read/SSRF, public-read salary slips and proposals, billing scope with **no tenant filter** for "view all" roles, HTML injection into Puppeteer, a handler that never responds on error. |
| Duplication | ~15 hand-rolled blob downloads beside 3 shared helpers; 4 CSV builders with different escaping; download headers hand-set in 10 backend handlers; 5+ HTML escapers. |
| Dead code | 2 FE export modules, 4 dead export UIs, 1 endpoint with no route, 5 BE export files/functions, 5 FE + 3 BE unused dependencies. |
| Recommendation | **Hybrid**, not one generic endpoint: shared generators + shared download helpers, while each feature keeps its own endpoint for permissions, tenant scope and data loading. |

---

## 1. Frontend export inventory

### 1.1 Files generated in the browser

| # | Location | Function | Format | Library | Used by |
|---|---|---|---|---|---|
| 1 | FE `app/modules/common/components/ExportButton.tsx:192-234` | `exportCsv` | CSV (BOM, CRLF, formula-neutralised) | file-saver | ExportButton, `ReportExportToolbar.tsx:88` |
| 2 | `ExportButton.tsx:274-419` | `exportXlsx` | XLSX (styled, currency numFmt) | exceljs (dynamic, :284) + file-saver | ExportButton, `ReportExportToolbar.tsx:87` |
| 3 | `ExportButton.tsx:423-521` | `ExportButton` | xlsx / csv menu | — | MaterialTable built-in export (`MaterialTableImpl.tsx:2520-2531`, ~76 tables); `renderExportActions` overrides in `EntityTablePage.tsx:2566`, `LeadNewLead.tsx:1779`, `ProjectTablePage.tsx:1028`, `MonthlySalary.tsx:315`, `YearlySalary.tsx:382`; direct in `SalaryBreakdownTable.tsx:230`, `LineItemExportButton.tsx:92`; DS DataTable via `table/DataTableExport.tsx:74` (7 reimbursement screens) |
| 4 | FE `app/pages/billing/reports/shared/ReportExportToolbar.tsx:37-72` | `exportPdf` | PDF table | jspdf + jspdf-autotable (dynamic) | 7 billing report pages |
| 5 | `ReportExportToolbar.tsx:112,164` | Print | `window.print()` | browser | same |
| 6 | FE `modules/payroll/utils/salarySlipExport.ts:880-1603` | `downloadSalarySlipXlsx` | XLSX payslip with formulas | exceljs + file-saver | `SalarySlipSection.tsx:155` (admin) |
| 7 | `salarySlipExport.ts:1624-1843` | `downloadSalarySlipCsv` | CSV | file-saver | `SalarySlipSection.tsx:156` |
| 8 | FE `app/pages/employee/company-profile/DeckExport.tsx` | `DeckExport` | PDF (one JPEG per slide) | modern-screenshot + jspdf | Company Profile page |
| 9 | FE `app/pages/company/organization/OrganizationInfo.tsx:38-101` | `handleDownloadPdf` | PDF | @react-pdf/renderer (**static import**) | Organization profile |
| 10 | FE `app/pages/employee/components/idcard/EmployeeIdCardDialog.tsx:59-68` | `handleDownload` | PNG (SVG → canvas) | `utils/svgExport.ts` | ID card dialog (data from the JSON endpoint, §2 #14) |
| 11 | FE `app/pages/employee/leads/lead/CsvUploadStep.tsx:138-142` | `downloadTemplate` | CSV header template | `downloadBlob` | Lead bulk import, legacy migration |
| 12 | FE `app/pages/employee/recruitment/CandidateDrawer.tsx:97-105` | `downloadJson` | JSON (subject-access export) | hand-rolled | Candidate drawer |
| 13 | FE `app/modules/common/components/SecurityPin/DeveloperMfaEnrollForm.tsx:222-240` | recovery codes | TXT | hand-rolled | MFA enrolment |
| 14 | FE `app/pages/employee/leads/lead/components/dms/services/dmsService.ts:90-106` | `downloadDocumentsAsZip` | ZIP of S3 files | jszip + file-saver | DMS toolbar |
| 15 | FE `…/dms/components/DocumentCard.tsx:86-95`, `FileDetailsSidebar.tsx:70-79` | `handleDownload` fallback | **fake 14-byte `.docx`** when `s3Url` is missing | hand-rolled | DMS menus (bug) |
| 16 | FE `app/pages/employee/courtesy-desk/utils/exportDrive.ts` | `downloadCsv`, `downloadPdf` | CSV / PDF | jspdf | **dead** (no importer) |

### 1.2 Files fetched from the backend

| # | FE service | Endpoint | Response | UI caller | Save method |
|---|---|---|---|---|---|
| 1 | `services/proformas.ts:202` `accessProforma` | POST `/api/billing/proformas/:id/access` | JSON `{url}` | ProformasPage, ProformaDetailPage | `window.open` |
| 2 | `services/proformas.ts:218` `downloadWord` | GET `/api/billing/proformas/:id/download-word` | blob | ProformaDetailPage, DocumentEditorPage | hand-rolled |
| 3 | `services/taxInvoices.ts:34` `accessInvoice` | POST `/api/billing/tax-invoices/:id/access` | JSON `{url}` | InvoicesPage | `window.open` |
| 4 | `services/taxInvoices.ts:45` `downloadInvoiceWord` | GET `/api/billing/tax-invoices/:id/download-word` | blob | InvoicesPage | hand-rolled (identical to #2) |
| 5 | `services/documents.ts:141` `generateDocumentPdf` | POST `/api/documents/:id/pdf` | JSON `{url}` | DocumentEditorPage | `window.open` |
| 6 | `services/payments.ts:322` `getAttachmentLink` | GET `/api/billing/payments/:id/attachments/:attachmentId` | JSON `{url}` | PaymentDetailPage | `window.open` |
| 7 | `services/employee.ts:1065` `fetchBirthdayCardImage` | GET `/api/employee/birthday-card/:kind/:id/image` | blob PNG | BirthdayCardDialog | `downloadBlob` |
| 8 | `services/employee.ts:1144` `downloadDocumentFile` | GET `/api/employee/documents/vault/:employeeId/file/:documentId` | blob | DocumentDownloadButton, DocumentPreviewDialog | `saveBlob` |
| 9 | `services/employee.ts:1154` `downloadDocumentArchive` | GET `/api/employee/documents/vault/:employeeId/archive` | blob ZIP | DocumentVaultView | `saveBlob` |
| 10 | `services/employee.ts:2321` `downloadReimbursementBillPdf` | GET `/api/reimbursements/:batchId/download-bill` | blob | ReimbursementBatchShared, SubmissionsTable | mixed |
| 11 | `services/employee.ts:2329` `downloadEmployeePeriodBillPdf` | GET `/api/reimbursements/employee/:employeeId/download-bill?from&to&label` | blob | ReimbursementWorkspace | hand-rolled |
| 12 | `modules/payroll/services/payrollService.ts:229` `downloadSalarySlip` | GET `/api/payroll/salary/:salaryId/download-slip` | blob | SalarySlipSection | hand-rolled |
| 13 | `payrollService.ts:241` `downloadSalarySlipForPeriod` | GET `/api/payroll/salary-slip?employeeId&month&year` | blob | SalarySlipSection | hand-rolled |
| 14 | `payrollService.ts:260` `downloadContractBill` | GET `/api/payroll/salary/:salaryId/download-contract-bill` | blob | SalarySlipSection | hand-rolled, URL never revoked |
| 15 | `services/leads.ts:290 / 308` `exportLeadDocx` / `exportLeadPdf` | POST `/api/leads/export/docx` · `/pdf` | blob | ProposalTemplatePage (via ExportCenterModal) | hand-rolled |
| 16 | `services/meetingAgendaMom.ts:188` `downloadMeetingMinutesPdf` | GET `/api/employee/meetings/:meetingId/minutes/pdf` | blob | MeetingsAgendaHubTab | hand-rolled |
| 17 | `services/companyCatalogues.ts:62` `getCompanyCatalogueFile` | GET `/api/lead-project-companies/client-companies/:companyId/catalogues/:catalogueId/file` | blob | preview rendering only; user download is `window.open(c.downloadUrl)` | n/a |
| 18 | `dmsService.ts:17` `downloadDocument` | GET presigned S3 URL | blob | DMS | hand-rolled |
| 19 | `services/projects.ts:804 / 817` `exportProjectDocx` / `exportProjectPdf` | POST `/api/projects/export/docx` · `/pdf` | — | **none** | **dead; no backend route** ✅ |

Presigned links opened directly with `window.open`: ProformasPage, InvoicesPage, ProformaDetailPage, PaymentDetailPage, DocumentEditorPage, CompanyCatalogue, OfferPanel (offer letter), CandidateDrawer / CandidatesView (resume), DocumentPreviewDialog, FileInput, ProjectFlies, DocumentPreviewModal, GenericDetail, ObFileUpload, EmployeeDocumentTable, dmsService (Google Docs viewer).

---

## 2. Backend endpoint inventory

Access-control shorthand: **CBT** = `checkBlacklistToken`; **protect** = authentication plus a route→section check (`middlewares/protect.ts:99-106`; GET needs Read, other methods need Write; section map `middlewares/authorize.ts:226-235`); **MP(x)** = `mountPack(x)` subscription pack gate (`server.ts:251-256`).

| # | Method + URL | Route | Guards | Handler → generator | Response |
|---|---|---|---|---|---|
| 1 | POST `/api/billing/documents/:id/access` **and** `/api/billing/proformas/:id/access` | BE `routes/billingDocuments.ts:54-56` (router mounted twice, `server.ts:303-304`) | CBT, protect (billing **Write**) | `handlers/proformas.ts:244 accessProforma` → `services/documents/managementService.ts:676 accessDocument` → `documentService.ts:570 generateDocumentPdf` → `convertHtmlToPdf` | JSON presigned URL (1 h; SHARE intent 7 days) |
| 2 | GET `/api/billing/{documents,proformas}/:id/download-word` | `billingDocuments.ts:57` | CBT, protect | `proformas.ts:324 downloadWord` → `convertHtmlToWord` | `.doc` buffer |
| 3 | POST `/api/billing/tax-invoices/:id/access` | `routes/taxInvoices.ts:26-28` | CBT, protect (Write) | `handlers/taxInvoices.ts:183 accessInvoice` → `accessDocument` | JSON presigned |
| 4 | GET `/api/billing/tax-invoices/:id/download-word` | `taxInvoices.ts:29` | CBT, protect | `taxInvoices.ts:229 downloadInvoiceWord` | `.doc` buffer |
| 5 | GET `/api/billing/payments/:id/attachments/:attachmentId` | `routes/payments.ts:52-54` | CBT, protect | `handlers/payments.ts:244 getAttachmentLinkHandler` | JSON presigned (1 h) |
| 6 | POST `/api/documents/:id/pdf` | `routes/documents.ts:46` | CBT, protect (Write), `requireDocumentInTenant` | `handlers/documents.ts:234 generatePdfHandler` → `convertHtmlToPdf` | JSON presigned |
| 7 | GET `/api/payroll/salary/:salaryId/download-slip` | `routes/payroll.ts:48-49` | `securePayroll` (PIN), MP('pay'), protect, `requireAccessToEmployee` | `handlers/payroll.ts:715` → `payrollEmailService.ts:294 getOrGenerateSalarySlipPdfBuffer` → `convertHtmlToPdf` | PDF buffer |
| 8 | GET `/api/payroll/salary-slip?employeeId&month&year` | `payroll.ts:53-54` | same | `payroll.ts:746` | PDF buffer |
| 9 | GET `/api/payroll/salary/:salaryId/download-contract-bill` | `payroll.ts:56-57` | same | `payroll.ts:777` → `payrollEmailService.ts:539` | PDF buffer |
| 10 | GET `/api/reimbursements/:batchId/download-bill` | `routes/reimbursements.ts:78-79` | MP('pay'), protect, `requireAccessToEmployee` | `handlers/reimbursements.ts:17` → `reimbursementBillService.ts` → `convertHtmlToPdf` | PDF buffer |
| 11 | GET `/api/reimbursements/employee/:employeeId/download-bill?from&to&label` | `reimbursements.ts:74-75` | same | `reimbursements.ts:54` → `reimbursementBillService.ts:266` | PDF buffer |
| 12 | GET `/api/employee/documents/vault/:employeeId/file/:documentId` | `routes/employees.ts:597-599` | CBT, protect, `authorizeEmployeeRead` | `handlers/employees.ts:5238` → S3 proxy | file buffer |
| 13 | GET `/api/employee/documents/vault/:employeeId/archive` | `employees.ts:601-603` | same | `employees.ts:5271` → JSZip (in memory) | ZIP buffer |
| 14 | GET `/api/employee/id-card/:employeeId` | `employees.ts:651-660` | CBT, protect, `authorizeEmployeeRead` | `employees.ts:4933 fetchEmployeeIdCard` | **JSON** (image made in the browser) ✅ |
| 15 | GET `/api/employee/birthday-card/:kind/:id/image` | `employees.ts:625-627` | CBT, protect, `authorize('users.manage.all')` | `employees.ts:5063` → `services/greetings/renderCard.ts:142` (sharp) | PNG buffer |
| 16 | GET `/api/employee/meetings/:meetingId/minutes/pdf` | `employees.ts:989-991` | CBT, protect (Meetings tab) | `handlers/meetingAgendaMom.ts:357` → `MeetingAgendaMomRepository.ts:1222 exportPdf` → `convertHtmlToPdf` | PDF buffer |
| 17 | POST `/api/leads/export/docx` | `routes/leadExport.ts:11` | MP('psa'), protect, `authorize('crm.leads.export.department')` | `handlers/leadExport.ts:44 exportLeadDocx` → `generateDocument` (docxtemplater) | DOCX buffer |
| 18 | POST `/api/leads/export/pdf` | `leadExport.ts:12` | same | `leadExport.ts:207 exportLeadPdf` → `generateDocument` → `convertToPdf` (Word COM) | PDF buffer |
| 19 | GET `/api/leads/export/documents`, `/documents/:leadId` | `leadExport.ts:18-25` | MP('psa') | `leadExport.ts:492, 531` | JSON with public S3 URLs |
| 20 | GET `/api/lead-project-companies/client-companies/:companyId/catalogues/:catalogueId/file` | `routes/leadProjectCompanies.ts:467-469` | MP('psa'), `authorize('crm.companies.view.all')` | `handlers/companyCatalogues.ts:203` | PDF inline |
| 21 | GET `/api/recruitment/applicants/:id/export` | `routes/recruitment.ts:124` | MP('talent'), `authorize('recruitment.manage.all')` | `handlers/recruitment.ts:949` | JSON |
| 22 | GET `/api/billing/reports/*` (8 routes) | `routes/reports.ts:12-19` | CBT, protect | `handlers/reports.ts` | JSON only; FE builds the files |
| 23 | POST `/api/employee/email-salary-slip` | `employees.ts:1009` | CBT, protect, `securePayData` | `employees.ts:10752` | JSON (emails a client-supplied link) |
| 24 | POST `/api/employee/email-contract-bill` | `employees.ts:1011` | CBT, protect (**no PIN**) | `employees.ts:10801` | JSON (see §6.1) |
| 25 | static `/uploads/*` | `server.ts:200-202` | **none** | `express.static` | dev only (`NODE_ENV !== 'production'`) |

Background generators (no HTTP route): offer-letter PDF (`RecruitmentRepository.ts:2749-2785`), birthday-card PNG for email (`services/greetings/sendGreetings.ts:160`).

---

## 3. Shared utilities and duplicated logic

### 3.1 Backend generators

| Generator | Location | Engine | Callers |
|---|---|---|---|
| `convertHtmlToPdf(html, margin)` | BE `services/export/htmlPdfConverter.ts:89-154` | Puppeteer. **New Chromium per call** ✅ (:105), no pool or concurrency cap, `--no-sandbox`, no request interception | documents engine, meeting minutes, offer letter, salary slip, contract bill, reimbursement bills (7 call sites) |
| `convertToPdf(docxBuffer)` | `services/export/pdfConverter.ts:21-97` | PowerShell + Microsoft Word COM. **Throws on non-Windows** ✅ (:23-25) | `leadExport.ts:273` |
| `convertHtmlToWord(html, title)` | `services/export/htmlWordConverter.ts:41` | HTML wrapped as `.doc` | `documentService.ts:607` |
| `generateDocument(template, data)` | `services/export/documentGenerator.ts:15-108` | docxtemplater + pizzip | `leadExport.ts:134, 269` |
| `loadTemplateFromDB` | `services/export/templateLoader.ts:7` | S3 `.docx` masters | lead export |
| Vault ZIP | `handlers/employees.ts:5284-5318` | jszip | endpoint #13 |
| Birthday card | `services/greetings/renderCard.ts:142` | sharp (SVG → PNG) | endpoint #15, greetings email |

HTML template sources are spread over four systems: DB-stored versioned HTML (documents engine, `services/documents/templates/`), TypeScript string templates (`email-templates/salarySlipPdfTemplate.ts`, `email-templates/reimbursementBillPdfTemplate.ts`, the inline contract bill in `payrollEmailService.ts:567-~1754`, `buildMomHtml`, `utils/recruitmentOfferLetter.ts`), S3 `.docx` masters (proposals), and browser-side layouts (`salarySlipExport.ts` duplicates the server payslip layout).

### 3.2 Backend duplication

- Download headers (`Content-Type` / `Content-Disposition`) are hand-set in **10 handlers** (`proformas.ts:338`, `taxInvoices.ts:241`, `payroll.ts:730/762/788`, `reimbursements.ts:39/70`, `leadExport.ts:192/330`, `meetingAgendaMom.ts:363`, `employees.ts:5263/5321`, `companyCatalogues.ts:210`), each sanitising filenames differently. `leadExport` passes `body.fileName` through unsanitised.
- `handlers/taxInvoices.ts` is a near-copy of `handlers/proformas.ts`.
- `exportLeadDocx` and `exportLeadPdf` repeat the same template/transform/S3/history logic (`leadExport.ts:44-205` vs `207-343`). The dead `proposalDocumentService.generateLeadProposal` is a third copy.
- **Five or more HTML escapers:** `utils/escapeHtml.ts:38`, `utils/recruitmentEmail.ts:20`, `services/greetings/sendGreetings.ts:73`, `birthdayCardSvg.ts:273`, `handlers/publicCareers.ts:19`. There is also a non-escaping `safe()` in the reimbursement template.
- **The billing `scope()` function is copied six times:** `proformas.ts:64`, `taxInvoices.ts:44`, `payments.ts:41`, `reports.ts:27`, `billingOperations.ts`, with a different, tenant-safe version in `documents.ts:51`.
- **Write-only S3 copies:** the salary-slip `pdfS3Key` is only read in order to delete it (every download regenerates the PDF), and reimbursement bills are stored to S3 but never read back.

### 3.3 Frontend duplication

**Blob → download.**
- Three overlapping helpers: `utils/svgExport.ts:107 downloadBlob`, `app/pages/employee/documents/saveBlob.ts:9 saveBlob`, `reimbursement/utils/reimbursementFormat.ts:198 downloadBlob`.
- file-saver `saveAs` is used in three more files.
- About **15 hand-rolled copies** of `createObjectURL` + anchor + click. The billing pair `services/proformas.ts:224-232` and `services/taxInvoices.ts:51-59` is line-for-line identical. The DMS pair `DocumentCard.tsx:86` and `FileDetailsSidebar.tsx:70` is identical, including the fake-docx bytes.

**CSV.** Four builders with different rules:

| Builder | Quoting | Formula-injection guard | BOM |
|---|---|---|---|
| `ExportButton.tsx:173-234` | always | yes | yes |
| `CsvUploadStep.tsx:46` | when needed | no | yes |
| `salarySlipExport.ts:1608` `csvEscape` | when needed | **no** (writes free text such as remarks unguarded) | yes |
| `exportDrive.ts:88` (dead) | always | no | no |

**XLSX.** `ExportButton.exportXlsx` and `salarySlipExport.downloadSalarySlipXlsx` share near-identical pieces: exceljs interop (:285 / :884), `argb`, border helpers, the Indian-grouping currency numFmt, and the writeBuffer → `saveAs` tail.

**PDF tables.** `ReportExportToolbar.exportPdf` re-implements ExportButton's value extraction and currency formatting. Its PDF therefore ignores numeric column types, totals, column visibility and the `'-'` placeholder rule, so it can differ from the XLSX and CSV built from the same columns.

**Filenames and dates.**
- At least six different "safe filename" rules.
- The forbidden-character regex is duplicated in `MaterialTableImpl.tsx:1162` and `DataTableExport.tsx:72`.
- Date stamps are built ad hoc (`toISOString().slice(0,10)`, `format('MMM-YYYY')`, `format('MMM_YYYY')`). None use `utils/dateFormats.ts`.
- `SalarySlipSection.tsx:210` uses the lint-banned `toLocaleDateString`, and names the contract bill with **today's** date rather than the slip month.

---

## 4. Pagination findings

**How the table engine exports** (FE `MaterialTableImpl.tsx:2520-2531` ✅):

```tsx
data={selectedRows.length > 0 ? selectedRows : tableData}
getData={selectedRows.length === 0 ? fetchAllRows : undefined}
```

- **Client-side tables** export every row (all pages). But the export **ignores the column filters, the global filter and the sort order** the user applied on screen, because `tableData` is taken before material-react-table processes it. A filtered view can therefore export more rows than are shown.
- **Server-paginated tables without `fetchAllRows`** export **only the loaded page**.
- **With `fetchAllRows`** (`utils/fetchAllPages.ts`, 1,000 per page, ceiling `MAX_EXPORT_ROWS = 50_000`) the export contains every row matching the server filters.

| Screen | Pagination | Export result |
|---|---|---|
| Billing Operations (`BillingOperationsPage.tsx:361`) ✅ | server | **current page only (25 rows)** |
| Employees (`EmployeeListContent.tsx:807`) ✅ | server | **current page only** |
| All Leave Requests (`AllLeaveRequest.tsx:395`) | server | **current page only** |
| All Attendance Requests (`OpenAttendanceRequests.tsx:542`) | server | **current page only** |
| Billing reports: Collection, Outstanding, Receivable, Revenue (`*ReportPage.tsx`, `pageSize: 1000`) ✅ | server | **single request, silently truncated above 1,000 rows** (backend clamps at 5,000). `ReportExportToolbar.run()` has no `catch`, so a failure shows nothing. |
| Billing reports: Client, Monthly, Project | client | all loaded rows |
| Payment Collection (`PaymentCollectionPage.tsx:553`) | — | `data={[]}`, so export is always disabled |
| Proformas, Tax Invoices | server | no list export (per-document only) |
| Leads (`LeadNewLead.tsx:1782`) | server + `fetchAllRows` | all rows, but **local-mode column filters are ignored** |
| Client Companies, Client Contacts | server + `fetchAllRows` | all matching rows (≤ 50k) |
| Leads & Projects (`EntityTablePage.tsx:2567`), Projects (`ProjectTablePage.tsx:1029`) | client | quick-filtered rows; in-table search, sort and selection ignored |
| Monthly / Yearly Salary, attendance graphs, reimbursement DataTables | client | all rows |

Exports that go through `renderExportActions` or `fetchAllRows` bypass the client-side ABAC hook `usePermittedRows` (`MaterialTableImpl.tsx:693`). The server's scoping is the real control, so this is defence-in-depth only, but it means the export can differ from the rows shown on screen.

---

## 5. Excel, PDF and Word consolidation recommendations

### Excel / CSV: yes, one shared utility (frontend)
- Keep spreadsheet generation **in the browser**. It already works, costs no endpoint, and `ExportButton` is used by roughly 100 tables.
- Extract ExportButton's internals (`csvCell`, `neutralizeCsvFormula`, `exportCsv`, the exceljs loader, `argb`, borders, `currencyNumFmt`) into a shared module. Move `salarySlipExport.ts` and `CsvUploadStep` onto it. This also closes the CSV formula-injection gap.
- Fix server-paged tables by passing **`fetchAllRows`**, which already exists. No new API is needed below 50k rows. A server-side streamed export (`?format=xlsx` on the list endpoint) is only justified when a list can exceed `MAX_EXPORT_ROWS`; no screen needs it today.
- Make the reports' `fetchAll` page through `fetchAllPages` instead of a single `pageSize: 1000` request.

### PDF: yes, one server engine
- Standardise on **`convertHtmlToPdf` (Puppeteer)**, which seven features already use. Harden it once:
  - a shared browser with a page-level concurrency cap, instead of launching Chromium per request
  - request interception (block network except `data:`)
  - an explicit timeout
- **Retire `convertToPdf` (Word COM).** It cannot run on the Linux production host, so `POST /api/leads/export/pdf` is broken in production (inferred from code; not runtime-tested). Options:
  - (a) render lead proposals as HTML templates through Puppeteer, or
  - (b) add LibreOffice headless for DOCX → PDF. This is a new system dependency.

  **Needs a product decision.**
- Browser PDFs stay where they are deliberate:
  - The reports table (jsPDF) should share column logic with ExportButton.
  - Company Profile (raster, so its text is not selectable) can move to server Puppeteer later, giving selectable text.
  - The organization report (@react-pdf) should become a lazy import.

### Word: keep two formats, one module
- HTML `.doc` (billing documents: one HTML string for preview, PDF and Word) and docxtemplater `.docx` (user-authored proposal templates) serve different needs. Both already live in `services/export/`.
- The work is deduplicating `exportLeadDocx` / `exportLeadPdf` and sanitising filenames.

### Generic export API: not recommended; use a hybrid
- A single `POST /api/export { type, id }` would have to re-implement every feature's guards in one switch:
  - PIN (`securePayroll`)
  - pack gates
  - section checks
  - `requireAccessToEmployee`
  - document tenant checks

  One mistake there exposes payroll or billing data. It would not reduce code either: each type still needs its own data loader and template.
- **Hybrid:** feature endpoints stay thin and own permissions, tenant scope and data loading. They call **shared generators** (`renderPdf`, `renderDoc`, `renderDocx`, `zip`) and a **shared `sendFile` helper**.
- If many new exports are planned, a registry endpoint (`GET /api/exports/:kind/:id`, each kind registering `{ guard, load, template }`) can be layered on later, following the documents engine's existing `kind` pattern. The old URLs would be kept as aliases.

**Endpoints that should stay feature-specific:** all of §2. None is redundant except the duplicate billing mount (§7).

---

## 6. Security findings

Ordered by severity. Items marked ✅ were confirmed by reading the code; runtime exploitability was not tested.

| # | Finding | Location | Impact |
|---|---|---|---|
| 6.1 ✅ | `POST /api/employee/email-contract-bill` takes `path` from `req.body` and passes it as the email attachment path. Resend does `fs.readFile(attachment.path)`; SMTP (nodemailer) accepts local paths or URLs. | BE `handlers/employees.ts:10801-10880`, `utils/email.ts:107-109` | **Arbitrary server file read / SSRF.** An employee can email themselves, for example, `.env`. No PIN on this route. |
| 6.2 ✅ | Salary slips are uploaded with `ACL: public-read` under a guessable key `salary-slips/<yyyy>/<mm>/<employeeId>_<salaryId>.pdf`, on **every download** (a GET with S3 and DB side effects). | BE `services/payroll/payrollEmailService.ts:316-317`, `services/s3Service.ts:35` | Salary data publicly readable by URL. |
| 6.3 ✅ | Billing `scope()` returns `null` (no filter) for `finance.view.all` / `billing.view.all`. `GeneratedDocument`, `BillingOperation` and `PaymentAttachment` are `unkeyed` in the tenant guard, so enforce mode doesn't cover them. | BE `handlers/proformas.ts:64-73`, `taxInvoices.ts:44`, `payments.ts:41`; `db/tenancy/tenantRegistry.ts` | Cross-tenant document and attachment access for "view all" holders. `documents.ts:51` already has the safe pattern. Tax-invoice routes reportedly don't check the document `kind` *(unverified)*. |
| 6.4 ✅ | `?label=` on the period reimbursement bill reaches the HTML through `safe()`, which does not escape. Item fields are also unescaped. Puppeteer runs with no request interception. | BE `handlers/reimbursements.ts:57-68`, `email-templates/reimbursementBillPdfTemplate.ts:57, 286` | HTML injection into server-side Chromium (SSRF vector). |
| 6.5 | Lead export accepts a client-supplied `.docx` (`templateBase64`, up to the 50 MB JSON limit) and uploads its output **public-read**. `generatedBy` comes from the body. `body.fileName` goes unsanitised into the S3 key and the header. | BE `handlers/leadExport.ts:146, 181, 193, 284, 323` | Zip-bomb / memory pressure, public proposal files, spoofed audit field. |
| 6.6 ✅ | `download-contract-bill`'s `catch` logs and never responds. | BE `handlers/payroll.ts:791-793` | Request hangs on any error. |
| 6.7 | Vault file / archive, ID card and birthday card load by id with no explicit tenant check. They rely on the Prisma tenant guard, which defaults to `TENANT_GUARD=log`. | BE `db/DocumentsRepository.ts:214`, `EmployeesRepository.ts:683, 787` | Cross-tenant read if the guard is not enforcing. |
| 6.8 | Puppeteer: `--no-sandbox`, JavaScript enabled, no request blocking, no timeout or concurrency cap, one Chromium per request. | BE `services/export/htmlPdfConverter.ts:65-72, 105, 127` | Resource exhaustion; amplifies 6.4. |
| 6.9 | Other public-read uploads: proposal templates, and user uploads in category `salary-docs` (used by the email-salary-slip flow). | BE `services/export/proposalTemplateService.ts:33, 80`, `handlers/uploader.ts:204` | Public files. |
| 6.10 | `/uploads` is static with no auth when `NODE_ENV !== 'production'`. | BE `server.ts:200-202` | Fine in dev; exposed if prod runs without `NODE_ENV`. |

Presigned link lifetimes are reasonable (1 h default; 7 days only for document SHARE and the offer-letter email).

---

## 7. Dead code and unused endpoints

Every item was checked by grepping for references across **both** repositories.

| Item | Location | Evidence |
|---|---|---|
| `exportProjectDocx`, `exportProjectPdf` | FE `services/projects.ts:804, 817` | 0 callers; no backend route ✅ |
| `exportDrive.ts` (whole module) | FE `app/pages/employee/courtesy-desk/utils/exportDrive.ts` | no importer ✅ |
| `LeadWizardModal.handleExport` | FE `leads/lead/LeadWizardModal.tsx:352-490` | never referenced |
| EnterpriseFormWizard Export PDF/DOCX buttons | FE `shared/form-engine/components/EnterpriseWizard/EnterpriseFormWizard.tsx:279-294` | no host passes `actions.exportPdf` / `exportDocx` |
| `SummaryPanel`, `SummarySidebar` export props | FE `app/pages/employee/forms/shared/SummaryPanel.tsx`, `shared/form-engine/components/SummarySidebar/SummarySidebar.tsx:12-13` | never imported / never used |
| `ContractBillSection`, `ContractBillTemplate`, `contractBillDataTransformer` | FE `modules/payroll/components/ContractBillSection.tsx`, `app/pages/employee/salary/ContractBillTemplate.tsx`, `…/utils/contractBillDataTransformer.ts` | never imported |
| `PdfLoader`, `PdfViewer` | FE `app/pages/employee/PdfLoader.tsx`, `PdfViewer.tsx` | never imported |
| Unused `ExportCenterModal` import | FE `leads/lead/components/LeadFiles.tsx:1,3` | imported, never rendered |
| `/api/billing/documents/*` mount | BE `server.ts:303` | the FE only calls `/api/billing/proformas/*` and `/api/billing/tax-invoices/*` |
| `proposalDocumentService.generateLeadProposal` | BE `services/export/proposalDocumentService.ts` | imported at `leadExport.ts:20`, never called |
| `leadProposalTransformer.ts`, `proposalTemplateConfig.ts`, `proposalConfigurationService.ts` | BE `services/export/` | never imported (except by each other) |
| `loadTemplate` | BE `services/export/templateLoader.ts:37` | deprecated, 0 callers |
| `saveToHistory` / `HISTORY_PATH` | BE `handlers/leadExport.ts:25-38` | never called |
| `autoSendMonthlySalarySlips` | BE `utils/cron.ts:925` | never scheduled or called |

**Unused dependencies**

| Repo | Package | Notes |
|---|---|---|
| FE | `pdfmake` | 0 imports ✅ |
| FE | `pdf-lib` | 0 imports; one commented-out reference in dead `PdfLoader.tsx` ✅ |
| FE | `json2csv` | 0 imports ✅ |
| FE | `@react-pdf/image` | 0 imports ✅ |
| FE | `puppeteer` | in `dependencies`; only `.harness/*.cjs` scripts use it, so it belongs in devDependencies at most |
| BE | `pdfkit` | 0 imports |
| BE | `cheerio`, `apexcharts` | 0 imports |
| BE | `jszip` | **used but not declared**: it resolves only through `@types/jszip` plus hoisting, so it should be declared |

---

## 8. Recommended centralized architecture (hybrid)

```
Browser                                   Backend
───────                                   ───────
Table / report / page                     Feature route (unchanged URL)
   │                                        │  guards: protect, pack, PIN, permission
   ├─ spreadsheets ─▶ utils/export/          │  tenant: requireAccessToEmployee / family scope
   │                  (csv, xlsx, pdfTable)  │  data:   feature loader
   │                                        ▼
   └─ server files ─▶ services/download.ts  services/export/  (shared generators)
                      (one downloadFile)      renderPdf · renderDoc · renderDocx · zip
                                            │
                                            ▼
                                          utils/sendFile.ts (headers, safe filename)
                                          or private S3 + presigned link
```

Rules:
1. **No spreadsheet endpoints.** Browsers build CSV and XLSX. Server-paged lists fetch all pages client-side up to 50k; server streaming only when a real list exceeds that.
2. **One PDF engine on the server** (hardened Puppeteer). HTML templates escape through a single `escapeHtml`.
3. **Feature endpoints own access control.** Generators never see `req`.
4. **Generated files are private.** Return bytes, or store privately and return a presigned link. Never `public-read`.
5. **One download helper per side:** FE `downloadFile` / `saveBlob`, BE `sendFile`.

---

## 9. Proposed directory structure

```
wisetech-frontend/src/
  utils/export/
    download.ts      saveBlob(blob, name) · filenameFromDisposition(header) · revoke handling
    filename.ts      safeFileName(stem, ext, date?) using utils/dateFormats
    csv.ts           csvCell · neutralizeCsvFormula · toCsv          (moved from ExportButton)
    xlsx.ts          loadExcel · argb · borders · currencyNumFmt · saveWorkbook
    pdfTable.ts      jsPDF table from the ExportButton column model
  services/download.ts   downloadFile(url, { method, body, fallbackName })   (all blob endpoints)
  app/modules/common/components/ExportButton.tsx   UI only, consumes utils/export

wisetech-backend/src/
  services/export/
    pdf/renderPdf.ts       shared Puppeteer browser, page cap, request blocking, timeout
    word/renderDoc.ts      (htmlWordConverter, unchanged behaviour)
    word/renderDocx.ts     (documentGenerator + templateLoader)
    archive/zip.ts         (vault ZIP)
  utils/sendFile.ts        sendFile(res, buffer, { filename, type, disposition })
  utils/escapeHtml.ts      the single escaper (others removed)
```

---

## 10. Phased implementation plan

| Phase | Scope | Repos | Risk |
|---|---|---|---|
| **0 · Security (do first)** | 6.1: stop accepting `path` from the client; generate or fetch the bill server-side. 6.2 / 6.5 / 6.9: private ACL plus presigned links. 6.3: family-scope billing `scope()` (copy `documents.ts:51`). 6.4: escape the reimbursement template. 6.6: respond on error. 6.5: drop or limit `templateBase64` and sanitise `fileName`. | BE (+ small FE change for 6.1) | Low–medium; each change is isolated |
| **1 · Export correctness** | Pass `fetchAllRows` on the 4 server-paged tables. Reports page through `fetchAllPages`. Add a `catch` and toast in `ReportExportToolbar`. Remove the DMS fake `.docx`. Revoke object URLs. Guard `salarySlipExport` CSV. Fix the contract-bill filename date. | FE | Low |
| **2 · Frontend shared utilities** | Create `utils/export/*` and `services/download.ts`. Move ExportButton internals there. Migrate the ~15 hand-rolled downloads and 3 helpers. Align the reports PDF with the ExportButton column model. Make `@react-pdf/renderer` lazy. | FE | Low (behaviour-preserving) |
| **3 · Backend shared services** | `sendFile` helper across the 10 handlers. Single `escapeHtml`. Shared, hardened Puppeteer. Dedupe `exportLeadDocx` / `exportLeadPdf`. **Decision:** replace Word COM PDF (HTML template vs LibreOffice). | BE | Medium (PDF engine change) |
| **4 · Dead code and dependencies** | Remove the §7 items. Drop `pdfmake`, `pdf-lib`, `json2csv` and `@react-pdf/image` (FE) and `pdfkit`, `cheerio` and `apexcharts` (BE). Move FE `puppeteer` to dev. Declare BE `jszip`. Remove the `/api/billing/documents` mount after confirming no external client uses it. | both | Low |
| **5 · Optional** | Registry endpoint `/api/exports/:kind/:id`. Server-streamed table export for lists over 50k. Server Puppeteer render for Company Profile (selectable text). | both | Only if needed |

---

## 11. Documentation drift found during the audit

- FE `AGENTS.md` says heavy libraries (PDF, xlsx) are split via `manualChunks`. In fact only `@react-pdf/renderer` and `jszip` are listed there; exceljs and jspdf split because they are dynamically imported. `vendor-pdf` (1.45 MB) is modulepreloaded on first load *(cause unverified)*.
- FE and BE `AGENTS.md` link to `../docs/billing/*.md`. That folder does not exist.
- BE `AGENTS.md` describes `RBAC_ENFORCE_*` shadow mode. The code reads `ACCESS_ENFORCEMENT` (`middlewares/authorize.ts:20`).
- BE `docs/multi-tenancy.md` lists the documents engine as enforced but does not cover the `/api/billing/{proformas,tax-invoices,payments,reports}` scope functions (§6.3).
