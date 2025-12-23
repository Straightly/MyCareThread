# MyCareThread — Personal FHIR Client Project Plan

## 1. Goal and Scope

Build a personal "client" that can:

- Retrieve **all of my own medication information** (and later other clinical data) from providers that expose FHIR APIs (starting with Epic via SMART on FHIR).
- Provide a **web-based UI** first, then be wrapped as an **iPhone app**.
- Store my data in a form suitable for **vibe programming** (using AI tools against my own consolidated records).

This is a **personal project**: single-user, focused on reliability and data ownership rather than multi-tenant scaling.

---

## 2. Architecture Overview (High Level)

- **Frontend (Phase 2–3)**
  - Start from a **SMART on FHIR sample app** (e.g., `smart-on-fhir/sample-apps`).
  - Web client launched via SMART on FHIR against Epic.
  - Later wrapped into an **iPhone app** (using Capacitor or similar), reusing most web logic.

- **Backend (Phase 4)**
  - Lightweight service (likely Node/Express initially) that:
    - Receives context/tokens or is configured to act as the FHIR client.
    - Retrieves FHIR resources (starting with medications) from Epic.
    - Stores normalized data in a private store (e.g., SQLite/Postgres/JSON files) for later analysis.

- **Data Store (Phase 4–5)**
  - Start simple: a single database or a set of JSON files on disk.
  - Schema oriented toward **vibe programming** usage (e.g., an easily serializable form for LLM prompts).

- **Security & Privacy**
  - Single-user: credentials and tokens stored locally and securely.
  - No multi-user account system initially.

---

## 3. Phases and Time Estimates

Estimates assume an experienced programmer comfortable with full-stack work and Cloudflare, but new to SMART on FHIR specifics. Times are **net focused hours**.

### Phase 1 — Cloudflare Server for Data Retrieval & Storage (using downloaded records)

**Goals:**
- Stand up a minimal **Cloudflare-hosted server** that can:
  - Ingest and store your medication-related records from **downloaded MyChart/portal exports** (initially "All Visits" downloads from your real provider).
  - Later, be extended to retrieve medication resources via SMART on FHIR when/if your provider or Epic path is available.
  - Persist data in a simple store you control (initially **KV**, later expandable to D1 or another DB if needed).
- No UI yet; interaction can be via HTTP endpoints or scripts.

**Tasks:**
- **Step 1.1 — Create backend skeleton (≤ 1 hour)**
  - [x] Create `backend/` under `MyCareThread`.
  - [x] Initialize a Cloudflare Worker/Pages Functions project (e.g., `wrangler init` or equivalent) scoped to `backend/`.
  - [x] Add a simple `index.ts`/`index.js` with a default handler that returns `200 OK` and a JSON body ("MyCareThread backend alive").

- **Step 1.1.1 — Deploy and test backend on Cloudflare (≤ 1 hour)**
  - [x] Use `wrangler deploy` (or dashboard) to deploy the backend Worker to Cloudflare.
  - [x] Confirm the public URL returned by `wrangler` or shown in the dashboard.
  - [x] Call the URL in a browser or via `curl`/HTTP client and verify you receive the `"MyCareThread backend alive"` JSON with `200 OK`.
  - [x] Note the production URL in the project docs (e.g., in this plan or a small `docs/ENDPOINTS.md`).
    - Production URL: `https://mycarethread-backend.zhian-job.workers.dev/`

- **Step 1.2 — Configure KV for storage (≤ 1 hour)**
  - [X] Create a KV namespace in Cloudflare dashboard (e.g., `MYCARETHREAD_KV`).
  - [X] Add the KV binding to `wrangler.toml` (e.g., `kv_namespaces` section with binding `MYCARETHREAD_KV`).
  - [X] In the Worker code, add a basic read/write test endpoint:
    - `GET /kv-test` — reads a fixed key, returns value or placeholder.
    - `POST /kv-test` — writes a fixed test value to KV.
  - [X] Verify KV works **locally** with `wrangler dev` (POST then GET `/kv-test`).
  - [X] Run `wrangler deploy` and verify KV works in **production** by calling `/kv-test` on `https://mycarethread-backend.zhian-job.workers.dev/`.

-- [X] **Step 1.3 — Define initial data ingestion configuration (≤ 1 hour)**
  - [X] Document the export format(s):
    - **Format:** IHE XDM (Cross-Enterprise Document Media Interchange).
    - **Location:** `MyRecord20251209/IHE_XDM/Zhi1/`.
    - **Structure:** `METADATA.XML` describes the files; `DOCxxxx.XML` are the clinical documents (CDA/CCD).
  - [X] Decide on an initial ingestion format for Phase 1:
    - **Decision:** Parse `METADATA.XML` to identify document types, then ingest key `DOCxxxx.XML` files (e.g., Patient Health Summary) as raw strings into KV.
  - [X] Define a minimal config/env for Phase 1 ingestion:
    - **Source:** Local folder `c:\z\attention\MyCareThread\MyRecord20251209`.
    - **KV Key Scheme:** `cda:metadata` (for the index) and `cda:<docId>` (e.g. `cda:DOC0001`).
  - [X] Add a `/health` or `/config` endpoint that reports which ingestion mode is active (downloaded files for now; FHIR/SMART later).

- [X] **Step 1.4 — Implement download-based import endpoint (≤ 1 hour)**
  - [X] Add an endpoint `POST /import/metadata` to ingest `METADATA.XML`.
  - [X] Add an endpoint `POST /import/cda` to ingest individual `DOCxxxx.XML` files.
  - [X] Create a local script (Node.js) to read the `IHE_XDM` folder and push content to these endpoints.

- [X] **Step 1.5 — CDA upload and storage API (≤ 1 hour)**
  - *Combined with Step 1.4: The endpoints above handle CDA storage into KV.*
  - Data stored in KV under `cda:metadata` and `cda:DOCxxxx`.

- [X] **Step 1.6 — Build full JSON view from CDA (≤ 1 hour)**
  - [X] Implement a server-side function that reads all stored CDA docs from KV and constructs a consolidated JSON representation.
  - [X] Add an endpoint `POST /build/full-json` (supports `?limit=N` to handle timeouts).
  - [X] Add a `GET /summary/full` endpoint.

- [X] **Step 1.7 — Build clinical-only JSON view (≤ 1 hour)**
  - [X] Define what counts as "clinical/health-related":
    - Allergies (`48765-2`), Meds (`10160-0`, `66149-6`, `10183-2`), Problems (`11450-4`, `11348-0`), Immunizations (`11369-6`), Vitals (`8716-3`), Results (`30954-2`), Procedures (`47519-4`), Encounters (`46240-8`), Plan (`18776-5`), Diagnoses (`51848-0`), Care Teams (`85847-2`).
  - [X] Implement a transformation from the full JSON or directly from CDA to a lean "clinical-only" JSON view.
  - [X] Add an endpoint `POST /build/clinical-json` (supports `?limit=N`).
  - [X] Add a `GET /summary/clinical` endpoint.

- [X] **Step 1.8 — Topic-based thread extraction API (≤ 1 hour)**
  - [X] Define a minimal schema for "thread events" (e.g., visits, meds, tests).
  - [X] Implement a simple rule-based function that scans the clinical-only JSON for related events.
  - [X] Add an endpoint `GET /threads?topic=...`.

**Estimate:** 7–10 hours.

---

### Phase 2 — SMART on FHIR Flow & Epic Connection (PAUSED)

**Status:** Paused by user request (2025-12-22). The "SMART" flow is considered low value for the current single-user use case compared to processing the downloaded data we already have.

**Goals:**
- Wire the Cloudflare server to work with **SMART on FHIR** and Epic.
- Achieve a full flow: authorize as yourself → obtain token → server imports and stores meds.

**Tasks:**
- [ ] **Step 2.1 — Register App with Epic**
  - Register an app with Epic (open.epic.com) for SMART on FHIR.
  - Configure client ID, redirect URI, and scopes (e.g., `patient/*.read`).
- [X] **Step 2.2 — Implement SMART Launch/OAuth2 Flow**
  - [X] Implemented `/launch` endpoint (redirects to Epic authorize).
  - [X] Implemented `/callback` endpoint (exchanges code for token).
  - [X] Token storage in KV (`auth:current`).
- [ ] **Step 2.3 — Test End-to-End**
  - Call Cloudflare endpoint → Epic login → meds import.

**Estimate:** 4–7 hours.

---

### Phase 3 — Data Normalization & Vibe-Friendly Schema

**Goals:**
- Normalize medication-related FHIR resources into a **clean internal schema** optimized for querying and vibe programming.

**Tasks:**
- [ ] Decide on an internal medication model (e.g., fields like drug name, dose, route, frequency, start/stop dates, ordering provider, source system).
- [ ] Implement transformation from raw FHIR resources (e.g., `MedicationRequest`, `MedicationStatement`, `Medication`) into this schema.
- [ ] Store normalized data in your chosen store (KV/D1/DB/files) alongside raw FHIR for traceability.
- [ ] Add an endpoint such as `GET /medications/normalized` that returns only the normalized form.

**Estimate:** 4–6 hours.

---

### Phase 4 — Minimal Web Client for Personal Use

**Goals:**
- Configure the app to talk to **Epic** (sandbox or production patient portal).
- Successfully log in as yourself and retrieve data.

**Tasks:**
- [ ] Register an app with Epic (or use an existing registration) for SMART on FHIR access.
- [ ] Configure client ID, redirect URI, and scopes in the sample app.
- [ ] Test login flow end-to-end:
  - Launch app → redirect to Epic → patient login → consent → redirect back.
  - Trigger import.
  - View consolidated medications from your Cloudflare backend.

**Tasks:**
- [ ] Create `frontend/` with a minimal single-page app (plain JS/HTML or a small React app).
- [ ] Implement calls to backend endpoints (`/import/medications`, `/medications`, `/medications/normalized`).
- [ ] Render a basic list/table of medications with key fields.
- [ ] Ensure CORS and auth (if any) are handled between frontend and Cloudflare backend.

**Estimate:** 3–5 hours.

---

### Phase 5 — Prepare for iPhone App Wrapping

**Goals:**
- Make sure the web client is cleanly structured so it can be wrapped as an iPhone app later.
- Define the wrapping approach (likely reuse your previous Capacitor workflow).

**Tasks:**
- [ ] Confirm that the web client runs well on mobile Safari (basic responsive checks).
- [ ] Decide on structure for an iPhone app wrapper (e.g., `MyCareThread/iPhoneApp/` using Capacitor).
- [ ] Document the future wrapping steps in `docs/WRAP_TO_IPHONE.md`.

**Estimate:** 2–3 hours.

---

### Phase 6 — Vibe Programming Readiness

**Goals:**
- Make stored data easy to consume from AI tools.

**Tasks:**
- [ ] Design a simple export format (e.g., JSONL or compact JSON) that captures key medication fields.
- [ ] Add an endpoint or script to export your meds into that format.
- [ ] Document how to load that data into your vibe programming environment.

**Estimate:** 3–4 hours.

---

## 4. Summary of Time Estimates

- Phase 1 — Cloudflare Server for Data Retrieval & Storage: 6–9 hours
- Phase 2 — SMART on FHIR Flow & Epic Connection: 4–7 hours
- Phase 3 — Data Normalization & Vibe-Friendly Schema: 4–6 hours
- Phase 4 — Minimal Web UI: 3–5 hours
- Phase 5 — iPhone App Planning: 2–3 hours
- Phase 6 — Vibe Programming Readiness: 3–4 hours

**Total Estimated Effort:** ~22–34 hours

---

## 5. Notes & Open Questions

- **Epic access level:**
  - Need to confirm whether you will use Epic’s public sandbox, a patient portal for your own care, or both.
- **Data scope:**
  - Starting with **medications**, but the architecture should allow adding labs, conditions, encounters later.
- **Security:**
  - Since this is single-user, you can keep things simple initially (local secrets, no multi-tenant auth) but should still avoid committing any credentials.

---

## 6. Next Steps

1. Complete **Phase 1**: set up `MyCareThread` folder structure and confirm the SMART on FHIR sample app you will clone.
2. Proceed to **Phase 2**: clone and run the sample app locally.
3. Once running, begin **Phase 3** by registering with Epic and wiring the app to Epic’s endpoints.
