const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const BASE_URL = 'https://mycarethread-backend.zhian-job.workers.dev';
const OUTPUT_DIR = path.join(__dirname, '../../MyRecord20251209/json');

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

async function downloadAllJson() {
  console.log('Fetching list of json:DOC* keys...');
  
  // Get list of all json keys
  const listUrl = `${BASE_URL}/debug/keys?prefix=json:DOC&limit=100`;
  const listResponse = await fetchJson(listUrl);
  const listData = JSON.parse(listResponse);
  
  console.log(`Found ${listData.count} JSON documents to download.`);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUTPUT_DIR}`);
  }
  
  // Download each JSON file
  for (const key of listData.keys) {
    const docId = key.replace('json:', ''); // e.g., DOC0001
    console.log(`Downloading ${docId}...`);
    
    try {
      // Fetch the JSON from KV via a GET endpoint
      // We'll need to add an endpoint to retrieve individual json:DOC* files
      // For now, we'll use the KV list to get the value directly
      // Actually, we need to create a simple GET endpoint
      
      // Let's use a workaround: fetch via direct KV access endpoint
      const jsonUrl = `${BASE_URL}/json/${docId}`;
      const jsonData = await fetchJson(jsonUrl);
      
      // Save to file
      const outputPath = path.join(OUTPUT_DIR, `${docId}.json`);
      fs.writeFileSync(outputPath, jsonData);
      console.log(`  -> Saved to ${docId}.json`);
      
    } catch (err) {
      console.error(`  -> Failed to download ${docId}:`, err.message);
    }
  }
  
  console.log('\nDownload complete!');
  console.log(`Files saved to: ${OUTPUT_DIR}`);
}

downloadAllJson().catch(err => {
  console.error('Download failed:', err);
  process.exit(1);
});
