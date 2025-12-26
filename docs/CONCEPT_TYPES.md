# Clinical Concept Types

This document defines the core clinical concept types extracted from CDA documents for AI consumption.

---

## Overview

Clinical data is organized into **8 core concept types**, each representing a distinct category of health information. These concepts are extracted from CDA clinical sections and normalized into a clean, AI-consumable format.

---

## Concept Types

### 1. **Problem**

**Description:** Diagnoses, conditions, symptoms, and clinical findings documented in the patient's health record.

**CDA Source Sections:**
- Active Problems (`11450-4`)
- Resolved Problems (`11348-0`)

**Examples:**
- Chronic cough
- Hypertension
- Type 2 Diabetes Mellitus
- Seasonal allergies (as a problem, not allergen)

**Key Characteristics:**
- Has onset date
- Has status (Active/Resolved)
- Coded in SNOMED CT, ICD-10-CM, ICD-9-CM

---

### 2. **Medication**

**Description:** Prescribed medications, medication administrations, and medication statements.

**CDA Source Sections:**
- Medications (`10160-0`)
- Prescriptions (`66149-6`)
- Discharge Medications (`10183-2`)

**Examples:**
- Lisinopril 10mg daily
- Metformin 500mg twice daily
- Albuterol inhaler as needed

**Key Characteristics:**
- Has drug name
- Has dosage, route, frequency
- Has start/end dates
- Coded in RxNorm

---

### 3. **Allergy**

**Description:** Documented allergies and adverse reactions to substances.

**CDA Source Sections:**
- Allergies (`48765-2`)

**Examples:**
- Penicillin allergy (anaphylaxis)
- Pollen allergy (seasonal rhinitis)
- Latex sensitivity

**Key Characteristics:**
- Has allergen (substance)
- Has reaction type
- Has severity (mild/moderate/severe)
- Coded in RxNorm, SNOMED CT

---

### 4. **Procedure**

**Description:** Medical procedures, surgeries, and interventions performed on the patient.

**CDA Source Sections:**
- Procedures (`47519-4`)

**Examples:**
- Appendectomy
- Colonoscopy
- Blood draw
- Physical therapy session

**Key Characteristics:**
- Has procedure name
- Has performed date
- May have performer (provider)
- Coded in CPT, SNOMED CT

---

### 5. **VitalSign**

**Description:** Physiological measurements taken during clinical encounters.

**CDA Source Sections:**
- Vital Signs (`8716-3`)

**Examples:**
- Blood Pressure: 120/80 mmHg
- Temperature: 98.6°F
- Weight: 150 lbs
- Heart Rate: 72 bpm

**Key Characteristics:**
- Has measurement type
- Has value and unit
- Has measured date/time
- Coded in LOINC

---

### 6. **LabResult**

**Description:** Laboratory test results and diagnostic findings.

**CDA Source Sections:**
- Results (`30954-2`)

**Examples:**
- Hemoglobin A1c: 6.5%
- Total Cholesterol: 180 mg/dL
- White Blood Cell Count: 7.2 K/uL

**Key Characteristics:**
- Has test name
- Has value, unit, reference range
- Has result date
- Has interpretation (normal/abnormal)
- Coded in LOINC

---

### 7. **Immunization**

**Description:** Vaccines and immunizations administered to the patient.

**CDA Source Sections:**
- Immunizations (`11369-6`)

**Examples:**
- COVID-19 vaccine (Pfizer)
- Influenza vaccine (2024-2025 season)
- Tetanus booster

**Key Characteristics:**
- Has vaccine name
- Has administration date
- May have lot number, manufacturer
- Coded in CVX (vaccine codes)

---

### 8. **Encounter**

**Description:** Clinical visits, admissions, and healthcare interactions.

**CDA Source Sections:**
- Encounters (`46240-8`)
- Visit Diagnoses (`51848-0`)
- Reason for Visit (`29299-5`)

**Examples:**
- Office visit for annual physical
- Emergency department visit for chest pain
- Hospital admission for pneumonia

**Key Characteristics:**
- Has encounter type (office visit, ED, inpatient)
- Has encounter date
- Has associated diagnoses
- Has care team/providers
- Coded in CPT, SNOMED CT

---

## Concept Type Mapping

| CDA Section | LOINC Code | Primary Concept Type | Secondary Concept Type |
|-------------|------------|---------------------|------------------------|
| Allergies | 48765-2 | Allergy | - |
| Medications | 10160-0 | Medication | - |
| Prescriptions | 66149-6 | Medication | - |
| Discharge Medications | 10183-2 | Medication | - |
| Active Problems | 11450-4 | Problem | - |
| Resolved Problems | 11348-0 | Problem | - |
| Immunizations | 11369-6 | Immunization | - |
| Vital Signs | 8716-3 | VitalSign | - |
| Results | 30954-2 | LabResult | - |
| Procedures | 47519-4 | Procedure | - |
| Encounters | 46240-8 | Encounter | - |
| Visit Diagnoses | 51848-0 | Encounter | Problem |
| Reason for Visit | 29299-5 | Encounter | - |
| Care Teams | 85847-2 | Encounter | - |
| Plan of Treatment | 18776-5 | *(Future)* | - |
| Progress Notes | 10164-2 | *(Future)* | - |

---

## Design Principles

1. **Mutually Exclusive:** Each clinical entry maps to exactly one primary concept type
2. **Extensible:** New concept types can be added as needed
3. **AI-Optimized:** Designed for consumption by LLMs and analysis tools
4. **Minimal:** Only essential information, no formatting or redundancy
5. **Traceable:** Each concept retains source document and section references

---

## Future Concept Types (Not Yet Implemented)

- **CarePlan** - Treatment plans and care coordination
- **SocialHistory** - Smoking, alcohol, occupation
- **FamilyHistory** - Hereditary conditions
- **Observation** - General clinical observations not fitting other categories

---

## Usage

When extracting concepts from CDA documents:
1. Identify the CDA section by LOINC code
2. Map to the appropriate concept type
3. Extract only the fields defined in the concept's schema
4. Store as a clean, self-contained concept object

See `FIELD_SCHEMA.md` for detailed field definitions per concept type.
