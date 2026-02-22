# MyCareThread

Personal healthcare data aggregator using FHIR APIs to retrieve and consolidate medical data from providers like Epic and Aetna.

## Project Overview

MyCareThread is a personal FHIR client that:
- Retrieves medical data from multiple healthcare providers
- Consolidates medications, conditions, claims, and clinical documents
- Provides a web-based interface for data visualization
- Stores data securely using Cloudflare KV storage
- Supports both Epic SMART on FHIR and Aetna Patient Access APIs

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Frontend  │────│  Cloudflare Worker│────│  Healthcare APIs │
│   (Future)      │    │     Backend      │    │   (Epic/Aetna)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Cloudflare KV  │
                       │   (Token Store) │
                       └─────────────────┘
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
wrangler login
```

### 2. Configure Environment Variables

```bash
# Aetna Integration
wrangler secret put AETNA_APP_NAME
wrangler secret put AETNA_CLIENT_ID
wrangler secret put AETNA_CLIENT_SECRET

# Epic Integration (optional)
wrangler secret put SMART_CLIENT_ID
wrangler secret put SMART_CLIENT_SECRET
```

### 3. Deploy Backend

```bash
wrangler deploy
```

### 4. Configure Healthcare Providers

#### Aetna Configuration
1. Go to [Aetna Developer Portal](https://developerportal.aetna.com)
2. Set callback URL: `https://mycarethread-backend.zhian-job.workers.dev/aetna-callback`
3. Save configuration

#### Epic Configuration (if applicable)
1. Set callback URL: `https://mycarethread-backend.zhian-job.workers.dev/callback`
2. Configure SMART on FHIR app settings

## API Endpoints

### Base URL
```
Production: https://mycarethread-backend.zhian-job.workers.dev
```

### Aetna Patient Access API

#### Authentication Status
```bash
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-status
```

#### OAuth Callback Configuration
**Aetna Developer Portal Callback URL:**
```
https://mycarethread-backend.zhian-job.workers.dev/aetna-callback
```

#### Fetch Patient Data
```bash
# Get medications
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=MedicationRequest

# Get conditions
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=Condition

# Get claims
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=ExplanationOfBenefit

# Get patient info
curl https://mycarethread-backend.zhian-job.workers.dev/aetna-data?resource=Patient
```

### Epic SMART on FHIR

#### OAuth Callback Configuration
**Epic Callback URL:**
```
https://mycarethread-backend.zhian-job.workers.dev/callback
```

#### Launch Endpoint
```bash
curl "https://mycarethread-backend.zhian-job.workers.dev/launch?launch=xyz&iss=https://epic.example.com"
```

## Available Data Types

### Aetna Patient Access API
- **Patient** - Basic demographic information
- **MedicationRequest** - Current medications and prescriptions
- **Condition** - Diagnoses and health conditions
- **ExplanationOfBenefit** - Insurance claims and payments
- **Coverage** - Insurance plan details
- **DocumentReference** - Clinical documents and notes
- **CarePlan** - Treatment plans and goals
- **CareTeam** - Healthcare providers and care team
- **AllergyIntolerance** - Allergies and adverse reactions
- **DiagnosticReport** - Lab results and diagnostics
- **Immunization** - Vaccination records

### Epic Integration
- **CDA Documents** - Clinical documents in CDA format
- **Extracted Concepts** - Processed clinical concepts
- **Metadata** - Patient and encounter information

## Security & Privacy

- **Single-user design** - Built for personal use only
- **Secure token storage** - OAuth tokens stored in Cloudflare KV
- **No PHI in logs** - Sensitive data never logged
- **HTTPS only** - All communications encrypted
- **Minimal data retention** - Only store necessary medical data

## Development

### Local Development

```bash
cd backend
wrangler dev
```

Local development server: `http://127.0.0.1:8787`

### Project Structure

```
MyCareThread/
├── backend/
│   ├── index.js              # Main Cloudflare Worker
│   ├── lib/
│   │   ├── aetna-oauth.js    # Aetna OAuth handling
│   │   └── conceptExtractor.js # Clinical concept extraction
│   ├── wrangler.toml         # Cloudflare configuration
│   └── README.md             # Backend-specific documentation
├── docs/
│   └── AetanIntegration/
│       └── patient_access_api_library.csv # Aetna API catalog
├── PROJECT_PLAN.md           # Project planning and status
└── README.md                 # This file
```

## Testing

### Test Backend Health
```bash
curl https://mycarethread-backend.zhian-job.workers.dev/
```

### Test KV Storage
```bash
# Write test data
curl -X POST https://mycarethread-backend.zhian-job.workers.dev/kv-test

# Read test data
curl https://mycarethread-backend.zhian-job.workers.dev/kv-test
```

### Test Aetna Integration
1. Configure callback URL in Aetna developer portal
2. Complete OAuth flow through Aetna's authorization
3. Check authentication status
4. Fetch patient data using available endpoints

## OAuth Flow

### Aetna Patient Access API
1. **Authorization**: User redirects to Aetna's authorization endpoint
2. **Authentication**: User logs in and consents to data access
3. **Callback**: Aetna redirects to your callback URL with authorization code
4. **Token Exchange**: Backend exchanges code for access token
5. **Data Access**: Use token to fetch patient data from Aetna APIs

### Epic SMART on FHIR
1. **Launch**: Initiate SMART on FHIR launch sequence
2. **Authentication**: Complete OAuth flow with Epic
3. **Token Storage**: Store access and refresh tokens
4. **Data Retrieval**: Fetch clinical documents and data

## Troubleshooting

### Common Issues

#### PII/PHI Scan Errors
```bash
# Override for legitimate healthcare API code
$env:PII_SCAN_SKIP=1; git commit -m "Your message"
```

#### Deployment Issues
```bash
# Check wrangler authentication
wrangler whoami

# Redeploy with latest changes
wrangler deploy
```

#### OAuth Callback Errors
- Verify callback URL matches exactly in provider portal
- Check environment variables are properly set
- Ensure HTTPS is used (required for OAuth)

## Future Plans

- [ ] Web frontend for data visualization
- [ ] iPhone app wrapper
- [ ] Additional healthcare provider integrations
- [ ] Advanced data analytics and insights
- [ ] Automated data synchronization
- [ ] Care team sharing features

## Contributing

This is a personal healthcare project. Contributions welcome for:
- Additional healthcare provider integrations
- Security enhancements
- User interface improvements
- Documentation improvements

## License

Personal use only. Not intended for production healthcare applications.

## Support

For questions or issues:
1. Check this README and backend documentation
2. Review Cloudflare Workers documentation
3. Consult healthcare provider API documentation
4. Check project issues and planning documents
