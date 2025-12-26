# Clinical Concept Field Schema

This document defines the essential fields for each clinical concept type, optimized for AI consumption.

---

## Design Principles

1. **Minimal & Essential** - Only fields useful for AI/LLM analysis
2. **No Redundancy** - One primary code per coding system
3. **No Formatting** - No HTML (tr/td), no internal references (#problem18name)
4. **Self-Contained** - Each concept is independently understandable
5. **Traceable** - Always include source document and section

---

## Common Fields (All Concept Types)

Every concept includes these base fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `conceptType` | string | Yes | Type of concept (Problem, Medication, etc.) |
| `conceptId` | string | Yes | Unique identifier for this concept instance |
| `name` | string | Yes | Human-readable name/description |
| `date` | string | Yes | Primary date (ISO 8601 format YYYYMMDD) |
| `status` | string | No | Current status (Active, Resolved, Completed, etc.) |
| `sourceDocId` | string | Yes | Source document ID (e.g., "cda:DOC0001") |
| `sourceSection` | string | Yes | Source CDA section (e.g., "ActiveProblems") |

---

## 1. Problem

**Purpose:** Diagnoses, conditions, symptoms, clinical findings

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Problem name | "Chronic cough" |
| `onsetDate` | string | Yes | When problem started/noted (YYYYMMDD) | "20251017" |
| `status` | string | Yes | Active or Resolved | "Active" |
| `severity` | string | No | Severity level if documented | "Moderate" |
| `codes` | object | Yes | Medical codes | See below |
| `codes.snomed` | string | No | SNOMED CT code | "68154008" |
| `codes.icd10` | string | No | ICD-10-CM code | "R05.3" |
| `codes.icd9` | string | No | ICD-9-CM code (legacy) | "786.2" |

### Example
```json
{
  "conceptType": "Problem",
  "conceptId": "prob_170341297",
  "name": "Chronic cough",
  "onsetDate": "20251017",
  "status": "Active",
  "codes": {
    "snomed": "68154008",
    "icd10": "R05.3"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "ActiveProblems"
}
```

---

## 2. Medication

**Purpose:** Prescribed medications, administrations

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `drugName` | string | Yes | Medication name | "Lisinopril" |
| `dose` | string | No | Dosage amount | "10 mg" |
| `route` | string | No | Administration route | "Oral" |
| `frequency` | string | No | How often taken | "Once daily" |
| `startDate` | string | No | When started (YYYYMMDD) | "20240101" |
| `endDate` | string | No | When ended (YYYYMMDD) | "20250101" |
| `status` | string | Yes | Active, Discontinued, Completed | "Active" |
| `codes` | object | No | Medical codes | See below |
| `codes.rxnorm` | string | No | RxNorm code | "314076" |

### Example
```json
{
  "conceptType": "Medication",
  "conceptId": "med_123456",
  "drugName": "Lisinopril",
  "dose": "10 mg",
  "route": "Oral",
  "frequency": "Once daily",
  "startDate": "20240101",
  "status": "Active",
  "codes": {
    "rxnorm": "314076"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "Medications"
}
```

---

## 3. Allergy

**Purpose:** Documented allergies and adverse reactions

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `allergen` | string | Yes | Substance causing allergy | "Penicillin" |
| `reaction` | string | No | Type of reaction | "Anaphylaxis" |
| `severity` | string | No | Severity level | "Severe" |
| `onsetDate` | string | No | When allergy noted (YYYYMMDD) | "20200315" |
| `status` | string | Yes | Active, Resolved | "Active" |
| `codes` | object | No | Medical codes | See below |
| `codes.rxnorm` | string | No | RxNorm code for allergen | "7980" |
| `codes.snomed` | string | No | SNOMED CT code | "91936005" |

### Example
```json
{
  "conceptType": "Allergy",
  "conceptId": "allergy_169542279",
  "allergen": "Penicillin",
  "reaction": "Anaphylaxis",
  "severity": "Severe",
  "onsetDate": "20200315",
  "status": "Active",
  "codes": {
    "rxnorm": "7980"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "Allergies"
}
```

---

## 4. Procedure

**Purpose:** Medical procedures, surgeries, interventions

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `procedureName` | string | Yes | Name of procedure | "Colonoscopy" |
| `performedDate` | string | Yes | When performed (YYYYMMDD) | "20250115" |
| `status` | string | Yes | Completed, Scheduled, Cancelled | "Completed" |
| `performer` | string | No | Provider who performed | "Dr. Smith" |
| `codes` | object | No | Medical codes | See below |
| `codes.cpt` | string | No | CPT code | "45378" |
| `codes.snomed` | string | No | SNOMED CT code | "73761001" |

### Example
```json
{
  "conceptType": "Procedure",
  "conceptId": "proc_987654",
  "procedureName": "Colonoscopy",
  "performedDate": "20250115",
  "status": "Completed",
  "codes": {
    "cpt": "45378",
    "snomed": "73761001"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "Procedures"
}
```

---

## 5. VitalSign

**Purpose:** Physiological measurements

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `vitalType` | string | Yes | Type of vital sign | "Blood Pressure" |
| `value` | string | Yes | Measured value | "120/80" |
| `unit` | string | Yes | Unit of measurement | "mmHg" |
| `measuredDate` | string | Yes | When measured (YYYYMMDD or full timestamp) | "20251209165402" |
| `codes` | object | No | Medical codes | See below |
| `codes.loinc` | string | No | LOINC code | "85354-9" |

### Example
```json
{
  "conceptType": "VitalSign",
  "conceptId": "vital_555123",
  "vitalType": "Blood Pressure",
  "value": "120/80",
  "unit": "mmHg",
  "measuredDate": "20251209165402",
  "codes": {
    "loinc": "85354-9"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "VitalSigns"
}
```

---

## 6. LabResult

**Purpose:** Laboratory test results

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `testName` | string | Yes | Name of lab test | "Hemoglobin A1c" |
| `value` | string | Yes | Test result value | "6.5" |
| `unit` | string | Yes | Unit of measurement | "%" |
| `referenceRange` | string | No | Normal range | "4.0-5.6" |
| `interpretation` | string | No | Normal, Abnormal, High, Low | "High" |
| `resultDate` | string | Yes | When result obtained (YYYYMMDD) | "20251201" |
| `status` | string | Yes | Final, Preliminary, Corrected | "Final" |
| `codes` | object | No | Medical codes | See below |
| `codes.loinc` | string | No | LOINC code | "4548-4" |

### Example
```json
{
  "conceptType": "LabResult",
  "conceptId": "lab_789012",
  "testName": "Hemoglobin A1c",
  "value": "6.5",
  "unit": "%",
  "referenceRange": "4.0-5.6",
  "interpretation": "High",
  "resultDate": "20251201",
  "status": "Final",
  "codes": {
    "loinc": "4548-4"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "Results"
}
```

---

## 7. Immunization

**Purpose:** Vaccines administered

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `vaccineName` | string | Yes | Name of vaccine | "COVID-19 vaccine" |
| `administeredDate` | string | Yes | When given (YYYYMMDD) | "20240315" |
| `manufacturer` | string | No | Vaccine manufacturer | "Pfizer" |
| `lotNumber` | string | No | Lot/batch number | "EL9261" |
| `status` | string | Yes | Completed, Not Done | "Completed" |
| `codes` | object | No | Medical codes | See below |
| `codes.cvx` | string | No | CVX vaccine code | "208" |

### Example
```json
{
  "conceptType": "Immunization",
  "conceptId": "imm_456789",
  "vaccineName": "COVID-19 vaccine",
  "administeredDate": "20240315",
  "manufacturer": "Pfizer",
  "status": "Completed",
  "codes": {
    "cvx": "208"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "Immunizations"
}
```

---

## 8. Encounter

**Purpose:** Clinical visits and healthcare interactions

### Fields

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `encounterType` | string | Yes | Type of visit | "Office Visit" |
| `encounterDate` | string | Yes | When occurred (YYYYMMDD) | "20251209" |
| `reasonForVisit` | string | No | Chief complaint | "Annual physical" |
| `diagnoses` | array | No | Associated diagnoses | ["Hypertension", "Diabetes"] |
| `provider` | string | No | Attending provider | "Dr. Johnson" |
| `status` | string | Yes | Completed, Scheduled, Cancelled | "Completed" |
| `codes` | object | No | Medical codes | See below |
| `codes.cpt` | string | No | CPT code for visit | "99213" |

### Example
```json
{
  "conceptType": "Encounter",
  "conceptId": "enc_321654",
  "encounterType": "Office Visit",
  "encounterDate": "20251209",
  "reasonForVisit": "Annual physical",
  "diagnoses": ["Hypertension", "Type 2 Diabetes"],
  "status": "Completed",
  "codes": {
    "cpt": "99213"
  },
  "sourceDocId": "cda:DOC0001",
  "sourceSection": "Encounters"
}
```

---

## Field Extraction Rules

### 1. **Name/Description Fields**
- Resolve internal references (#problem18name) to plain text
- Use displayName from primary code if available
- Fall back to narrative text if no displayName

### 2. **Date Fields**
- Always use ISO 8601 format: YYYYMMDD or YYYYMMDDHHmmss
- Extract from `effectiveTime.low.@_value` for onset/start dates
- Use `author.time.@_value` for entry dates if primary date missing

### 3. **Code Fields**
- Keep only ONE code per coding system (primary code)
- Priority: Use the code from the main `value` or `code` element
- Ignore redundant translations unless they're the only source

### 4. **Status Fields**
- Normalize to standard values: Active, Resolved, Completed, Discontinued
- Extract from `entryRelationship.observation.value.@_displayName`
- Default to "Active" if not specified

### 5. **Excluded Data**
- ❌ HTML formatting (table, tr, td elements)
- ❌ Internal references (#problem18name, #allergy3)
- ❌ Redundant code translations (keep primary only)
- ❌ Template IDs and structural metadata
- ❌ XML attributes (@_classCode, @_moodCode, etc.)

---

## Validation Rules

1. **Required Fields:** All required fields must be present or concept is invalid
2. **Date Format:** Dates must be valid ISO 8601 (YYYYMMDD minimum)
3. **Code Format:** Codes should be alphanumeric strings
4. **Concept ID:** Must be unique within a document
5. **Source Traceability:** sourceDocId and sourceSection must always be present

---

## Usage in Extraction

When extracting concepts from `json:DOC####` files:

1. Identify the concept type from the CDA section
2. Parse the entry structure
3. Extract only the fields defined in this schema
4. Resolve all references to plain text
5. Validate required fields are present
6. Store as clean JSON object

The result should be a flat, self-contained object with no nested complexity beyond simple arrays or code objects.
