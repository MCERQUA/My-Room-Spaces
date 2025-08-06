// Simple Cloudflare Worker for persistent visitor counting
// This worker tracks unique visitors and total page loads

export default {
  async fetch(request, env) {
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
      // Increment visitor count
      if (url.pathname === '/increment' && request.method === 'POST') {
        // Get current visitor count from KV
        const currentCountStr = await env.VISITOR_KV.get('total_visitors') || '0';
        let currentCount = parseInt(currentCountStr, 10);
        
        // Increment the count
        currentCount++;
        
        // Save the new count back to KV
        await env.VISITOR_KV.put('total_visitors', currentCount.toString());
        
        // Also track daily/hourly stats if needed
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `daily_${today}`;
        const dailyCountStr = await env.VISITOR_KV.get(dailyKey) || '0';
        let dailyCount = parseInt(dailyCountStr, 10);
        dailyCount++;
        await env.VISITOR_KV.put(dailyKey, dailyCount.toString());
        
        return new Response(JSON.stringify({
          count: currentCount,
          dailyCount: dailyCount,
          date: today
        }), { headers: corsHeaders });
      }

      // Get current visitor count
      if (url.pathname === '/count' && request.method === 'GET') {
        const currentCountStr = await env.VISITOR_KV.get('total_visitors') || '0';
        const currentCount = parseInt(currentCountStr, 10);
        
        const today = new Date().toISOString().split('T')[0];
        const dailyKey = `daily_${today}`;
        const dailyCountStr = await env.VISITOR_KV.get(dailyKey) || '0';
        const dailyCount = parseInt(dailyCountStr, 10);
        
        return new Response(JSON.stringify({
          count: currentCount,
          dailyCount: dailyCount,
          date: today
        }), { headers: corsHeaders });
      }

      // Admin endpoint to reset counter (protect this in production!)
      if (url.pathname === '/reset' && request.method === 'POST') {
        // Check for admin key in production
        const body = await request.json().catch(() => ({}));
        
        // Simple admin check - improve this in production!
        if (body.adminKey !== 'your-secret-admin-key') {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401,
            headers: corsHeaders 
          });
        }
        
        await env.VISITOR_KV.put('total_visitors', '0');
        
        return new Response(JSON.stringify({
          message: 'Counter reset successfully',
          count: 0
        }), { headers: corsHeaders });
      }

      // Health check / info endpoint
      if (url.pathname === '/' && request.method === 'GET') {
        const currentCountStr = await env.VISITOR_KV.get('total_visitors') || '0';
        const currentCount = parseInt(currentCountStr, 10);
        
        return new Response(JSON.stringify({
          service: 'Visitor Counter API',
          status: 'healthy',
          currentCount: currentCount,
          endpoints: [
            'POST /increment - Increment visitor count',
            'GET /count - Get current visitor count',
            'POST /reset - Reset counter (requires admin key)'
          ]
        }), { headers: corsHeaders });
      }

      // 404 for unknown endpoints
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        availableEndpoints: [
          'POST /increment',
          'GET /count',
          'GET /'
        ]
      }), { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};