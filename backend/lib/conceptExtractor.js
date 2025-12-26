/**
 * Clinical Concept Extractor
 * Extracts clean, AI-consumable concepts from CDA clinical JSON
 */

// LOINC code to concept type mapping
const SECTION_TO_CONCEPT = {
  "48765-2": "Allergy",
  "10160-0": "Medication",
  "66149-6": "Medication",
  "10183-2": "Medication",
  "11450-4": "Problem",
  "11348-0": "Problem",
  "11369-6": "Immunization",
  "8716-3": "VitalSign",
  "30954-2": "LabResult",
  "47519-4": "Procedure",
  "46240-8": "Encounter",
  "51848-0": "Encounter",
  "29299-5": "Encounter",
  "85847-2": "Encounter"
};

const SECTION_NAMES = {
  "Allergies": "Allergy",
  "Medications": "Medication",
  "Prescriptions": "Medication",
  "DischargeMeds": "Medication",
  "ActiveProblems": "Problem",
  "ResolvedProblems": "Problem",
  "Immunizations": "Immunization",
  "VitalSigns": "VitalSignSet",
  "Results": "LabPanel",
  "Procedures": "Procedure",
  "Encounters": "Encounter",
  "VisitDiagnoses": "Encounter",
  "ReasonForVisit": "Encounter",
  "CareTeams": "Encounter"
};

/**
 * Build a reference map from narrative text
 */
function buildReferenceMap(textObj) {
  const refMap = {};
  
  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;
    
    if (obj['@_ID'] && obj['#text']) {
      refMap[obj['@_ID']] = obj['#text'];
    }
    
    for (const key in obj) {
      if (Array.isArray(obj[key])) {
        obj[key].forEach(item => traverse(item));
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }
  
  traverse(textObj);
  return refMap;
}

/**
 * Resolve a reference like "#problem18name" to plain text
 */
function resolveReference(refValue, refMap) {
  if (!refValue || typeof refValue !== 'string') return null;
  const id = refValue.startsWith('#') ? refValue.substring(1) : refValue;
  return refMap[id] || null;
}

/**
 * Extract narrative text from section.text object
 * Converts HTML-like structures to plain text
 */
function extractNarrativeText(textObj, maxLength = 2000) {
  if (!textObj) return null;
  
  let narrative = '';
  
  function traverse(obj) {
    if (typeof obj === 'string') {
      narrative += obj + ' ';
    } else if (obj && typeof obj === 'object') {
      // Extract direct text
      if (obj['#text']) {
        narrative += obj['#text'] + ' ';
      }
      
      // Extract from content arrays
      if (obj.content) {
        if (Array.isArray(obj.content)) {
          obj.content.forEach(item => {
            if (typeof item === 'string') {
              narrative += item + ' ';
            } else if (item && item['#text']) {
              narrative += item['#text'] + ' ';
            } else if (item && typeof item === 'object') {
              traverse(item);
            }
          });
        } else {
          traverse(obj.content);
        }
      }
      
      // Traverse nested structures (but skip IDs and style codes)
      for (const key in obj) {
        if (key !== '@_ID' && key !== '@_styleCode' && key !== '@_class' && key !== 'content') {
          if (Array.isArray(obj[key])) {
            obj[key].forEach(item => traverse(item));
          } else if (typeof obj[key] === 'object') {
            traverse(obj[key]);
          }
        }
      }
    }
  }
  
  traverse(textObj);
  
  // Clean up whitespace and normalize
  narrative = narrative
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
  
  if (narrative.length > maxLength) {
    return narrative.substring(0, maxLength) + '...';
  }
  
  return narrative || null;
}

/**
 * Extract date from CDA effectiveTime structure
 */
function extractDate(effectiveTime) {
  if (!effectiveTime) return null;
  
  // Handle low/high structure
  if (effectiveTime.low && effectiveTime.low['@_value']) {
    return effectiveTime.low['@_value'];
  }
  
  // Handle direct value
  if (effectiveTime['@_value']) {
    return effectiveTime['@_value'];
  }
  
  return null;
}

/**
 * Extract primary code from a code object
 */
function extractCode(codeObj, codeSystem) {
  if (!codeObj) return null;
  
  // Check main code
  if (codeObj['@_codeSystem'] === codeSystem && codeObj['@_code']) {
    return codeObj['@_code'];
  }
  
  // Check translations
  if (codeObj.translation) {
    const translations = Array.isArray(codeObj.translation) ? codeObj.translation : [codeObj.translation];
    for (const trans of translations) {
      if (trans['@_codeSystem'] === codeSystem && trans['@_code']) {
        return trans['@_code'];
      }
    }
  }
  
  return null;
}

/**
 * Extract codes object with primary codes only
 */
function extractCodes(codeObj, valueObj) {
  const codes = {};
  
  // SNOMED CT: 2.16.840.1.113883.6.96
  const snomed = extractCode(codeObj, "2.16.840.1.113883.6.96") || 
                 extractCode(valueObj, "2.16.840.1.113883.6.96");
  if (snomed) codes.snomed = snomed;
  
  // ICD-10-CM: 2.16.840.1.113883.6.90
  const icd10 = extractCode(valueObj, "2.16.840.1.113883.6.90");
  if (icd10) codes.icd10 = icd10;
  
  // ICD-9-CM: 2.16.840.1.113883.6.103
  const icd9 = extractCode(valueObj, "2.16.840.1.113883.6.103");
  if (icd9) codes.icd9 = icd9;
  
  // RxNorm: 2.16.840.1.113883.6.88
  const rxnorm = extractCode(codeObj, "2.16.840.1.113883.6.88") ||
                 extractCode(valueObj, "2.16.840.1.113883.6.88");
  if (rxnorm) codes.rxnorm = rxnorm;
  
  // LOINC: 2.16.840.1.113883.6.1
  const loinc = extractCode(codeObj, "2.16.840.1.113883.6.1");
  if (loinc) codes.loinc = loinc;
  
  // CPT: 2.16.840.1.113883.6.12
  const cpt = extractCode(codeObj, "2.16.840.1.113883.6.12");
  if (cpt) codes.cpt = cpt;
  
  // CVX (vaccines): 2.16.840.1.113883.12.292
  const cvx = extractCode(codeObj, "2.16.840.1.113883.12.292");
  if (cvx) codes.cvx = cvx;
  
  return Object.keys(codes).length > 0 ? codes : null;
}

/**
 * Get display name from code or value object
 */
function getDisplayName(codeObj, valueObj, refMap) {
  // Try value translations first
  if (valueObj && valueObj.translation) {
    const translations = Array.isArray(valueObj.translation) ? valueObj.translation : [valueObj.translation];
    for (const trans of translations) {
      if (trans['@_displayName']) {
        return trans['@_displayName'];
      }
    }
  }
  
  // Try value displayName
  if (valueObj && valueObj['@_displayName']) {
    return valueObj['@_displayName'];
  }
  
  // Try code displayName
  if (codeObj && codeObj['@_displayName']) {
    return codeObj['@_displayName'];
  }
  
  // Try resolving reference
  if (valueObj && valueObj.originalText && valueObj.originalText.reference) {
    const refValue = valueObj.originalText.reference['@_value'];
    const resolved = resolveReference(refValue, refMap);
    if (resolved) return resolved;
  }
  
  return null;
}

/**
 * Extract clean text from a field that may be a string, object with #text, or object with reference
 * Returns only the human-readable text, removing CDA reference artifacts
 */
function extractCleanText(field, refMap) {
  if (!field) return null;
  
  // If it's already a plain string, return it
  if (typeof field === 'string') return field;
  
  // If it's an object with #text property, return that
  if (field['#text']) return field['#text'];
  
  // If it has a displayName attribute, use that
  if (field['@_displayName']) return field['@_displayName'];
  
  // If it's an object with originalText string, return that
  if (field.originalText && typeof field.originalText === 'string') {
    return field.originalText;
  }
  
  // If it's an object with originalText.#text, return that
  if (field.originalText && field.originalText['#text']) {
    return field.originalText['#text'];
  }
  
  // If it's an object with originalText.reference, resolve it
  if (field.originalText && field.originalText.reference && refMap) {
    const refValue = field.originalText.reference['@_value'];
    const resolved = resolveReference(refValue, refMap);
    if (resolved) return resolved;
  }
  
  return null;
}

/**
 * Extract Problem concept
 */
function extractProblem(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const act = entry.act;
  if (!act || !act.entryRelationship) return null;
  
  const observation = act.entryRelationship.observation;
  if (!observation) return null;
  
  const name = getDisplayName(observation.code, observation.value, refMap);
  if (!name) return null;
  
  const onsetDate = extractDate(observation.effectiveTime);
  if (!onsetDate) return null;
  
  // Extract status from nested entryRelationship
  let status = "Active";
  if (observation.entryRelationship && observation.entryRelationship.observation) {
    const statusObs = observation.entryRelationship.observation;
    if (statusObs.value && statusObs.value['@_displayName']) {
      status = statusObs.value['@_displayName'];
    }
  }
  
  const codes = extractCodes(observation.code, observation.value);
  
  const conceptId = observation.id && observation.id['@_extension'] 
    ? `prob_${observation.id['@_extension']}` 
    : `prob_${Date.now()}`;
  
  const concept = {
    conceptType: "Problem",
    conceptId,
    name,
    onsetDate,
    status,
    codes,
    sourceDocId,
    sourceSection
  };
  
  // Add narrative text if available
  if (sectionNarrative) {
    concept.narrativeText = sectionNarrative;
  }
  
  return concept;
}

/**
 * Extract Medication concept
 */
function extractMedication(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const substanceAdmin = entry.substanceAdministration;
  if (!substanceAdmin) return null;
  
  const consumable = substanceAdmin.consumable;
  if (!consumable || !consumable.manufacturedProduct) return null;
  
  const manufacturedMaterial = consumable.manufacturedProduct.manufacturedMaterial;
  if (!manufacturedMaterial) return null;
  
  const drugName = getDisplayName(manufacturedMaterial.code, null, refMap);
  if (!drugName) return null;
  
  // Extract dosage info
  let dose = null;
  let route = null;
  let frequency = null;
  
  if (substanceAdmin.doseQuantity && substanceAdmin.doseQuantity['@_value']) {
    dose = `${substanceAdmin.doseQuantity['@_value']} ${substanceAdmin.doseQuantity['@_unit'] || ''}`.trim();
  }
  
  if (substanceAdmin.routeCode && substanceAdmin.routeCode['@_displayName']) {
    route = substanceAdmin.routeCode['@_displayName'];
  }
  
  if (substanceAdmin.effectiveTime) {
    const effTimes = Array.isArray(substanceAdmin.effectiveTime) 
      ? substanceAdmin.effectiveTime 
      : [substanceAdmin.effectiveTime];
    
    for (const et of effTimes) {
      if (et['@_institutionSpecified'] === 'true' && et['@_operator'] === 'A') {
        if (et.period && et.period['@_value'] && et.period['@_unit']) {
          frequency = `Every ${et.period['@_value']} ${et.period['@_unit']}`;
        }
      }
    }
  }
  
  const startDate = extractDate(substanceAdmin.effectiveTime);
  const status = substanceAdmin.statusCode && substanceAdmin.statusCode['@_code'] === 'active' 
    ? "Active" 
    : "Completed";
  
  const codes = extractCodes(manufacturedMaterial.code, null);
  
  const conceptId = substanceAdmin.id && substanceAdmin.id['@_extension']
    ? `med_${substanceAdmin.id['@_extension']}`
    : `med_${Date.now()}`;
  
  const concept = {
    conceptType: "Medication",
    conceptId,
    drugName,
    status,
    sourceDocId,
    sourceSection
  };
  
  if (dose) concept.dose = dose;
  if (route) concept.route = route;
  if (frequency) concept.frequency = frequency;
  if (startDate) concept.startDate = startDate;
  if (codes) concept.codes = codes;
  if (sectionNarrative) concept.narrativeText = sectionNarrative;
  
  return concept;
}

/**
 * Extract Allergy concept
 */
function extractAllergy(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const act = entry.act;
  if (!act || !act.entryRelationship) return null;
  
  const observation = act.entryRelationship.observation;
  if (!observation || !observation.participant) return null;
  
  const participant = observation.participant;
  const participantRole = participant.participantRole;
  if (!participantRole || !participantRole.playingEntity) return null;
  
  const allergen = getDisplayName(participantRole.playingEntity.code, null, refMap);
  if (!allergen) return null;
  
  // Extract reaction
  let reaction = null;
  let severity = null;
  
  if (observation.entryRelationship) {
    const relationships = Array.isArray(observation.entryRelationship)
      ? observation.entryRelationship
      : [observation.entryRelationship];
    
    for (const rel of relationships) {
      if (rel.observation) {
        const relObs = rel.observation;
        
        // Check for reaction
        if (relObs.value && relObs.value['@_displayName']) {
          if (relObs.code && relObs.code['@_code'] === 'ASSERTION') {
            reaction = relObs.value['@_displayName'];
          }
        }
        
        // Check for severity
        if (relObs.value && relObs.value['@_displayName']) {
          if (relObs.code && relObs.code['@_displayName'] && 
              relObs.code['@_displayName'].toLowerCase().includes('severity')) {
            severity = relObs.value['@_displayName'];
          }
        }
      }
    }
  }
  
  const onsetDate = extractDate(observation.effectiveTime);
  const status = "Active";
  
  const codes = extractCodes(participantRole.playingEntity.code, null);
  
  const conceptId = observation.id && observation.id['@_extension']
    ? `allergy_${observation.id['@_extension']}`
    : `allergy_${Date.now()}`;
  
  const concept = {
    conceptType: "Allergy",
    conceptId,
    allergen,
    status,
    sourceDocId,
    sourceSection
  };
  
  if (reaction) concept.reaction = reaction;
  if (severity) concept.severity = severity;
  if (onsetDate) concept.onsetDate = onsetDate;
  if (codes) concept.codes = codes;
  if (sectionNarrative) concept.narrativeText = sectionNarrative;
  
  return concept;
}

/**
 * Extract Procedure concept
 */
function extractProcedure(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const procedure = entry.procedure;
  if (!procedure) return null;
  
  const procedureName = getDisplayName(procedure.code, null, refMap);
  if (!procedureName) return null;
  
  const performedDate = extractDate(procedure.effectiveTime);
  if (!performedDate) return null;
  
  const status = procedure.statusCode && procedure.statusCode['@_code'] === 'completed'
    ? "Completed"
    : "Scheduled";
  
  const codes = extractCodes(procedure.code, null);
  
  const conceptId = procedure.id && procedure.id['@_extension']
    ? `proc_${procedure.id['@_extension']}`
    : `proc_${Date.now()}`;
  
  const concept = {
    conceptType: "Procedure",
    conceptId,
    procedureName,
    performedDate,
    status,
    codes,
    sourceDocId,
    sourceSection
  };
  
  if (sectionNarrative) concept.narrativeText = sectionNarrative;
  
  return concept;
}

/**
 * Extract VitalSignSet concept (grouped vital signs from organizer)
 */
function extractVitalSign(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const organizer = entry.organizer;
  if (!organizer) return null;
  
  // Get the organizer-level date (when all vitals were taken together)
  const measuredDate = extractDate(organizer.effectiveTime);
  if (!measuredDate) return null;
  
  // Get organizer ID for concept ID
  const conceptId = organizer.id && organizer.id['@_extension']
    ? `vital_${organizer.id['@_extension']}`
    : `vital_${Date.now()}`;
  
  const readings = [];
  
  // VitalSigns are in organizer.component (can be single or array)
  const components = Array.isArray(organizer.component) 
    ? organizer.component 
    : [organizer.component];
  
  for (const component of components) {
    const observation = component.observation;
    if (!observation) continue;
    
    const vitalType = extractCleanText(observation.code, refMap);
    if (!vitalType) continue;
    
    const value = observation.value && observation.value['@_value'] 
      ? observation.value['@_value'] 
      : null;
    if (!value) continue;
    
    const unit = observation.value && observation.value['@_unit'] 
      ? observation.value['@_unit'] 
      : null;
    
    const loincCode = observation.code && observation.code['@_code'] 
      ? observation.code['@_code'] 
      : null;
    
    const reading = {
      vitalType,
      value,
      unit
    };
    
    if (loincCode) reading.loinc = loincCode;
    
    readings.push(reading);
  }
  
  // Only return if we have at least one reading
  if (readings.length === 0) return null;
  
  const concept = {
    conceptType: "VitalSignSet",
    conceptId,
    measuredDate,
    readings,
    sourceDocId,
    sourceSection
  };
  
  return concept;
}

/**
 * Extract LabPanel concept (grouped lab results from organizer)
 */
function extractLabResult(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const organizer = entry.organizer;
  if (!organizer) return null;
  
  // Get panel name from organizer code
  const panelName = extractCleanText(organizer.code, refMap) || "Lab Panel";
  
  // Get the organizer-level date (when results were finalized)
  const resultDate = extractDate(organizer.effectiveTime);
  if (!resultDate) return null;
  
  // Get status from organizer
  const status = organizer.statusCode && organizer.statusCode['@_code'] === 'completed'
    ? "Final"
    : "Preliminary";
  
  // Get organizer ID for concept ID
  const conceptId = organizer.id && organizer.id['@_extension']
    ? `lab_${organizer.id['@_extension']}`
    : `lab_${Date.now()}`;
  
  const results = [];
  
  // Lab results are in organizer.component (can be single or array)
  const components = Array.isArray(organizer.component)
    ? organizer.component
    : [organizer.component];
  
  for (const component of components) {
    const observation = component.observation;
    if (!observation) continue;
    
    const testName = extractCleanText(observation.code, refMap);
    if (!testName) continue;
    
    const value = observation.value && observation.value['@_value']
      ? observation.value['@_value']
      : null;
    
    const unit = observation.value && observation.value['@_unit']
      ? observation.value['@_unit']
      : null;
    
    // Extract reference range
    let referenceRange = null;
    if (observation.referenceRange && observation.referenceRange.observationRange) {
      const range = observation.referenceRange.observationRange.value;
      if (range && range.low && range.high) {
        referenceRange = `${range.low['@_value']}-${range.high['@_value']} ${range.low['@_unit'] || ''}`.trim();
      }
    }
    
    // Extract interpretation
    let interpretation = null;
    if (observation.interpretationCode && observation.interpretationCode['@_displayName']) {
      interpretation = observation.interpretationCode['@_displayName'];
    }
    
    const loincCode = observation.code && observation.code['@_code']
      ? observation.code['@_code']
      : null;
    
    const result = {
      testName,
      value,
      unit,
      referenceRange,
      interpretation
    };
    
    if (loincCode) result.loinc = loincCode;
    
    results.push(result);
  }
  
  // Only return if we have at least one result
  if (results.length === 0) return null;
  
  const concept = {
    conceptType: "LabPanel",
    conceptId,
    panelName,
    resultDate,
    status,
    results,
    sourceDocId,
    sourceSection
  };
  
  return concept;
}

/**
 * Extract Immunization concept
 */
function extractImmunization(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const substanceAdmin = entry.substanceAdministration;
  if (!substanceAdmin) return null;
  
  const consumable = substanceAdmin.consumable;
  if (!consumable || !consumable.manufacturedProduct) return null;
  
  const manufacturedMaterial = consumable.manufacturedProduct.manufacturedMaterial;
  if (!manufacturedMaterial) return null;
  
  const vaccineName = extractCleanText(manufacturedMaterial.code, refMap);
  
  if (!vaccineName) return null;
  
  const administeredDate = extractDate(substanceAdmin.effectiveTime);
  if (!administeredDate) return null;
  
  const manufacturer = consumable.manufacturedProduct.manufacturerOrganization
    && consumable.manufacturedProduct.manufacturerOrganization.name
    ? consumable.manufacturedProduct.manufacturerOrganization.name
    : null;
  
  const lotNumber = manufacturedMaterial.lotNumberText
    ? manufacturedMaterial.lotNumberText
    : null;
  
  const cvxCode = manufacturedMaterial.code && manufacturedMaterial.code['@_code']
    ? manufacturedMaterial.code['@_code']
    : null;
  
  const conceptId = substanceAdmin.id && substanceAdmin.id['@_extension']
    ? `imm_${substanceAdmin.id['@_extension']}`
    : `imm_${Date.now()}`;
  
  const concept = {
    conceptType: "Immunization",
    conceptId,
    vaccineName,
    administeredDate,
    sourceDocId,
    sourceSection
  };
  
  if (manufacturer) concept.manufacturer = manufacturer;
  if (lotNumber) concept.lotNumber = lotNumber;
  if (cvxCode) concept.codes = { cvx: cvxCode };
  if (sectionNarrative) concept.narrativeText = sectionNarrative;
  
  return concept;
}

/**
 * Extract Encounter concept
 */
function extractEncounter(entry, refMap, sourceDocId, sourceSection, sectionNarrative) {
  const encounter = entry.encounter;
  if (!encounter) return null;
  
  const encounterType = extractCleanText(encounter.code, refMap);
  
  const encounterDate = extractDate(encounter.effectiveTime);
  if (!encounterDate) return null;
  
  // Extract reason for visit from entryRelationship
  let reasonForVisit = null;
  if (encounter.entryRelationship && encounter.entryRelationship.observation) {
    const obs = encounter.entryRelationship.observation;
    if (obs.value && obs.value['@_displayName']) {
      reasonForVisit = obs.value['@_displayName'];
    }
  }
  
  // Extract provider
  let provider = null;
  if (encounter.performer && encounter.performer.assignedEntity) {
    const assignedPerson = encounter.performer.assignedEntity.assignedPerson;
    if (assignedPerson && assignedPerson.name) {
      const name = assignedPerson.name;
      provider = `${name.given || ''} ${name.family || ''}`.trim();
    }
  }
  
  const cptCode = encounter.code && encounter.code['@_code']
    ? encounter.code['@_code']
    : null;
  
  const conceptId = encounter.id && encounter.id['@_extension']
    ? `enc_${encounter.id['@_extension']}`
    : `enc_${Date.now()}`;
  
  const concept = {
    conceptType: "Encounter",
    conceptId,
    encounterDate,
    sourceDocId,
    sourceSection
  };
  
  if (encounterType) concept.encounterType = encounterType;
  if (reasonForVisit) concept.reasonForVisit = reasonForVisit;
  if (provider) concept.provider = provider;
  if (cptCode) concept.codes = { cpt: cptCode };
  if (sectionNarrative) concept.narrativeText = sectionNarrative;
  
  return concept;
}

/**
 * Extract Section concept (section-level metadata and narrative)
 */
function extractSection(sectionName, section, sourceDocId, entryCount) {
  const conceptId = `section_${sourceDocId.replace('cda:', '')}_${sectionName}`;
  
  const title = section.title || sectionName;
  const narrativeText = extractNarrativeText(section.text);
  
  const concept = {
    conceptType: "Section",
    conceptId,
    sectionName,
    title,
    narrativeText,
    entryCount,
    sourceDocId
  };
  
  return concept;
}

/**
 * Extract all concepts from a clinical JSON document
 */
export function extractConcepts(clinicalJson) {
  const concepts = [];
  const sourceDocId = clinicalJson.id;
  
  if (!clinicalJson.sections) return concepts;
  
  for (const [sectionName, section] of Object.entries(clinicalJson.sections)) {
    const conceptType = SECTION_NAMES[sectionName];
    if (!conceptType) continue;
    
    // Build reference map from narrative text
    const refMap = buildReferenceMap(section.text);
    
    // Extract narrative text from section
    const sectionNarrative = extractNarrativeText(section.text);
    
    // Process entries
    if (!section.entry) continue;
    
    const entries = Array.isArray(section.entry) ? section.entry : [section.entry];
    
    // Create Section concept to capture section-level metadata and narrative
    const sectionConcept = extractSection(sectionName, section, sourceDocId, entries.length);
    if (sectionConcept) {
      concepts.push(sectionConcept);
    }
    
    for (const entry of entries) {
      let concept = null;
      
      try {
        switch (conceptType) {
          case "Problem":
            concept = extractProblem(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          case "Medication":
            concept = extractMedication(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          case "Allergy":
            concept = extractAllergy(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          case "Procedure":
            concept = extractProcedure(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          case "VitalSignSet":
            concept = extractVitalSign(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          case "LabPanel":
            concept = extractLabResult(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          case "Immunization":
            concept = extractImmunization(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          case "Encounter":
            concept = extractEncounter(entry, refMap, sourceDocId, sectionName, sectionNarrative);
            break;
          default:
            // Skip unknown concept types
            break;
        }
        
        // Add concept if extraction succeeded
        if (concept) {
          concepts.push(concept);
        }
      } catch (err) {
        console.error(`Error extracting ${conceptType} from ${sectionName}:`, err);
      }
    }
  }
  
  return concepts;
}
