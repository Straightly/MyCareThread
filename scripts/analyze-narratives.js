const fs = require('fs');
const path = require('path');

// Configuration
const JSON_DIR = path.join(__dirname, '../../MyRecord20251209/json');

// Sections that typically contain rich narratives
const NARRATIVE_SECTIONS = {
  'ProgressNotes': '10164-2',
  'ReasonForVisit': '29299-5',
  'PlanOfTreatment': '18776-5',
  'Encounters': '46240-8',
  'Results': '30954-2',
  'Procedures': '47519-4'
};

function extractNarrativeText(textObj, maxLength = 500) {
  if (!textObj) return null;
  
  let narrative = '';
  
  function traverse(obj) {
    if (typeof obj === 'string') {
      narrative += obj + ' ';
    } else if (obj && typeof obj === 'object') {
      if (obj['#text']) {
        narrative += obj['#text'] + ' ';
      }
      if (obj.content) {
        if (Array.isArray(obj.content)) {
          obj.content.forEach(item => {
            if (typeof item === 'string') {
              narrative += item + ' ';
            } else if (item && item['#text']) {
              narrative += item['#text'] + ' ';
            }
          });
        }
      }
      for (const key in obj) {
        if (key !== '@_ID' && key !== '@_styleCode' && Array.isArray(obj[key])) {
          obj[key].forEach(item => traverse(item));
        } else if (key !== '@_ID' && key !== '@_styleCode' && typeof obj[key] === 'object') {
          traverse(obj[key]);
        }
      }
    }
  }
  
  traverse(textObj);
  
  // Clean up whitespace
  narrative = narrative.replace(/\s+/g, ' ').trim();
  
  if (narrative.length > maxLength) {
    return narrative.substring(0, maxLength) + '...';
  }
  
  return narrative || null;
}

function analyzeDocument(docId) {
  const filePath = path.join(JSON_DIR, `${docId}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  const analysis = {
    docId,
    title: data.title,
    effectiveTime: data.effectiveTime,
    sections: {},
    narrativeCount: 0,
    totalSections: 0
  };
  
  if (!data.sections) {
    return analysis;
  }
  
  for (const [sectionName, section] of Object.entries(data.sections)) {
    analysis.totalSections++;
    
    const narrative = extractNarrativeText(section.text);
    const hasEntries = !!section.entry;
    const entryCount = section.entry ? (Array.isArray(section.entry) ? section.entry.length : 1) : 0;
    
    analysis.sections[sectionName] = {
      hasNarrative: !!narrative,
      narrativeLength: narrative ? narrative.length : 0,
      narrativeSample: narrative,
      hasEntries,
      entryCount
    };
    
    if (narrative) {
      analysis.narrativeCount++;
    }
  }
  
  return analysis;
}

function main() {
  console.log('Analyzing narrative content in all clinical JSON documents...\n');
  console.log('='.repeat(80));
  
  const allAnalyses = [];
  const sectionSummary = {};
  
  // Analyze all documents
  for (let i = 1; i <= 34; i++) {
    const docId = `DOC${String(i).padStart(4, '0')}`;
    const analysis = analyzeDocument(docId);
    
    if (analysis) {
      allAnalyses.push(analysis);
      
      // Aggregate section statistics
      for (const [sectionName, sectionData] of Object.entries(analysis.sections)) {
        if (!sectionSummary[sectionName]) {
          sectionSummary[sectionName] = {
            count: 0,
            withNarrative: 0,
            withEntries: 0,
            totalNarrativeLength: 0
          };
        }
        sectionSummary[sectionName].count++;
        if (sectionData.hasNarrative) {
          sectionSummary[sectionName].withNarrative++;
          sectionSummary[sectionName].totalNarrativeLength += sectionData.narrativeLength;
        }
        if (sectionData.hasEntries) {
          sectionSummary[sectionName].withEntries++;
        }
      }
    }
  }
  
  // Print summary
  console.log('\n## SECTION SUMMARY');
  console.log('='.repeat(80));
  console.log('Section Name'.padEnd(25) + 'Count'.padEnd(10) + 'w/Narrative'.padEnd(15) + 'w/Entries'.padEnd(12) + 'Avg Length');
  console.log('-'.repeat(80));
  
  for (const [sectionName, stats] of Object.entries(sectionSummary).sort((a, b) => b[1].withNarrative - a[1].withNarrative)) {
    const avgLength = stats.withNarrative > 0 ? Math.round(stats.totalNarrativeLength / stats.withNarrative) : 0;
    console.log(
      sectionName.padEnd(25) +
      String(stats.count).padEnd(10) +
      String(stats.withNarrative).padEnd(15) +
      String(stats.withEntries).padEnd(12) +
      String(avgLength)
    );
  }
  
  // Find documents with richest narratives
  console.log('\n## DOCUMENTS WITH RICHEST NARRATIVES');
  console.log('='.repeat(80));
  
  const sortedByNarrative = allAnalyses
    .filter(a => a.narrativeCount > 0)
    .sort((a, b) => b.narrativeCount - a.narrativeCount)
    .slice(0, 10);
  
  for (const analysis of sortedByNarrative) {
    console.log(`\n${analysis.docId}: ${analysis.title}`);
    console.log(`  Sections with narrative: ${analysis.narrativeCount}/${analysis.totalSections}`);
    console.log(`  Sections: ${Object.keys(analysis.sections).join(', ')}`);
  }
  
  // Show sample narratives from different section types
  console.log('\n## SAMPLE NARRATIVES BY SECTION TYPE');
  console.log('='.repeat(80));
  
  for (const [sectionName, stats] of Object.entries(sectionSummary)) {
    if (stats.withNarrative > 0) {
      // Find first document with this section that has narrative
      const docWithNarrative = allAnalyses.find(a => 
        a.sections[sectionName] && a.sections[sectionName].hasNarrative
      );
      
      if (docWithNarrative) {
        console.log(`\n### ${sectionName} (${docWithNarrative.docId})`);
        console.log(docWithNarrative.sections[sectionName].narrativeSample);
      }
    }
  }
  
  // Check for missing narrative sections
  console.log('\n## MISSING NARRATIVE SECTIONS');
  console.log('='.repeat(80));
  
  const foundSections = new Set(Object.keys(sectionSummary));
  const missingSections = [];
  
  for (const [sectionName, loincCode] of Object.entries(NARRATIVE_SECTIONS)) {
    if (!foundSections.has(sectionName)) {
      missingSections.push(`${sectionName} (${loincCode})`);
    }
  }
  
  if (missingSections.length > 0) {
    console.log('The following narrative-rich sections are NOT present in any documents:');
    missingSections.forEach(s => console.log(`  - ${s}`));
    console.log('\nThese may require different document types from Epic MyChart.');
  } else {
    console.log('All expected narrative sections are present.');
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Analysis complete!');
}

main();
