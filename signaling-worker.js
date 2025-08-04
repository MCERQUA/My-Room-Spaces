// Cloudflare Worker for WebRTC signaling
// Deploy this to workers.cloudflare.com

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // WebSocket upgrade for Socket.IO compatibility
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();
      
      server.accept();
      
      // Handle WebSocket messages for signaling
      server.addEventListener('message', event => {
        try {
          const data = JSON.parse(event.data);
          
          // Broadcast signaling messages to all connected clients
          // In a real implementation, you'd store connections and route properly
          console.log('Signaling message:', data);
          
          // Echo back for now (you'd implement proper room logic)
          server.send(JSON.stringify({
            type: 'signaling-response',
            data: data
          }));
          
        } catch (error) {
          console.error('WebSocket error:', error);
        }
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // HTTP endpoints for Socket.IO polling fallback
    if (url.pathname.startsWith('/socket.io/')) {
      
      // Handle Socket.IO polling requests
      if (request.method === 'GET') {
        // Return Socket.IO handshake response
        const response = {
          sid: generateSessionId(),
          upgrades: ['websocket'],
          pingInterval: 25000,
          pingTimeout: 5000
        };
        
        return new Response(`0${JSON.stringify(response)}`, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'text/plain',
          },
        });
      }
      
      if (request.method === 'POST') {
        // Handle Socket.IO polling messages
        const body = await request.text();
        console.log('Socket.IO message:', body);
        
        return new Response('ok', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          },
        });
      }
    }

    // Root endpoint
    return new Response('WebRTC Signaling Server Running', {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}