# Cloudflare Visitor Counter Setup

## Overview
The visitor counter uses a dual approach for maximum reliability:
1. **Primary**: Cloudflare Workers with KV storage (persistent across deployments)
2. **Fallback**: Railway backend with SQLite database

## Current Status
- ✅ Visitor counter code created (`visitor-counter.js`)
- ✅ Railway fallback implemented and working
- ⚠️ Cloudflare Worker needs deployment to your account

## Deploy Cloudflare Worker

### Method 1: Using Wrangler CLI

1. **Install Wrangler** (if not already installed):
```bash
npm install -g wrangler
```

2. **Login to Cloudflare**:
```bash
wrangler login
```

3. **Create KV Namespace**:
```bash
wrangler kv:namespace create "VISITOR_KV"
```
Note the ID that's returned (looks like: `a1b2c3d4e5f6...`)

4. **Create wrangler.toml for visitor counter**:
```toml
name = "visitor-counter"
main = "visitor-counter.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "VISITOR_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"
```

5. **Deploy the Worker**:
```bash
wrangler deploy visitor-counter.js
```

6. **Note the deployed URL** (will be something like):
```
https://visitor-counter.YOUR-SUBDOMAIN.workers.dev
```

### Method 2: Using Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click **Create Application** → **Create Worker**
4. Name it `visitor-counter`
5. Replace the default code with contents of `visitor-counter.js`
6. Go to **Settings** → **Variables**
7. Add KV Namespace binding:
   - Variable name: `VISITOR_KV`
   - Create new KV namespace called `visitor_counter_kv`
8. Save and Deploy

### Update index.html with Your Worker URL

Once deployed, update the worker URLs in `index.html` (line ~1633):

```javascript
const WORKER_URLS = [
  'https://visitor-counter.YOUR-SUBDOMAIN.workers.dev',  // Replace with your actual URL
  'https://visitor-counter.mikecerqua.workers.dev',      // Keep as fallback
  'https://visitor-counter.threejs-multiuser.workers.dev'
];
```

## How It Works

### Visitor Tracking Flow
1. When a user loads the page, `index.html` tries to connect to Cloudflare Worker
2. If successful, it increments the visitor count in Cloudflare KV storage
3. If Cloudflare fails, it falls back to Railway backend (SQLite database)
4. The count persists across:
   - Code deployments
   - Server restarts
   - Platform updates

### Data Persistence
- **Cloudflare KV**: Stores `total_visitors` count and daily statistics
- **Railway SQLite**: Stores visitor records with timestamps and unique IDs
- Both systems track unique visitors using browser localStorage

## Testing

### Test Cloudflare Worker (once deployed):
```bash
# Get current count
curl https://visitor-counter.YOUR-SUBDOMAIN.workers.dev/count

# Check health
curl https://visitor-counter.YOUR-SUBDOMAIN.workers.dev/

# Increment count (POST)
curl -X POST https://visitor-counter.YOUR-SUBDOMAIN.workers.dev/increment
```

### Test Railway Fallback:
```bash
# Check visitor stats
curl http://localhost:3001/api/visitor-stats

# View database directly
sqlite3 data/visitors.db "SELECT * FROM space_stats;"
```

## Troubleshooting

### "ERR_NAME_NOT_RESOLVED" Error
- Worker not deployed yet → Deploy using instructions above
- Wrong subdomain in URL → Check your Cloudflare dashboard for correct URL

### Count Not Persisting
- Check Cloudflare KV namespace is bound correctly
- Verify Railway server is running with database access
- Check browser console for connection errors

### Count Resets After Deployment
- This should NOT happen if properly configured
- Cloudflare KV and Railway SQLite both persist data
- Check that you're not accidentally deleting the database

## Architecture Benefits

### Why Two Systems?
1. **Redundancy**: If Cloudflare is down, Railway takes over
2. **Performance**: Cloudflare Workers are globally distributed
3. **Persistence**: Both systems maintain separate persistent storage
4. **Cost**: Cloudflare Workers have generous free tier

### Data Consistency
- Each system maintains its own count
- Visitor IDs prevent double-counting
- Daily statistics help track growth over time

## Next Steps
1. Deploy the Cloudflare Worker using instructions above
2. Update index.html with your Worker URL
3. Test both Cloudflare and Railway counters
4. Monitor visitor growth in your dashboard!