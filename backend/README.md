# MyCareThread Backend

##Epic sandbox key
YObz1GPouH1UxySv5Rs7pECqxeIWiClm6K+hfaU7LLahDTnZBQ/uAhYgJWREJuKuY20EYpVAw2Qkv3Wlz/My/A==


Minimal Cloudflare Worker backend for MyCareThread.

## Prerequisites

- Node.js and npm installed (for Wrangler).
- Cloudflare account.
- Wrangler CLI installed and logged in:
  - `npm install -g wrangler`
  - `wrangler login`

## Local Development

From this `backend/` directory:

```bash
wrangler dev
```

Wrangler will print a local URL, typically:

```text
http://127.0.0.1:8787
```

### Check that the backend is alive

```bash
curl http://127.0.0.1:8787/
```

You should see JSON like:

```json
{
  "service": "MyCareThread backend",
  "status": "alive",
  "timestamp": "..."
}
```

### Test KV locally with `/kv-test`

1. **Write a value to KV**

   ```bash
   curl -X POST http://127.0.0.1:8787/kv-test
   ```

   Expected response:

   ```json
   {
     "ok": true,
     "action": "write",
     "key": "test:message",
     "value": "Hello from KV at ..."
   }
   ```

2. **Read the value from KV**

   ```bash
   curl http://127.0.0.1:8787/kv-test
   ```

   Expected response:

   ```json
   {
     "ok": true,
     "action": "read",
     "key": "test:message",
     "value": "Hello from KV at ...",
     "message": "found"
   }
   ```

If `value` is non-null and `message` is `"found"`, KV is working in the local dev environment.

## Deploy to Cloudflare

From this `backend/` directory:

```bash
wrangler deploy
```

Wrangler will print the production URL. For this project it is:

```text
https://mycarethread-backend.zhian-job.workers.dev
```

### Check that the deployed backend is alive

```bash
curl https://mycarethread-backend.zhian-job.workers.dev/
```

You should see the same JSON structure as in local dev, with a `status` of `"alive"`.

### Test KV in production with `/kv-test`

1. **Write a value to KV**

   ```bash
   curl -X POST https://mycarethread-backend.zhian-job.workers.dev/kv-test
   ```

   Expected response is similar to local dev, with `action: "write"` and a non-empty `value`.

2. **Read the value from KV**

   ```bash
   curl https://mycarethread-backend.zhian-job.workers.dev/kv-test
   ```

   Expected response:

   ```json
   {
     "ok": true,
     "action": "read",
     "key": "test:message",
     "value": "Hello from KV at ...",
     "message": "found"
   }
   ```

If this read-after-write works in production, KV is correctly configured and persisted in Cloudflare.

## API Endpoints

### Base URL
```
Production: https://mycarethread-backend.zhian-job.workers.dev
Local Dev:  http://127.0.0.1:8787
```

### Health Check
```bash
# Production
curl https://mycarethread-backend.zhian-job.workers.dev/

# Local
curl http://127.0.0.1:8787/
```

### Aetna Patient Access API

#### 1. Authentication Status
```bash
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-status
```

#### 2. OAuth Callback (Aetna Portal Configuration)
**Callback URL for Aetna Developer Portal:**
```
https://mycarethread-backend.zhian-job.workers.dev/aetna-callback
```

#### 3. Patient Data Fetch
```bash
# Get all medications
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=MedicationRequest

# Get all conditions
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=Condition

# Get all claims
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=ExplanationOfBenefit

# Get specific resource by ID
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=Patient&id=12345
```

#### 4. OAuth Initiation (Optional)
```bash
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-auth
```

### Epic SMART on FHIR

#### 1. Launch Endpoint
```bash
curl "https://mycarethread-backend.zhian-job.workers.dev/launch?launch=xyz&iss=https://epic.example.com"
```

#### 2. OAuth Callback (Epic Configuration)
**Callback URL for Epic Configuration:**
```
https://mycarethread-backend.zhian-job.workers.dev/callback
```

### Data Import & Processing

#### 1. Import Metadata
```bash
curl -X POST https://mycarethread-backend.zhian-job.workers.dev/import/metadata \
  -H "Content-Type: application/json" \
  -d '{"source":"epic","patientId":"12345"}'
```

#### 2. Import CDA Document
```bash
curl -X POST https://mycarethread-backend.zhian-job.workers.dev/import/cda \
  -H "Content-Type: application/xml" \
  --data-binary @cda_document.xml
```

#### 3. Build Full JSON
```bash
curl https://mycarethread-backend.zhian-job.workers.dev/build/full-json
```

#### 4. Build Clinical JSON
```bash
curl https://mycarethread-backend.zhian-job.workers.dev/build/clinical-json
```

## Environment Variables

### Required Secrets
Set these in Cloudflare Dashboard or via Wrangler CLI:
```bash
# Aetna Integration
wrangler secret put AETNA_APP_NAME
wrangler secret put AETNA_CLIENT_ID
wrangler secret put AETNA_CLIENT_SECRET

# Epic Integration (if using)
wrangler secret put SMART_CLIENT_ID
wrangler secret put SMART_CLIENT_SECRET
```

### KV Namespace
```bash
# Create KV namespace
wrangler kv:namespace create "MYCARETHREAD_KV"

# Add binding to wrangler.toml
[[kv_namespaces]]
binding = "MYCARETHREAD_KV"
id = "<your-kv-namespace-id>"
```

## Testing Aetna Integration

### 1. Configure Aetna Developer Portal
1. Go to https://developerportal.aetna.com
2. Navigate to your app configuration
3. Set callback URL: `https://mycarethread-backend.zhian-job.workers.dev/aetna-callback`
4. Save configuration

### 2. Complete OAuth Flow
1. Visit Aetna's authorization URL
2. Login and authorize your app
3. You'll be redirected to your callback
4. Token exchange happens automatically
5. Check auth status with `/aetna-status`

### 3. Fetch Patient Data
Once authenticated, fetch data using the `/aetna-data` endpoint with different resource types.

## Available FHIR Resources

From Aetna Patient Access API:
- `Patient` - Basic patient information
- `MedicationRequest` - Current medications
- `Condition` - Health conditions/diagnoses
- `ExplanationOfBenefit` - Insurance claims
- `Coverage` - Insurance coverage details
- `DocumentReference` - Clinical documents
- `CarePlan` - Treatment plans
- `CareTeam` - Healthcare providers
- `AllergyIntolerance` - Allergies
- `DiagnosticReport` - Lab results
- `Immunization` - Vaccinations
