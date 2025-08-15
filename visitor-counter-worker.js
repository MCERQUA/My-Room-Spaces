// Cloudflare Worker for persistent visitor counting across multiple spaces
// This worker provides an API to track spaces and their visitor counts

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
      // Get all spaces and their visitor counts
      if (url.pathname === '/api/spaces' && request.method === 'GET') {
        const spacesData = await env.VISITOR_KV.get('spaces_data') || '{}';
        const spaces = JSON.parse(spacesData);
        
        return new Response(JSON.stringify({
          spaces: spaces,
          totalSpaces: Object.keys(spaces).length,
          totalVisitors: Object.values(spaces).reduce((sum, space) => sum + (space.visitorCount || 0), 0),
          lastUpdated: new Date().toISOString()
        }), { headers: corsHeaders });
      }

      // Get visitor count for a specific space
      if (url.pathname.startsWith('/api/space/') && request.method === 'GET') {
        const spaceName = url.pathname.split('/')[3];
        if (!spaceName) {
          return new Response(JSON.stringify({ error: 'Space name required' }), { 
            status: 400,
            headers: corsHeaders 
          });
        }

        const spacesData = await env.VISITOR_KV.get('spaces_data') || '{}';
        const spaces = JSON.parse(spacesData);
        const spaceInfo = spaces[spaceName] || { visitorCount: 0, uniqueVisitors: [], createdAt: null };
        
        return new Response(JSON.stringify({
          spaceName: spaceName,
          visitorCount: spaceInfo.visitorCount,
          uniqueVisitors: spaceInfo.uniqueVisitors.length,
          createdAt: spaceInfo.createdAt,
          lastVisit: spaceInfo.lastVisit,
          lastUpdated: new Date().toISOString()
        }), { headers: corsHeaders });
      }

      // Increment visitor count for a specific space
      if (url.pathname === '/api/space/visit' && request.method === 'POST') {
        const body = await request.json();
        const { spaceName, visitorId } = body;
        
        if (!spaceName || !visitorId) {
          return new Response(JSON.stringify({ error: 'spaceName and visitorId required' }), { 
            status: 400,
            headers: corsHeaders 
          });
        }

        // Get current spaces data
        const spacesData = await env.VISITOR_KV.get('spaces_data') || '{}';
        const spaces = JSON.parse(spacesData);
        
        // Initialize space if it doesn't exist
        if (!spaces[spaceName]) {
          spaces[spaceName] = {
            visitorCount: 0,
            uniqueVisitors: [],
            createdAt: new Date().toISOString(),
            lastVisit: null
          };
        }
        
        const space = spaces[spaceName];
        let isNewVisitor = false;
        
        // Check if this visitor is new to this space
        if (!space.uniqueVisitors.includes(visitorId)) {
          space.uniqueVisitors.push(visitorId);
          space.visitorCount++;
          isNewVisitor = true;
        }
        
        // Update last visit time
        space.lastVisit = new Date().toISOString();
        
        // Save updated spaces data
        await env.VISITOR_KV.put('spaces_data', JSON.stringify(spaces));
        
        return new Response(JSON.stringify({
          spaceName: spaceName,
          visitorCount: space.visitorCount,
          isNewVisitor: isNewVisitor,
          message: isNewVisitor ? 'New visitor added' : 'Existing visitor'
        }), { headers: corsHeaders });
      }

      // Create a new space
      if (url.pathname === '/api/space/create' && request.method === 'POST') {
        const body = await request.json();
        const { spaceName } = body;
        
        if (!spaceName) {
          return new Response(JSON.stringify({ error: 'spaceName required' }), { 
            status: 400,
            headers: corsHeaders 
          });
        }

        // Get current spaces data
        const spacesData = await env.VISITOR_KV.get('spaces_data') || '{}';
        const spaces = JSON.parse(spacesData);
        
        // Check if space already exists
        if (spaces[spaceName]) {
          return new Response(JSON.stringify({ 
            error: 'Space already exists',
            spaceName: spaceName 
          }), { 
            status: 409,
            headers: corsHeaders 
          });
        }
        
        // Create new space
        spaces[spaceName] = {
          visitorCount: 0,
          uniqueVisitors: [],
          createdAt: new Date().toISOString(),
          lastVisit: null
        };
        
        // Save updated spaces data
        await env.VISITOR_KV.put('spaces_data', JSON.stringify(spaces));
        
        return new Response(JSON.stringify({
          spaceName: spaceName,
          message: 'Space created successfully',
          createdAt: spaces[spaceName].createdAt
        }), { headers: corsHeaders });
      }

      // Reset a specific space (admin only - in production, add authentication)
      if (url.pathname === '/api/space/reset' && request.method === 'POST') {
        const body = await request.json();
        const { spaceName } = body;
        
        if (!spaceName) {
          return new Response(JSON.stringify({ error: 'spaceName required' }), { 
            status: 400,
            headers: corsHeaders 
          });
        }

        // Get current spaces data
        const spacesData = await env.VISITOR_KV.get('spaces_data') || '{}';
        const spaces = JSON.parse(spacesData);
        
        if (spaces[spaceName]) {
          spaces[spaceName] = {
            visitorCount: 0,
            uniqueVisitors: [],
            createdAt: spaces[spaceName].createdAt,
            lastVisit: null
          };
          
          await env.VISITOR_KV.put('spaces_data', JSON.stringify(spaces));
          
          return new Response(JSON.stringify({
            spaceName: spaceName,
            message: 'Space visitor count reset'
          }), { headers: corsHeaders });
        } else {
          return new Response(JSON.stringify({ 
            error: 'Space not found',
            spaceName: spaceName 
          }), { 
            status: 404,
            headers: corsHeaders 
          });
        }
      }

      // Default response
      return new Response(JSON.stringify({
        error: 'Not found',
        availableEndpoints: [
          'GET /api/spaces - Get all spaces and their visitor counts',
          'GET /api/space/{spaceName} - Get visitor count for a specific space',
          'POST /api/space/create - Create a new space',
          'POST /api/space/visit - Record a visit to a space',
          'POST /api/space/reset - Reset visitor count for a space'
        ]
      }), { status: 404, headers: corsHeaders });

    } catch (error) {
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