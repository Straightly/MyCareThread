const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const BASE_URL = 'https://mycarethread-backend.zhian-job.workers.dev';
const SOURCE_DIR = path.join(__dirname, '../../MyRecord20251209/IHE_XDM/Zhi1');

async function postData(endpoint, body, queryParams = {}) {
  const url = new URL(endpoint, BASE_URL);
  Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]));

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Sending raw XML text
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
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

async function ingest() {
  console.log(`Scanning source directory: ${SOURCE_DIR}`);
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('Source directory not found!');
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_DIR);

  // 1. Ingest Metadata
  const metadataFile = files.find(f => f.toUpperCase() === 'METADATA.XML');
  if (metadataFile) {
    console.log(`Found Metadata: ${metadataFile}. Uploading...`);
    try {
      const content = fs.readFileSync(path.join(SOURCE_DIR, metadataFile));
      const res = await postData('/import/metadata', content);
      console.log('Metadata uploaded successfully:', res);
    } catch (err) {
      console.error('Failed to upload metadata:', err.message);
    }
  } else {
    console.warn('METADATA.XML not found.');
  }

  // 2. Ingest Documents
  const docFiles = files.filter(f => f.toUpperCase().startsWith('DOC') && f.toUpperCase().endsWith('.XML'));
  console.log(`Found ${docFiles.length} CDA documents.`);

  for (const docFile of docFiles) {
    console.log(`Uploading ${docFile}...`);
    try {
      const content = fs.readFileSync(path.join(SOURCE_DIR, docFile));
      // docId is the filename without extension, e.g. DOC0001
      const docId = path.parse(docFile).name; 
      const res = await postData('/import/cda', content, { docId });
      console.log(`  -> Success: ${res}`);
    } catch (err) {
      console.error(`  -> Failed to upload ${docFile}:`, err.message);
    }
  }
  
  console.log('Ingestion complete.');
}

ingest();
