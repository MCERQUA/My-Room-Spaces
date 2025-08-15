# Cloudflare Worker Visitor Counter

This Cloudflare Worker provides a persistent visitor counting API that tracks multiple 3D world spaces.

## Quick Deploy

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Create a KV namespace:
```bash
wrangler kv:namespace create "VISITOR_KV"
```

4. Update `wrangler.toml` with your KV namespace ID from step 3.

5. Deploy the worker:
```bash
wrangler deploy visitor-counter-worker.js
```

## Features

- **Multi-Space Tracking**: Track unlimited 3D world instances
- **Persistent Storage**: Survives all deployments using Cloudflare KV
- **Per-Space Analytics**: Individual visitor counts for each space
- **Global API**: One worker serves all your spaces

## Environment Setup

After deploying, add these to your Railway server:

```env
VISITOR_COUNTER_API=https://visitor-counter.YOUR-SUBDOMAIN.workers.dev
SPACE_NAME=main-world
```

## API Usage

### Get all spaces
```bash
curl https://visitor-counter.YOUR-SUBDOMAIN.workers.dev/api/spaces
```

### Get specific space stats
```bash
curl https://visitor-counter.YOUR-SUBDOMAIN.workers.dev/api/space/main-world
```

### Record a visit
```bash
curl -X POST https://visitor-counter.YOUR-SUBDOMAIN.workers.dev/api/space/visit \
  -H "Content-Type: application/json" \
  -d '{"spaceName": "main-world", "visitorId": "user123"}'
```