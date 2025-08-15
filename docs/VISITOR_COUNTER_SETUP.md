# Visitor Counter Setup Guide

This guide explains how to set up the persistent visitor counter using Cloudflare Workers and KV storage.

## Overview

The visitor counter uses Cloudflare Workers + KV storage to:
- Track multiple spaces and their individual visitor counts
- Maintain persistent counts that survive server redeployments
- Provide a global API for all your 3D world instances

This is necessary because Railway doesn't persist local files between deployments.

## Setup Steps

### 1. Create a Cloudflare KV Namespace

1. Log into your Cloudflare dashboard
2. Go to Workers & Pages > KV
3. Click "Create namespace"
4. Name it: `visitor-counter-kv`
5. Copy the namespace ID

### 2. Deploy the Visitor Counter Worker

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Create a `wrangler.toml` file with your KV namespace ID:
```toml
name = "visitor-counter"
main = "visitor-counter-worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "VISITOR_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"
```

4. Deploy the worker:
```bash
wrangler deploy visitor-counter-worker.js
```

5. Note your worker URL (e.g., `https://visitor-counter.YOUR-SUBDOMAIN.workers.dev`)

### 3. Update Your Server Code

The server is already configured to use the Cloudflare Worker API. Just set these environment variables:

## Environment Variables

Add to your Railway server:
- `VISITOR_COUNTER_API`: Your Cloudflare Worker URL (e.g., `https://visitor-counter.YOUR-SUBDOMAIN.workers.dev`)
- `SPACE_NAME`: Name of your space (defaults to `main-world`)

## API Endpoints

Your Cloudflare Worker provides these endpoints:

- `GET /api/spaces` - Get all spaces and their visitor counts
- `GET /api/space/{spaceName}` - Get visitor count for a specific space
- `POST /api/space/create` - Create a new space
- `POST /api/space/visit` - Record a visit to a space
- `POST /api/space/reset` - Reset visitor count for a space

## Multiple Spaces

You can run multiple instances of your 3D world, each with its own space name:
- Production: `SPACE_NAME=main-world`
- Development: `SPACE_NAME=dev-world`
- Events: `SPACE_NAME=event-2024`

All spaces share the same Cloudflare Worker and KV storage.

## Benefits

- **Truly Persistent**: Data stored in Cloudflare KV survives all deployments
- **Multi-Space Support**: Track unlimited spaces with individual counters
- **Global**: Cloudflare KV is globally distributed
- **Fast**: Low latency reads worldwide
- **Reliable**: 99.9% uptime SLA from Cloudflare