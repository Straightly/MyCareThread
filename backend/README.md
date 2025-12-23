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
