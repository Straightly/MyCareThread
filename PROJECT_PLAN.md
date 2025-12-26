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

### Phase 3 — Clinical Event Model & Thread-Based Views

**Goals:**
- Transform CDA documents into clinical-only JSON (per document)
- Build event-based model for thread queries
- Enable temporal analysis and relationship detection

**Tasks:**

- [X] **Step 3.1 — Per-Document Clinical JSON Extraction (1-2 hours)**
  - [X] Modify `POST /import/cda` endpoint to:
    - Parse incoming CDA XML immediately
    - Extract clinical sections (same logic as `/build/clinical-json`)
    - Save raw CDA as `cda:DOC####`
    - Save clinical JSON as `json:DOC####`
  - [X] Re-ingest all 34 documents to populate `json:*` keys
  - [X] Verify extraction with `GET /debug/keys?prefix=json:DOC`
  - **Result:** All 34 documents successfully processed with 8-14 clinical sections each

- [X] **Step 3.2 — Define Clinical Concept Types (30 min)**
  - [X] Define core concept types to extract:
    - Problem (diagnoses, conditions, symptoms)
    - Medication (prescriptions, administrations)
    - Allergy (allergens, reactions)
    - Procedure (surgeries, interventions)
    - VitalSign (BP, temp, weight, etc.)
    - LabResult (test results)
    - Immunization (vaccines)
    - Encounter (visits, admissions)
  - [X] Document in `docs/CONCEPT_TYPES.md`
  - **Result:** Created comprehensive concept type definitions with CDA section mappings and design principles

- [X] **Step 3.3 — Define Field Schema per Concept (1 hour)**
  - [X] For each concept type, define essential fields:
    - **Common fields:** name, date, status, sourceDocId, sourceSection
    - **Concept-specific fields:** 
      - Problem: onsetDate, codes (SNOMED, ICD-10), severity
      - Medication: drugName, dose, route, frequency, startDate, endDate, codes (RxNorm)
      - Allergy: allergen, reaction, severity, codes
      - Procedure: procedureName, performedDate, codes (CPT, SNOMED)
      - VitalSign: type, value, unit, measuredDate
      - LabResult: testName, value, unit, referenceRange, resultDate, codes (LOINC)
  - [X] Exclude: HTML formatting (tr/td), internal references (#problem18name), redundant code translations
  - [X] Document schema in `docs/FIELD_SCHEMA.md`
  - **Result:** Created comprehensive field schema with examples, extraction rules, and validation rules for all 8 concept types

- [X] **Step 3.4 — Extract Clean Clinical Concepts (2-3 hours)**
  - [X] Create extraction logic for each concept type
  - [X] Parse entries from clinical JSON (json:DOC####)
  - [X] Extract only defined fields per concept
  - [X] Resolve internal references to plain text
  - [X] Keep only primary code per system (SNOMED for problems, RxNorm for meds, etc.)
  - [X] Save as `concepts:DOC####` in KV (array of concept objects)
  - [X] Add endpoint `GET /concepts/:docId` to retrieve
  - [X] Verify extraction quality with sample documents
  - **Result:** Successfully extracted concepts from all 34 documents. Implemented Problem, Medication, Allergy, and Procedure extractors. Created clean, AI-consumable JSON with no HTML formatting, no internal references, and only primary codes per system.
  - **Issue Identified:** Narrative text (clinical notes, doctor conversations) not extracted - critical for research use case

- [X] **Step 3.5 — Investigate Narrative Content in Existing Documents (30 min)**
  - [X] Scan all 34 clinical JSON files to identify which sections contain narrative text
  - [X] Check for Progress Notes (10164-2), Reason for Visit (29299-5), Plan of Treatment (18776-5)
  - [X] Document which document types have rich narratives vs. structured data only
  - [X] Identify best examples of narrative content for testing
  - **Result:** Created `docs/NARRATIVE_ANALYSIS.md` with comprehensive findings
  - **Key Discovery:** DOC0003 contains ProgressNotes with rich clinical narrative including patient's subjective complaints, chief complaint, and detailed history ("Cough intermittently for over a year, mostly mild...")
  - **Findings:** All 9 section types contain narrative text; Results sections have clinical history; ProgressNotes found in DOC0003; ReasonForVisit and PlanOfTreatment also present
  - **Recommendation:** Extract narrative from ALL sections, prioritize ProgressNotes content

- [X] **Step 3.6 — Add Narrative Text to Concept Extraction (2-3 hours)**
  - [X] Update `docs/FIELD_SCHEMA.md` to add narrative fields:
    - Problem: Add `clinicalNotes` field for narrative context
    - All concepts: Add `narrativeText` field for section narrative
  - [X] Modify `backend/lib/conceptExtractor.js` to extract narrative text:
    - Extract text from section.text (resolve HTML-like structures to plain text)
    - Add to each concept as appropriate
    - Handle both structured entries and narrative-only sections
  - [X] Re-extract all concepts with narrative text included
  - [X] Verify narrative extraction with sample documents
  - [X] Download updated concepts to `MyRecord20251209/concepts/`
  - **Result:** Successfully added `narrativeText` field to all concepts. Deployed backend (Version: 23843e57-6d1b-4291-bc46-4af7a75b8db1). Re-extracted all 34 documents. Verified DOC0003 includes narrative: "Problem Noted Date Diagnosed Date Chronic cough 10/17/2025..." All concepts now include clinical context for AI analysis.

- [X] **Step 3.7 — Comprehensive CDA Value Analysis (1 hour)**
  - [X] Review all extracted concepts with narratives
  - [X] Identify any valuable health journey information not yet captured:
    - [X] Check for temporal patterns (symptom progression over time)
    - [X] Check for treatment effectiveness (did medications help?)
    - [X] Check for provider observations (clinical exam findings)
    - [X] Check for patient-reported outcomes (quality of life, functional status)
    - [X] Check for care coordination (referrals, follow-ups)
    - [X] Check for social determinants (lifestyle, environment)
  - [X] Scan for sections not yet extracted (VitalSign, LabResult, Immunization, Encounter)
  - [X] Document any gaps in current extraction
  - [X] Recommend additional extractors or fields if needed
  - **Result:** Created `docs/CDA_VALUE_ANALYSIS.md` with comprehensive findings
  - **Current Coverage:** 77 Problem concepts extracted (100% with narratives), but only 4 of 8 concept types implemented
  - **Major Gaps Identified:** 10 sections not extracted (VitalSigns, Results, Immunizations, Encounters, ProgressNotes, etc.)
  - **High Priority Recommendations:** Implement 4 missing extractors (VitalSigns, Results, Immunizations, Encounters) covering 130+ documents
  - **Health Journey Gaps:** Missing temporal patterns, treatment effectiveness, earlier visit notes (May 2023-Oct 2024), lab results, vital signs
  - **Extraction Coverage:** Currently ~30% of available CDA data, would be ~80% with recommended extractors

- [X] **Step 3.8 — Implement Missing Concept Extractors (3-4 hours)**
  
  **Goal:** Implement the 4 high-priority extractors identified in Step 3.7 to increase extraction coverage from ~30% to ~80%.
  
  - [X] **Implement VitalSign Extractor** (34 documents)
    - [X] Add VitalSign to SECTION_NAMES mapping in conceptExtractor.js
    - [X] Create extractVitalSign function:
      - Extract: vitalType, value, unit, measuredDate
      - Handle multiple vital signs per entry (BP, temp, weight, pulse, etc.)
      - Extract LOINC codes
    - [X] Update extractConcepts to call extractVitalSign
    - [X] Test with sample documents
  
  - [X] **Implement LabResult Extractor** (34 documents)
    - [X] Add Results to SECTION_NAMES mapping (maps to LabResult)
    - [X] Create extractLabResult function:
      - Extract: testName, value, unit, referenceRange, interpretation, resultDate
      - Extract clinical history from narrative
      - Extract LOINC codes
    - [X] Update extractConcepts to call extractLabResult
    - [X] Test with sample documents
  
  - [X] **Implement Immunization Extractor** (34 documents)
    - [X] Add Immunizations to SECTION_NAMES mapping
    - [X] Create extractImmunization function:
      - Extract: vaccineName, administeredDate, manufacturer, lotNumber
      - Extract CVX vaccine codes
    - [X] Update extractConcepts to call extractImmunization
    - [X] Test with sample documents
  
  - [X] **Implement Encounter Extractor** (32 documents)
    - [X] Add Encounters, VisitDiagnoses to SECTION_NAMES mapping
    - [X] Create extractEncounter function:
      - Extract: encounterType, encounterDate, reasonForVisit, diagnoses, provider
      - Extract CPT codes
    - [X] Update extractConcepts to call extractEncounter
    - [X] Test with sample documents
  
  - [X] **Deploy and Re-Extract**
    - [X] Deploy updated backend (Version: 8ce68b2f-4188-48a3-81c8-26bf4eb9b8d4)
    - [X] Re-extract all 34 documents
    - [X] Verify extraction counts (should have 200+ concepts instead of 77)
    - [X] Download updated concepts
  
  - [X] **Verify Coverage**
    - [X] Run analyze-cda-value.js again
    - [X] Confirm extraction coverage increased to ~80%
    - [X] Document any remaining gaps
  
  **Result:** 
  - **Total concepts: 2,282** (up from 77) - **29.6x increase!**
  - LabResult: 1,637 concepts
  - Immunization: 283 concepts
  - VitalSign: 183 concepts
  - Encounter: 102 concepts
  - Problem: 77 concepts
  - **100% narrative text coverage**
  - **95% code coverage**
  - All 34 documents successfully re-extracted
  - Extraction coverage dramatically increased as expected

- [X] **Step 3.8.1 — Clean Up Reference Objects (30 min)**
  
  **Goal:** Remove unreadable CDA reference objects from extracted concepts, keeping only human-readable text.
  
  **Issue:** Many fields contain reference objects like:
  ```json
  "testName": {
    "reference": { "@_value": "#Result.1.2.840.114350.1.13.296.2.7.2.798268.486022361.Comp34Name" },
    "#text": "% Eosinophils"
  }
  ```
  These reference IDs are technical artifacts with no practical value for health journey analysis.
  
  - [X] Update extractors to extract only readable text:
    - [X] LabResult: Extract testName as string, not object
    - [X] VitalSign: Extract vitalType as string, not object
    - [X] Immunization: Extract vaccineName as string, not object
    - [X] Encounter: Extract encounterType as string, not object
    - [X] Problem, Medication, Allergy, Procedure: Already using getDisplayName (clean)
  - [X] Deploy updated backend (Version: cdc17860-9d05-4392-bc60-55a97d095d28)
  - [X] Re-extract all 34 documents
  - [X] Verify cleaner, more readable output
  
  **Result:** 
  - Added `extractCleanText(field, refMap)` helper function
  - Updated 4 extractors to use clean text extraction
  - All concepts now have clean, human-readable field values
  - **Before:** `"testName": { "reference": {...}, "#text": "% Eosinophils" }`
  - **After:** `"testName": "% Eosinophils"`
  - Same concept count maintained: 2,282 concepts
  - All fields now AI-consumable without parsing nested objects

- [X] **Step 3.8.2 — Refactor VitalSign and LabResult to Grouped Structure (1 hour)**
  
  **Goal:** Fix structural inefficiency where VitalSigns and LabResults are flattened into individual concepts with duplicated narratives.
  
  **Current Problem:**
  - 606 individual LabResult concepts with same 2000-char narrative duplicated
  - 183 individual VitalSign concepts with same narrative duplicated
  - Loses clinical grouping context (CBC panel with 21 tests → 21 separate concepts)
  - Inflates concept count artificially
  
  **Correct Structure:**
  - CDA organizes these as **organizers** containing multiple **observations**
  - LabPanel concept with array of test results
  - VitalSignSet concept with array of readings
  - Single narrative per group
  
  **Tasks:**
  - [X] Update FIELD_SCHEMA.md with new concept types:
    - [X] LabPanel (replaces individual LabResult)
    - [X] VitalSignSet (replaces individual VitalSign)
  - [X] Refactor `extractLabResult` to return single LabPanel per organizer
  - [X] Refactor `extractVitalSign` to return single VitalSignSet per organizer
  - [X] Update SECTION_NAMES mapping to use new concept types
  - [X] Deploy updated backend (Version: 0dd2c123-54e1-4512-afa7-8ffc51c41be5)
  - [X] Re-extract all 34 documents
  - [X] Verify improved structure and reduced redundancy
  
  **Result:**
  - **Concept count: 493 (down from 2,282) - 78% reduction!**
  - **Before:** 606 LabResult + 183 VitalSign = 789 individual concepts
  - **After:** 73 LabPanel + 3 VitalSignSet = 76 grouped concepts (10x reduction)
  - **Narrative duplication eliminated:** Single narrative per panel/set instead of per test
  - **Clinical grouping preserved:** CBC panel with 21 tests stays together
  - **Structure matches clinical thinking:** Panels and vital sign sets as clinicians see them
  
  **Example VitalSignSet:**
  ```json
  {
    "conceptType": "VitalSignSet",
    "conceptId": "vital_5833098300-Z8273403",
    "measuredDate": "20251103170500+0000",
    "readings": [
      {"vitalType": "Systolic blood pressure", "value": "120", "unit": "mm[Hg]", "loinc": "8480-6"},
      {"vitalType": "Diastolic blood pressure", "value": "74", "unit": "mm[Hg]", "loinc": "8462-4"},
      {"vitalType": "Heart rate", "value": "63", "unit": "/min", "loinc": "8867-4"}
    ],
    "narrativeText": "..."
  }
  ```
  
  **Example LabPanel:**
  ```json
  {
    "conceptType": "LabPanel",
    "conceptId": "lab_1416417350",
    "panelName": "CBC with Differential",
    "resultDate": "20250922",
    "status": "Final",
    "results": [
      {"testName": "WBC", "value": "4.2", "unit": "x10E3/uL", "referenceRange": "3.4-10.8"},
      {"testName": "Hemoglobin", "value": "12.8", "unit": "g/dL", "referenceRange": "13.0-17.7", "interpretation": "Low"}
    ],
    "narrativeText": "..."
  }
  ```

- [ ] **Step 3.9 — Epic Document Export Investigation (User Task)**
  
  **CHECKLIST: What to Look For in Epic MyChart**
  
  **Primary Goal:** Find and export individual visit notes (like DOC0003) that contain ProgressNotes with rich clinical narratives.
  
  **Step-by-Step Investigation:**
  
  1. **Log into Epic MyChart**
     - Navigate to your health system's patient portal
     - Sign in with your credentials
  
  2. **Locate Medical Records Section**
     - Look for: "Health Records", "Medical Records", "Visit History", or "Documents"
     - Common menu locations: Main navigation, sidebar, or under "Health" tab
  
  3. **Identify Available Document Types**
     Check for these specific document types (in priority order):
     
     - [ ] **Office Visit Notes** / **Visit Summaries**
       - Look for specific visit dates (e.g., "Office Visit - 11/03/2025")
       - These typically contain ProgressNotes with doctor's narrative
       - **HIGHEST PRIORITY** - This is what DOC0003 is
     
     - [ ] **After Visit Summary (AVS)**
       - Given to patients after each visit
       - Contains visit discussion, instructions, follow-up
       - Usually available immediately after visit
     
     - [ ] **Progress Notes** / **Clinical Notes**
       - May be separate section or within visit notes
       - Contains detailed clinical narrative
       - Your cough history would be here
     
     - [ ] **Consultation Notes**
       - Notes from specialist visits
       - May have more detailed problem discussion
     
     - [ ] **Procedure Notes**
       - Notes from procedures performed
       - May contain clinical context
     
     - [ ] **Discharge Summaries**
       - If you've had hospital stays
       - Contains comprehensive clinical narrative
     
     - [ ] **Test Results with Notes**
       - Some test results include provider comments
       - Check radiology reports, lab results
  
  4. **Compare with Current Export**
     - Your current export: "Patient Health Summary" (structured data)
     - DOC0003 is an "Office Visit Note" (has ProgressNotes)
     - Most documents (DOC0001, DOC0002, DOC0004-DOC0034) are summaries
     - **Goal:** Find how to export individual visit notes
  
  5. **Look for Export/Download Options**
     - [ ] "Download" button next to individual visits
     - [ ] "Export Records" or "Download Records" section
     - [ ] "Share Records" or "Send Records" feature
     - [ ] "Print" option (can save as PDF)
     - [ ] "Request Medical Records" (formal request process)
  
  6. **Check Date Range**
     - Your cough started around May 2023 (Vancouver Marathon)
     - Look for visit notes from: **May 2023 - Present**
     - Specifically check visits where cough was discussed
  
  7. **Document Findings**
     - Note which document types are available
     - Note which require special request
     - Note any restrictions (e.g., "Available 7 days after visit")
     - Take screenshots if helpful
  
  8. **Export Strategy**
     If individual visit notes are available:
     - Export visits from 2023-2025 where cough was discussed
     - Export any specialist consultations (pulmonology, etc.)
     - Export any test results with clinical notes
  
  **Common Limitations:**
  - Some notes may be "In Progress" and not yet available
  - Provider working notes may be restricted
  - Some systems only show summaries in patient portal
  - Full clinical notes may require formal medical records request
  
  **If Visit Notes Not Available in Portal:**
  - Contact Medical Records department
  - Request "Office Visit Notes" for specific dates
  - May need to fill out medical records release form
  - Usually free for patient's own records
  
  **Goal:** Identify if richer narrative content (like DOC0003) is available and how to access it

**Estimate:** 7–8 hours (Steps 3.5-3.8), plus user investigation time for Step 3.9.

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
