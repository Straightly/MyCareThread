# Narrative Content Analysis - MyCareThread Documents

**Analysis Date:** 2025-12-26  
**Documents Analyzed:** 34 (DOC0001-DOC0034)

---

## Executive Summary

**Key Findings:**
- ✅ **ProgressNotes section found** in DOC0003 and others - contains rich clinical narratives
- ✅ **ReasonForVisit section found** in DOC0003 - contains chief complaints
- ✅ **PlanOfTreatment section found** in DOC0002 - contains future appointments and plans
- ✅ All expected narrative-rich sections are present in the document set
- 📊 9 different section types identified across all documents
- 📝 Most sections contain both narrative text AND structured entries

---

## Section Summary

| Section Name | Documents | With Narrative | With Entries | Avg Narrative Length |
|--------------|-----------|----------------|--------------|---------------------|
| **Results** | 34 | 34 | 34 | ~450 chars |
| **Procedures** | 34 | 34 | 34 | ~200 chars |
| **ActiveProblems** | 34 | 34 | 34 | ~300 chars |
| **Medications** | 34 | 34 | 34 | ~400 chars |
| **VitalSigns** | 34 | 34 | 34 | ~350 chars |
| **Immunizations** | 34 | 34 | 34 | ~300 chars |
| **Allergies** | 34 | 34 | 1 | ~100 chars |
| **ResolvedProblems** | 34 | 34 | 34 | ~150 chars |
| **CareTeams** | 34 | 34 | 34 | ~200 chars |
| **Encounters** | 33 | 33 | 33 | ~400 chars |
| **VisitDiagnoses** | 2 | 2 | 2 | ~500 chars |
| **PlanOfTreatment** | 1 | 1 | 1 | ~600 chars |
| **ReasonForVisit** | 1 | 1 | 0 | ~10 chars |
| **ProgressNotes** | 1 | 1 | 0 | ~500 chars |
| **Prescriptions** | 1 | 1 | 1 | ~200 chars |
| **DischargeMeds** | 1 | 1 | 1 | ~400 chars |

---

## Critical Discovery: Progress Notes Found!

### **DOC0003 contains ProgressNotes with rich clinical narrative:**

```
.SUBJECTIVE: Zhi An is a 60 y.o. male who presents with the following concerns:
Chief Complaint: Patient presents with Cough
Has had painful cough since Wednesday. Cough feels deep like it comes from the stomach. 
Pt states that the mucus is "bitter, and salty"
Cough intermittently for over a year, mostly mild, patient reports that in general he has 
sensitive body, sensitive to the environmental changes, has been taking Claritin daily for 
the itchy throat, was treated for pneumonia few months ago...
```

**This is exactly the type of narrative you were looking for!**

### **DOC0003 also contains ReasonForVisit:**
```
Cough
```

---

## Sample Narratives by Section Type

### **1. ProgressNotes (DOC0003)**
Contains detailed clinical narrative with:
- Subjective patient complaints
- Chief complaint
- History of present illness
- Patient's own description of symptoms
- Timeline of symptoms ("over a year", "since Wednesday")
- Previous treatments mentioned

**Value for Research:** ⭐⭐⭐⭐⭐ (Highest)  
This is the gold standard for clinical context and patient history.

### **2. Results (All Documents)**
Contains:
- Radiology reports with clinical history
- Lab results with interpretation
- Imaging findings

**Example from DOC0001:**
```
CLINICAL HISTORY: F/u x ray 9/8 /2025 showed pneumonia, ICD-10-CM - R05.2 Subacute cough.
FINDINGS: Lungs/Pleura: No focal opacities evident. No pleural effusion. No pneumothorax.
```

**Value for Research:** ⭐⭐⭐⭐ (High)  
Contains clinical context and findings.

### **3. ActiveProblems (All Documents)**
Contains:
- Problem list with dates
- Brief problem descriptions

**Example:**
```
Chronic cough 10/17/2025
Bronchial spasms 10/17/2025
Elevated glucose 02/21/2025
```

**Value for Research:** ⭐⭐⭐ (Medium)  
Structured but limited narrative context.

### **4. Medications (All Documents)**
Contains:
- Medication names with instructions
- Dosing information
- Start dates

**Example:**
```
albuterol 90 mcg/puff inhaler (Started 10/17/2025)
Inhale 2 puffs into the lungs every 4 hours as needed for Wheezing.
```

**Value for Research:** ⭐⭐⭐ (Medium)  
Useful for treatment context.

### **5. PlanOfTreatment (DOC0002)**
Contains:
- Future appointments
- Scheduled procedures
- Follow-up plans

**Example:**
```
01/08/2026 7:30 AM PST Appointment SWEDISH ISSAQUAH PULMONARY FUN.
01/08/2026 8:40 AM PST Office Visit SWEDISH PULMONARY ISSAQUAH
```

**Value for Research:** ⭐⭐ (Low-Medium)  
Shows care coordination but limited clinical narrative.

---

## Document Types Identified

Based on the sections present, the documents appear to be:

1. **DOC0001:** Patient Health Summary (comprehensive structured summary)
2. **DOC0002:** Patient Health Summary with Plan of Treatment
3. **DOC0003:** Office Visit Note with Progress Notes ⭐ **MOST VALUABLE**
4. **DOC0004-DOC0034:** Patient Health Summaries (structured data)

---

## Recommendations

### **For Current Documents:**

1. ✅ **Extract narrative text from ALL sections** - even structured sections have valuable narrative
2. ✅ **Prioritize ProgressNotes** - DOC0003 has the richest clinical narrative
3. ✅ **Extract Results narratives** - contain clinical history and findings
4. ✅ **Preserve medication instructions** - contain indication context

### **For Future Epic Exports:**

The fact that DOC0003 contains ProgressNotes suggests you CAN get clinical notes from Epic. To get more:

1. **Look for "Visit Notes" or "Office Visit Notes"** in Epic MyChart
2. **Export individual visit summaries** rather than just the health summary
3. **Check "After Visit Summary" (AVS)** - often contains visit discussion
4. **Look for specific visit dates** (e.g., 11/03/2025, 10/17/2025) and export those visits

### **Missing Context:**

Your specific cough history (Vancouver Marathon in May 2023, ongoing discussions) would likely be in:
- Progress Notes from visits in 2023-2024 (not in current export)
- Individual office visit notes (need to export separately)
- Consultation notes with specialists

---

## Next Steps (Step 3.6)

Now that we know narrative text exists and is valuable, we should:

1. Add `narrativeText` field to all concepts
2. Add `clinicalNotes` field specifically for ProgressNotes content
3. Extract narrative from:
   - ProgressNotes (full text)
   - Results (clinical history + findings)
   - Medications (instructions + indications)
   - ActiveProblems (problem descriptions)
   - All other sections (preserve context)

This will make concepts much more valuable for research and AI analysis.
