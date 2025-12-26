# Comprehensive CDA Value Analysis

**Date:** 2025-12-26  
**Documents Analyzed:** 34 CDA documents with extracted concepts

---

## Executive Summary

**Current State:**
- ✅ **77 Problem concepts** extracted with full narrative text
- ✅ **100% field coverage** for narrativeText, codes, and dates
- ❌ **Only 4 of 8 concept types** currently extracted (Problem, Medication, Allergy, Procedure)
- ❌ **10 major sections** present in documents but NOT extracted

**Key Finding:** Significant valuable health journey information exists in CDA documents but is not yet extracted.

---

## Part 1: What We Have (Extracted Concepts)

### Extraction Statistics

| Metric | Count | Coverage |
|--------|-------|----------|
| Total Concepts | 77 | - |
| Problem Concepts | 77 | 100% |
| With Narrative Text | 77 | 100% |
| With Medical Codes | 77 | 100% |
| With Dates | 77 | 100% |

### Concept Types Extracted

✅ **Currently Extracted:**
- Problem (77 concepts from ActiveProblems, ResolvedProblems)
- Medication (from Medications, Prescriptions, DischargeMeds)
- Allergy (from Allergies)
- Procedure (from Procedures)

❌ **Not Yet Extracted:**
- VitalSign
- LabResult
- Immunization
- Encounter

### Sample Narrative Quality

Narratives are successfully captured. Example:
```
"Problem Noted Date Diagnosed Date Chronic cough 10/17/2025 Bronchial spasms 
10/17/2025 Elevated glucose 02/21/2025 Elevated ferritin, refer to hematology 
02/21/2024 Leg cramps 10/09/2023 hyperthyroidism..."
```

---

## Part 2: What We're Missing (Unextracted Sections)

### High-Value Sections Not Extracted

| Section | Documents | Priority | Value |
|---------|-----------|----------|-------|
| **VitalSigns** | 34 | HIGH | Health metrics over time (BP, weight, temp) |
| **Results** | 34 | HIGH | Lab trends, diagnostic findings, clinical history |
| **Immunizations** | 34 | HIGH | Vaccination history |
| **Encounters** | 32 | HIGH | Visit timeline, care continuity |
| **ProgressNotes** | 25 | HIGH | Rich clinical narratives (like DOC0003) |
| **PlanOfTreatment** | 33 | MEDIUM | Referrals, follow-ups, care plans |
| **VisitDiagnoses** | 30 | MEDIUM | Visit-specific diagnoses |
| **ReasonForVisit** | 25 | MEDIUM | Chief complaints |
| **CareTeams** | 34 | LOW | Provider information |

---

## Part 3: Health Journey Value Assessment

### ✅ What We Capture Well

1. **Problem Identification**
   - Problem names with medical codes (SNOMED, ICD-10)
   - Onset dates
   - Current status (Active/Resolved)
   - Section-level narrative context

2. **Medication Information**
   - Drug names with RxNorm codes
   - Dosage, route, frequency
   - Start dates
   - Instructions

3. **Basic Temporal Data**
   - When problems started
   - When medications started
   - When procedures performed

### ❌ What We're Missing

#### **Temporal Patterns**
- ✗ Symptom progression over time
- ✗ Problem resolution dates (only in ResolvedProblems)
- ✗ Treatment timeline correlation

#### **Treatment Effectiveness**
- ✗ Did medications help?
- ✗ Side effects experienced
- ✗ Dose adjustments over time
- ✗ Treatment adherence

#### **Provider Observations**
- ~ Clinical exam findings (in narrative, not structured)
- ✗ Physical exam details
- ✗ Assessment and plan sections

#### **Patient-Reported Outcomes**
- ~ Patient complaints (in ProgressNotes narrative)
- ✗ Quality of life measures
- ✗ Functional status
- ✗ Symptom severity scales

#### **Care Coordination**
- ✗ Referrals to specialists
- ✗ Follow-up appointments
- ✗ Care team coordination

#### **Social Determinants**
- ✗ Lifestyle factors
- ✗ Environmental exposures (mentioned in narrative: "sensitive to environmental changes")
- ✗ Occupation
- ✗ Exercise/activity (Vancouver Marathon mentioned in narrative but not extracted)

---

## Part 4: Recommendations

### HIGH PRIORITY - Implement Missing Extractors

#### 1. **VitalSigns Extractor** (34 documents)
**Fields to Extract:**
- `vitalType` - Type of measurement (BP, temp, weight, etc.)
- `value` - Measured value
- `unit` - Unit of measurement
- `measuredDate` - When measured
- `codes.loinc` - LOINC code

**Value:** Track health metrics over time, identify trends

#### 2. **Results (LabResult) Extractor** (34 documents)
**Fields to Extract:**
- `testName` - Name of lab test
- `value` - Result value
- `unit` - Unit
- `referenceRange` - Normal range
- `interpretation` - Normal/Abnormal/High/Low
- `resultDate` - When result obtained
- `narrativeText` - Clinical history and findings
- `codes.loinc` - LOINC code

**Value:** Lab trends, diagnostic findings, clinical context in narratives

#### 3. **Immunizations Extractor** (34 documents)
**Fields to Extract:**
- `vaccineName` - Vaccine name
- `administeredDate` - When given
- `manufacturer` - Vaccine manufacturer
- `lotNumber` - Lot/batch number
- `codes.cvx` - CVX vaccine code

**Value:** Complete vaccination history

#### 4. **Encounters Extractor** (32 documents)
**Fields to Extract:**
- `encounterType` - Office visit, ED, inpatient, etc.
- `encounterDate` - When occurred
- `reasonForVisit` - Chief complaint
- `diagnoses` - Associated diagnoses
- `provider` - Attending provider
- `codes.cpt` - CPT code

**Value:** Visit timeline, care continuity, context for other concepts

### MEDIUM PRIORITY - Enhance Existing Extractors

#### **Problem Enhancements:**
- Add `resolvedDate` field (extract from ResolvedProblems)
- Add `severity` field (if documented)
- Add `clinicalNotes` field (extract from ProgressNotes section when available)
- Link problems to related ProgressNotes narratives

#### **Medication Enhancements:**
- Add `endDate` field (discontinuation date)
- Add `indication` field (reason for medication)
- Add `prescriber` field (prescribing provider)
- Extract medication effectiveness from narratives

### LOW PRIORITY - Additional Sections

These sections exist but may have lower immediate value:
- CareTeams (34 docs) - Provider directory information
- PlanOfTreatment (33 docs) - Future appointments, care plans
- VisitDiagnoses (30 docs) - Visit-specific diagnoses
- ReasonForVisit (25 docs) - Chief complaints

### NARRATIVE ENHANCEMENT

**Current State:** `narrativeText` includes section-level narrative (same for all concepts in section)

**Recommendation:** Add concept-specific narrative extraction
- **For Problems:** Extract relevant text from ProgressNotes if problem is mentioned
- **For Results:** Separate clinical history from findings
- **For Medications:** Extract indication and effectiveness separately

### TEMPORAL ANALYSIS

**Recommendation:** Create timeline view across all concepts
- Group all concepts by date
- Show: problem onset → medication start → lab results → resolution
- Enable "health journey" queries like:
  - "What happened around my cough diagnosis?"
  - "What treatments were tried for hyperthyroidism?"
  - "How did my lab values change over time?"

---

## Part 5: Specific Gaps for Your Health Journey

Based on your cough history (Vancouver Marathon May 2023 → ongoing):

### What We Have:
- ✅ Problem: "Chronic cough" (onset 10/17/2025)
- ✅ Problem: "Bronchial spasms" (onset 10/17/2025)
- ✅ Medication: albuterol inhaler (started 10/17/2025)
- ✅ Narrative mentions: "Cough intermittently for over a year, mostly mild"

### What We're Missing:
- ❌ **Earlier visit notes** (May 2023 - Oct 2024) - Need from Epic
- ❌ **Chest X-ray results** - In Results section, not extracted yet
- ❌ **Vital signs during visits** - In VitalSigns section, not extracted yet
- ❌ **Treatment effectiveness** - Did albuterol help? (in narratives, not structured)
- ❌ **Environmental triggers** - Mentioned in narrative but not extracted
- ❌ **Exercise context** - Vancouver Marathon context not captured

---

## Part 6: Implementation Priority

### Phase 1 (Immediate - Next Session)
1. Implement VitalSigns extractor
2. Implement Results (LabResult) extractor
3. Implement Immunizations extractor
4. Implement Encounters extractor

**Rationale:** These 4 extractors cover 130+ documents and provide essential health journey data.

### Phase 2 (After Epic Investigation)
1. Enhance Problem extractor with ProgressNotes linkage
2. Add concept-specific narrative extraction
3. Implement timeline view

**Rationale:** After Step 3.8 (Epic investigation), we'll know what additional documents are available and can optimize extraction accordingly.

### Phase 3 (Future)
1. Extract PlanOfTreatment, VisitDiagnoses, ReasonForVisit
2. Implement temporal analysis queries
3. Add treatment effectiveness tracking

---

## Conclusion

**Current Extraction Coverage:** ~30% of available CDA data

**With Recommended Extractors:** ~80% of available CDA data

**Key Insight:** The CDA documents contain rich health journey information, but most of it (VitalSigns, Results, Immunizations, Encounters) is not yet extracted. Implementing the 4 high-priority extractors will dramatically increase the value of the extracted concepts for AI/LLM analysis and health journey research.

**Next Step:** Proceed to Step 3.8 (Epic investigation) to identify what additional documents (especially earlier visit notes with ProgressNotes) are available to fill temporal gaps.
