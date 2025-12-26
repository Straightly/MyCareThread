const https = require('https');

// Configuration
const BASE_URL = 'https://mycarethread-backend.zhian-job.workers.dev';

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Import the concept extractor (we'll need to make it work in Node.js)
// For now, we'll call a backend endpoint to do the extraction

async function extractConceptsForDoc(docId) {
  try {
    // Fetch the clinical JSON
    const jsonUrl = `${BASE_URL}/json/${docId}`;
    const clinicalJson = await fetchJson(jsonUrl);
    
    // Call backend to extract concepts (we'll add this endpoint)
    const extractUrl = `${BASE_URL}/extract-concepts?docId=${docId}`;
    const result = await postJson(extractUrl, JSON.stringify(clinicalJson));
    
    return result;
  } catch (err) {
    throw new Error(`Failed to extract concepts for ${docId}: ${err.message}`);
  }
}

async function extractAllConcepts() {
  console.log('Fetching list of clinical JSON documents...');
  
  // Get list of all json:DOC* keys
  const listUrl = `${BASE_URL}/debug/keys?prefix=json:DOC&limit=100`;
  const listData = await fetchJson(listUrl);
  
  console.log(`Found ${listData.count} documents to process.\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const key of listData.keys) {
    const docId = key.replace('json:', '');
    
    try {
      console.log(`Processing ${docId}...`);
      const result = await extractConceptsForDoc(docId);
      
      console.log(`  ✓ Extracted ${result.conceptCount} concepts`);
      console.log(`    - ${result.conceptTypes.join(', ')}`);
      successCount++;
      
    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Extraction complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log('='.repeat(60));
}

extractAllConcepts().catch(err => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
