const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const BASE_URL = 'https://mycarethread-backend.zhian-job.workers.dev';
const OUTPUT_DIR = path.join(__dirname, '../../MyRecord20251209/concepts');

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function downloadAllConcepts() {
  console.log('Fetching list of concepts:DOC* keys...');
  
  // Get list of all concepts keys
  const listUrl = `${BASE_URL}/debug/keys?prefix=concepts:DOC&limit=100`;
  const listResponse = await fetchJson(listUrl);
  const listData = JSON.parse(listResponse);
  
  console.log(`Found ${listData.count} concept documents to download.`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }
  
  // Download each concepts file
  for (const key of listData.keys) {
    const docId = key.replace('concepts:', ''); // e.g., DOC0001
    console.log(`Downloading ${docId}...`);
    
    try {
      const conceptsUrl = `${BASE_URL}/concepts/${docId}`;
      const conceptsData = await fetchJson(conceptsUrl);
      
      // Parse to pretty-print
      const concepts = JSON.parse(conceptsData);
      
      // Save to file with pretty formatting
      const outputPath = path.join(OUTPUT_DIR, `${docId}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(concepts, null, 2));
      console.log(`  -> Saved ${concepts.length} concepts to ${docId}.json`);
      
    } catch (err) {
      console.error(`  -> Failed to download ${docId}:`, err.message);
    }
  }
  
  console.log('\nDownload complete!');
  console.log(`Files saved to: ${OUTPUT_DIR}`);
}

downloadAllConcepts().catch(err => {
  console.error('Download failed:', err);
  process.exit(1);
});
