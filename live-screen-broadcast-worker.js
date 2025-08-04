// Live Screen Broadcasting Worker
// Deploy this in your Cloudflare Workers dashboard

// Durable Object for managing WebSocket connections and frame broadcasting
export class ScreenBroadcastDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.websockets = new Map();
    this.currentFrame = null;
    this.isActive = false;
    this.lastFrameTime = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocket(request);
    }
    
    // Handle HTTP requests
    switch (url.pathname) {
      case "/broadcast":
        return this.handleBroadcast(request);
      case "/current":
        return this.handleGetCurrent(request);
      case "/stop":
        return this.handleStop(request);
      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  async handleWebSocket(request) {
    console.log("New WebSocket connection");
    const [client, server] = Object.values(new WebSocketPair());
    
    const sessionId = crypto.randomUUID();
    this.websockets.set(sessionId, server);
    
    server.accept();
    
    // Send current frame if available
    if (this.currentFrame && this.isActive) {
      server.send(JSON.stringify({
        type: 'frame',
        data: this.currentFrame,
        timestamp: this.lastFrameTime
      }));
    }
    
    server.addEventListener('close', () => {
      this.websockets.delete(sessionId);
    });
    
    server.addEventListener('error', () => {
      this.websockets.delete(sessionId);
    });
    
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleBroadcast(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    try {
      const data = await request.json();
      this.currentFrame = data.frameData;
      this.isActive = true;
      this.lastFrameTime = Date.now();
      
      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'frame',
        data: this.currentFrame,
        timestamp: this.lastFrameTime
      });
      
      const broken = [];
      for (const [id, ws] of this.websockets.entries()) {
        try {
          ws.send(message);
        } catch (error) {
          broken.push(id);
        }
      }
      
      // Clean up broken connections
      broken.forEach(id => this.websockets.delete(id));
      
      return new Response(JSON.stringify({ 
        success: true, 
        connections: this.websockets.size 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      return new Response('Server Error', { status: 500 });
    }
  }

  async handleGetCurrent(request) {
    if (!this.currentFrame || !this.isActive) {
      return new Response(JSON.stringify({
        active: false
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      active: true,
      frame: this.currentFrame,
      timestamp: this.lastFrameTime
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleStop(request) {
    this.currentFrame = null;
    this.isActive = false;
    
    // Notify all clients
    const message = JSON.stringify({
      type: 'stop'
    });
    
    for (const [id, ws] of this.websockets.entries()) {
      try {
        ws.send(message);
      } catch (error) {
        this.websockets.delete(id);
      }
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Main Worker
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Get Durable Object
    const id = env.SCREEN_BROADCAST_DO.idFromName('screen-share');
    const obj = env.SCREEN_BROADCAST_DO.get(id);
    
    const response = await obj.fetch(request);
    
    // Add CORS headers
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        ...corsHeaders
      }
    });
  }
};