// Persistent Visitor Counter Worker for Cloudflare
// This ensures your visitor count NEVER resets

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Check if KV namespace is available
      if (!env.VISITOR_KV) {
        console.error('KV namespace VISITOR_KV not bound');
        return new Response(JSON.stringify({
          error: 'KV storage not configured',
          setup: 'Please bind VISITOR_KV namespace in worker settings'
        }), { status: 500, headers: corsHeaders });
      }

      // INCREMENT VISITOR COUNT
      if (url.pathname === '/increment' && request.method === 'POST') {
        // Get current total count from KV (persistent storage)
        const currentCountStr = await env.VISITOR_KV.get('total_visitors');
        let currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        
        // Validate the count
        if (isNaN(currentCount)) {
          currentCount = 0;
        }
        
        // Increment the count
        currentCount++;
        
        // Save the new count back to KV (this persists forever)
        await env.VISITOR_KV.put('total_visitors', currentCount.toString());
        
        // Track daily stats
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `daily_${today}`;
        const dailyCountStr = await env.VISITOR_KV.get(dailyKey);
        let dailyCount = dailyCountStr ? parseInt(dailyCountStr, 10) : 0;
        dailyCount++;
        
        // Save daily count (expires after 30 days to save space)
        await env.VISITOR_KV.put(dailyKey, dailyCount.toString(), {
          expirationTtl: 30 * 24 * 60 * 60 // 30 days in seconds
        });
        
        // Track unique visitors if visitor ID provided
        const body = await request.json().catch(() => ({}));
        if (body.visitorId) {
          const uniqueKey = `unique_${body.visitorId}`;
          const isUnique = await env.VISITOR_KV.get(uniqueKey);
          
          if (!isUnique) {
            // First time visitor
            await env.VISITOR_KV.put(uniqueKey, '1', {
              expirationTtl: 365 * 24 * 60 * 60 // 1 year
            });
            
            // Track unique visitor count
            const uniqueCountStr = await env.VISITOR_KV.get('unique_visitors');
            let uniqueCount = uniqueCountStr ? parseInt(uniqueCountStr, 10) : 0;
            uniqueCount++;
            await env.VISITOR_KV.put('unique_visitors', uniqueCount.toString());
          }
        }
        
        console.log(`Visitor count incremented to: ${currentCount}`);
        
        return new Response(JSON.stringify({
          count: currentCount,
          dailyCount: dailyCount,
          date: today,
          message: 'Visitor count incremented successfully'
        }), { headers: corsHeaders });
      }

      // GET CURRENT VISITOR COUNT
      if (url.pathname === '/count' && request.method === 'GET') {
        const currentCountStr = await env.VISITOR_KV.get('total_visitors');
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        
        const uniqueCountStr = await env.VISITOR_KV.get('unique_visitors');
        const uniqueCount = uniqueCountStr ? parseInt(uniqueCountStr, 10) : 0;
        
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `daily_${today}`;
        const dailyCountStr = await env.VISITOR_KV.get(dailyKey);
        const dailyCount = dailyCountStr ? parseInt(dailyCountStr, 10) : 0;
        
        return new Response(JSON.stringify({
          count: currentCount,
          uniqueVisitors: uniqueCount,
          dailyCount: dailyCount,
          date: today
        }), { headers: corsHeaders });
      }

      // GET STATISTICS
      if (url.pathname === '/stats' && request.method === 'GET') {
        const totalStr = await env.VISITOR_KV.get('total_visitors');
        const total = totalStr ? parseInt(totalStr, 10) : 0;
        
        const uniqueStr = await env.VISITOR_KV.get('unique_visitors');
        const unique = uniqueStr ? parseInt(uniqueStr, 10) : 0;
        
        const today = new Date().toISOString().split('T')[0];
        const dailyStr = await env.VISITOR_KV.get(`daily_${today}`);
        const daily = dailyStr ? parseInt(dailyStr, 10) : 0;
        
        // Get last 7 days statistics
        const weekStats = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const countStr = await env.VISITOR_KV.get(`daily_${dateStr}`);
          const count = countStr ? parseInt(countStr, 10) : 0;
          weekStats.push({ 
            date: dateStr, 
            count: count,
            dayName: date.toLocaleDateString('en-US', { weekday: 'short' })
          });
        }
        
        return new Response(JSON.stringify({
          total: total,
          unique: unique,
          today: daily,
          week: weekStats,
          average: Math.round(weekStats.reduce((sum, day) => sum + day.count, 0) / 7)
        }), { headers: corsHeaders });
      }

      // SET INITIAL COUNT (Admin only - use carefully!)
      if (url.pathname === '/set' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        
        // Simple admin check - improve this in production!
        if (body.adminKey !== 'your-secret-admin-key-change-this') {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401,
            headers: corsHeaders 
          });
        }
        
        if (body.count !== undefined && !isNaN(body.count)) {
          await env.VISITOR_KV.put('total_visitors', body.count.toString());
          
          return new Response(JSON.stringify({
            message: 'Counter set successfully',
            count: body.count
          }), { headers: corsHeaders });
        }
        
        return new Response(JSON.stringify({ error: 'Invalid count value' }), { 
          status: 400,
          headers: corsHeaders 
        });
      }

      // HEALTH CHECK / INFO ENDPOINT
      if (url.pathname === '/' && request.method === 'GET') {
        const currentCountStr = await env.VISITOR_KV.get('total_visitors');
        const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
        
        const uniqueCountStr = await env.VISITOR_KV.get('unique_visitors');
        const uniqueCount = uniqueCountStr ? parseInt(uniqueCountStr, 10) : 0;
        
        return new Response(JSON.stringify({
          service: 'Persistent Visitor Counter API',
          status: 'healthy',
          storage: 'Cloudflare KV (permanent)',
          currentCount: currentCount,
          uniqueVisitors: uniqueCount,
          message: 'This counter will NEVER reset - data persists in Cloudflare KV',
          endpoints: [
            'POST /increment - Increment visitor count',
            'GET /count - Get current visitor count',
            'GET /stats - Get detailed statistics',
            'POST /set - Set counter value (requires admin key)',
            'GET / - This health check'
          ]
        }), { headers: corsHeaders });
      }

      // 404 for unknown endpoints
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        availableEndpoints: [
          'POST /increment',
          'GET /count',
          'GET /stats',
          'GET /'
        ]
      }), { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};