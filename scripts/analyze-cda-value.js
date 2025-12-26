const fs = require('fs');
const path = require('path');

// Configuration
const CONCEPTS_DIR = path.join(__dirname, '../../MyRecord20251209/concepts');
const JSON_DIR = path.join(__dirname, '../../MyRecord20251209/json');

// Analyze what we have in extracted concepts
function analyzeExtractedConcepts() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE CDA VALUE ANALYSIS');
  console.log('='.repeat(80));
  console.log('\n## PART 1: EXTRACTED CONCEPTS ANALYSIS\n');
  
  const files = fs.readdirSync(CONCEPTS_DIR).filter(f => f.endsWith('.json'));
  
  let totalConcepts = 0;
  const conceptTypes = {};
  const fieldsPresent = {
    narrativeText: 0,
    clinicalNotes: 0,
    codes: 0,
    dates: 0
  };
  
  const sampleNarratives = [];
  
  for (const file of files) {
    const filePath = path.join(CONCEPTS_DIR, file);
    const concepts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    totalConcepts += concepts.length;
    
    for (const concept of concepts) {
      // Count concept types
      conceptTypes[concept.conceptType] = (conceptTypes[concept.conceptType] || 0) + 1;
      
      // Check field presence
      if (concept.narrativeText) fieldsPresent.narrativeText++;
      if (concept.clinicalNotes) fieldsPresent.clinicalNotes++;
      if (concept.codes) fieldsPresent.codes++;
      if (concept.onsetDate || concept.startDate || concept.performedDate || concept.measuredDate) {
        fieldsPresent.dates++;
      }
      
      // Collect sample narratives
      if (concept.narrativeText && sampleNarratives.length < 3) {
        sampleNarratives.push({
          type: concept.conceptType,
          name: concept.name,
          narrative: concept.narrativeText.substring(0, 200) + '...'
        });
      }
    }
  }
  
  console.log(`Total Concepts Extracted: ${totalConcepts}`);
  console.log(`\nConcept Types:`);
  for (const [type, count] of Object.entries(conceptTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
  
  console.log(`\nField Coverage:`);
  console.log(`  narrativeText: ${fieldsPresent.narrativeText}/${totalConcepts} (${Math.round(fieldsPresent.narrativeText/totalConcepts*100)}%)`);
  console.log(`  codes: ${fieldsPresent.codes}/${totalConcepts} (${Math.round(fieldsPresent.codes/totalConcepts*100)}%)`);
  console.log(`  dates: ${fieldsPresent.dates}/${totalConcepts} (${Math.round(fieldsPresent.dates/totalConcepts*100)}%)`);
  
  console.log(`\nSample Narratives:`);
  for (const sample of sampleNarratives) {
    console.log(`\n  ${sample.type}: ${sample.name}`);
    console.log(`  "${sample.narrative}"`);
  }
}

// Analyze what sections exist but aren't extracted
function analyzeUnextractedSections() {
  console.log('\n\n## PART 2: UNEXTRACTED SECTIONS ANALYSIS\n');
  
  const allSections = {};
  const files = fs.readdirSync(JSON_DIR).filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const filePath = path.join(JSON_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (data.sections) {
      for (const sectionName of Object.keys(data.sections)) {
        allSections[sectionName] = (allSections[sectionName] || 0) + 1;
      }
    }
  }
  
  const extractedSections = ['ActiveProblems', 'ResolvedProblems', 'Medications', 'Prescriptions', 
                              'DischargeMeds', 'Allergies', 'Procedures'];
  const unextractedSections = [];
  
  console.log('Sections Present in CDA Documents:\n');
  for (const [section, count] of Object.entries(allSections).sort((a, b) => b[1] - a[1])) {
    const extracted = extractedSections.includes(section);
    const status = extracted ? '✓ EXTRACTED' : '✗ NOT EXTRACTED';
    console.log(`  ${section.padEnd(25)} ${String(count).padStart(3)} docs    ${status}`);
    
    if (!extracted) {
      unextractedSections.push({ section, count });
    }
  }
  
  return { allSections, unextractedSections };
}

// Analyze valuable health journey information
function analyzeHealthJourneyValue() {
  console.log('\n\n## PART 3: HEALTH JOURNEY VALUE ASSESSMENT\n');
  
  console.log('### Temporal Patterns:');
  console.log('  ✓ Problem onset dates captured');
  console.log('  ✓ Medication start dates captured');
  console.log('  ✗ Symptom progression over time - NOT CAPTURED');
  console.log('  ✗ Problem resolution dates - PARTIALLY CAPTURED (only in ResolvedProblems)');
  
  console.log('\n### Treatment Effectiveness:');
  console.log('  ✗ Medication effectiveness - NOT CAPTURED');
  console.log('  ✗ Side effects - NOT CAPTURED');
  console.log('  ✗ Dose adjustments over time - NOT CAPTURED');
  console.log('  ✗ Treatment adherence - NOT CAPTURED');
  
  console.log('\n### Provider Observations:');
  console.log('  ~ Clinical exam findings - IN NARRATIVE TEXT (not structured)');
  console.log('  ✗ Physical exam details - NOT EXTRACTED');
  console.log('  ✗ Assessment and plan - NOT EXTRACTED');
  
  console.log('\n### Patient-Reported Outcomes:');
  console.log('  ~ Patient complaints - IN NARRATIVE TEXT (ProgressNotes in DOC0003)');
  console.log('  ✗ Quality of life - NOT CAPTURED');
  console.log('  ✗ Functional status - NOT CAPTURED');
  console.log('  ✗ Symptom severity scales - NOT CAPTURED');
  
  console.log('\n### Care Coordination:');
  console.log('  ✗ Referrals - NOT EXTRACTED (may be in PlanOfTreatment)');
  console.log('  ✗ Follow-up appointments - NOT EXTRACTED (may be in PlanOfTreatment)');
  console.log('  ✗ Care team coordination - NOT EXTRACTED');
  
  console.log('\n### Social Determinants:');
  console.log('  ✗ Lifestyle factors - NOT CAPTURED');
  console.log('  ✗ Environmental exposures - NOT CAPTURED (mentioned in narrative: "sensitive to environmental changes")');
  console.log('  ✗ Occupation - NOT CAPTURED');
  console.log('  ✗ Exercise/activity - NOT CAPTURED (Vancouver Marathon mentioned in narrative)');
}

// Generate recommendations
function generateRecommendations(unextractedSections) {
  console.log('\n\n## PART 4: RECOMMENDATIONS\n');
  
  console.log('### HIGH PRIORITY - Implement Missing Extractors:\n');
  
  const highPriority = unextractedSections.filter(s => 
    ['VitalSigns', 'Results', 'Immunizations', 'Encounters'].includes(s.section)
  );
  
  for (const { section, count } of highPriority) {
    console.log(`  ${section} (${count} docs):`);
    switch(section) {
      case 'VitalSigns':
        console.log('    - Extract: type, value, unit, measuredDate');
        console.log('    - Value: Track health metrics over time (BP, weight, temp)');
        break;
      case 'Results':
        console.log('    - Extract: testName, value, unit, referenceRange, interpretation, resultDate');
        console.log('    - Value: Lab trends, diagnostic findings, clinical history in narratives');
        break;
      case 'Immunizations':
        console.log('    - Extract: vaccineName, administeredDate, manufacturer, lotNumber');
        console.log('    - Value: Vaccination history');
        break;
      case 'Encounters':
        console.log('    - Extract: encounterType, encounterDate, reasonForVisit, diagnoses, provider');
        console.log('    - Value: Visit timeline, care continuity');
        break;
    }
  }
  
  console.log('\n### MEDIUM PRIORITY - Enhance Existing Extractors:\n');
  console.log('  Problem:');
  console.log('    - Add: resolvedDate (from ResolvedProblems)');
  console.log('    - Add: severity (if documented)');
  console.log('    - Enhance: Extract clinical notes from ProgressNotes section');
  
  console.log('\n  Medication:');
  console.log('    - Add: endDate (discontinuation)');
  console.log('    - Add: indication (reason for medication)');
  console.log('    - Add: prescriber');
  
  console.log('\n### LOW PRIORITY - Additional Sections:\n');
  const lowPriority = unextractedSections.filter(s => 
    !['VitalSigns', 'Results', 'Immunizations', 'Encounters'].includes(s.section)
  );
  
  for (const { section, count } of lowPriority) {
    console.log(`  ${section} (${count} docs)`);
  }
  
  console.log('\n### NARRATIVE ENHANCEMENT:\n');
  console.log('  Current: narrativeText includes section-level narrative');
  console.log('  Recommendation: Add concept-specific narrative extraction');
  console.log('    - For Problems: Extract from ProgressNotes if available');
  console.log('    - For Results: Extract clinical history and findings separately');
  console.log('    - For Medications: Extract indication and instructions separately');
  
  console.log('\n### TEMPORAL ANALYSIS:\n');
  console.log('  Recommendation: Create timeline view across all concepts');
  console.log('    - Group by date');
  console.log('    - Show problem onset → medication start → results → resolution');
  console.log('    - Enable "health journey" queries');
}

// Main analysis
function main() {
  try {
    analyzeExtractedConcepts();
    const { allSections, unextractedSections } = analyzeUnextractedSections();
    analyzeHealthJourneyValue();
    generateRecommendations(unextractedSections);
    
    console.log('\n' + '='.repeat(80));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    console.log('\nNext Steps:');
    console.log('  1. Review recommendations above');
    console.log('  2. Prioritize which extractors to implement');
    console.log('  3. Proceed to Step 3.8 (Epic investigation) to identify missing documents');
    console.log('');
  } catch (err) {
    console.error('Analysis failed:', err);
    process.exit(1);
  }
}

main();
