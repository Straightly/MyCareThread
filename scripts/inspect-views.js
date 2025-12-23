const fs = require('fs');

function printSection(title, obj) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(obj, null, 2));
}

// Inspect Clinical JSON
try {
  const clinical = JSON.parse(fs.readFileSync('summary_clinical_limit.json', 'utf8'));
  console.log(`\n>>> Clinical JSON Summary (Count: ${clinical.count})`);
  
  if (clinical.documents && clinical.documents.length > 0) {
    const doc = clinical.documents[0]; // Look at the first document
    console.log(`\n[Document 1] ID: ${doc.id}, Title: ${doc.title}, Date: ${doc.effectiveTime}`);
    console.log(`Sections Found: ${Object.keys(doc.sections).join(', ')}`);
    
    // Show details of a few specific sections if they exist
    if (doc.sections.Allergies) {
      printSection('Example Section: Allergies', doc.sections.Allergies);
    }
    if (doc.sections.Medications) {
       // Truncate medications if too long for display
       const medSection = doc.sections.Medications;
       if (medSection.text && medSection.text.length > 200) {
           medSection.text = medSection.text.substring(0, 200) + "... (truncated)";
       }
       printSection('Example Section: Medications', medSection);
    }
  }
} catch (e) {
  console.error("Error reading clinical summary:", e.message);
}

// Inspect Threads JSON
try {
  const threads = JSON.parse(fs.readFileSync('threads_allergy.json', 'utf8'));
  console.log(`\n\n>>> Thread Extraction (Topic: "${threads.topic}", Count: ${threads.count})`);
  
  // Show the events list
  printSection('Thread Events', threads.events);

} catch (e) {
  console.error("Error reading threads:", e.message);
}
