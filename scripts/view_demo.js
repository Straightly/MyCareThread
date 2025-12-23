const fs = require('fs');

// 1. Load Clinical JSON
const clinicalPath = 'summary_clinical_limit.json';
if (fs.existsSync(clinicalPath)) {
  const clinical = JSON.parse(fs.readFileSync(clinicalPath, 'utf8'));
  console.log(`\n### View 1.7: Clinical JSON (Consolidated by Document & Section)`);
  console.log(`Total Documents: ${clinical.count}`);
  
  // Find a doc with medications
  const docWithMeds = clinical.documents.find(d => d.sections && d.sections.Medications);
  
  if (docWithMeds) {
    console.log(`\n--- Example Document: ${docWithMeds.title} (${docWithMeds.id}) ---`);
    const medSection = docWithMeds.sections.Medications;
    
    // Show Narrative Text (cleaned up)
    if (medSection.text) {
        console.log(`\n[Narrative Text Preview]:`);
        // Often text is complex object, try to stringify or grab #text
        console.log(JSON.stringify(medSection.text).substring(0, 150) + "...");
    }

    // Show Structured Entries (The "Vibe" friendly data)
    if (medSection.entry) {
        console.log(`\n[Structured Data Entry Example]:`);
        const entries = Array.isArray(medSection.entry) ? medSection.entry : [medSection.entry];
        // Pick one entry to show structure
        const exampleEntry = entries[0];
        console.log(JSON.stringify(exampleEntry, null, 2));
    }
  } else {
      console.log("No document with Medications section found in the sample.");
  }
} else {
    console.log(`File ${clinicalPath} not found. Run /build/clinical-json first.`);
}

// 2. Load Thread JSON
const threadPath = 'threads_allergy.json';
if (fs.existsSync(threadPath)) {
    const thread = JSON.parse(fs.readFileSync(threadPath, 'utf8'));
    console.log(`\n\n### View 1.8: Thread Extraction (Topic: "${thread.topic}")`);
    console.log(`Found ${thread.count} events across all documents.`);
    console.log(`\n[Event List - Chronological]:`);
    console.table(thread.events);
} else {
    console.log(`File ${threadPath} not found. Run /threads?topic=... first.`);
}
