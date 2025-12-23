const fs = require('fs');

const data = JSON.parse(fs.readFileSync('summary_full_limit.json', 'utf8'));

// Helper to find sections in a doc
function analyzeDoc(doc, index) {
  console.log(`\n--- Document ${index + 1} (${doc.id}) ---`);
  const cda = doc.data?.ClinicalDocument;
  if (!cda) {
    console.log('No ClinicalDocument found');
    return;
  }

  const structuredBody = cda.component?.structuredBody;
  if (!structuredBody) {
    console.log('No structuredBody found');
    return;
  }

  const components = structuredBody.component;
  if (!components) {
    console.log('No components in body');
    return;
  }

  // fast-xml-parser might return an array or single object
  const sections = Array.isArray(components) ? components : [components];

  console.log(`Found ${sections.length} top-level components`);

  sections.forEach((comp, i) => {
    const section = comp.section;
    if (!section) return;

    const title = section.title;
    const code = section.code?.['@_code'];
    const codeSystem = section.code?.['@_displayName'];
    
    console.log(`  Section ${i}: [${code}] ${title} (${codeSystem || ''})`);
    
    // Check for specific interesting sections to see structure
    if (code === '10160-0') { // Meds
         // console.log('    Meds entries:', JSON.stringify(section.entry, null, 2).substring(0, 200) + '...');
    }
  });
}

data.documents.forEach((doc, i) => analyzeDoc(doc, i));
