// Visitor Counter Integration Script
// Add this to your index.html or include as a separate script

// Configuration - UPDATE THIS WITH YOUR ACTUAL WORKER URL
const VISITOR_COUNTER_CONFIG = {
  // Primary Cloudflare Worker URL (replace with your deployed worker URL)
  primaryUrl: 'https://visitor-counter.YOUR-SUBDOMAIN.workers.dev',
  
  // Fallback URLs in case primary fails
  fallbackUrls: [
    'https://visitor-counter.metamike.workers.dev',
    'https://visitor-counter.mikecerqua.workers.dev'
  ],
  
  // Use Hetzner VPS backend as last resort
  useVPSFallback: true,
  vpsUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : 'http://178.156.181.117:3001'
};

// Initialize visitor counter on page load
class VisitorCounter {
  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.currentCount = 0;
    this.initialized = false;
  }

  // Generate or retrieve unique visitor ID
  getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
      visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('visitorId', visitorId);
      console.log('🆔 New visitor ID created:', visitorId);
    }
    return visitorId;
  }

  // Update the counter display
  updateDisplay(count) {
    this.currentCount = count;
    const countElement = document.getElementById('visitor-count-number');
    if (countElement) {
      // Format with commas for large numbers
      countElement.textContent = count.toLocaleString();
      console.log('📊 Visitor count updated:', count.toLocaleString());
    }
    
    // Show the counter element
    const counterContainer = document.getElementById('visitor-counter');
    if (counterContainer) {
      counterContainer.style.display = 'block';
    }
  }

  // Try to connect to Cloudflare Worker
  async tryCloudflareWorker(url) {
    try {
      console.log(`🔄 Trying Cloudflare Worker: ${url}`);
      
      const response = await fetch(`${url}/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitorId: this.visitorId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.count !== undefined) {
          console.log(`✅ Cloudflare Worker success! Count: ${data.count}`);
          this.updateDisplay(data.count);
          this.initialized = true;
          
          // Log additional stats if available
          if (data.dailyCount) {
            console.log(`📅 Today's visitors: ${data.dailyCount}`);
          }
          
          return true;
        }
      }
      
      console.warn(`⚠️ Worker ${url} returned invalid response`);
      return false;
      
    } catch (error) {
      console.warn(`❌ Failed to connect to ${url}:`, error.message);
      return false;
    }
  }

  // Try Hetzner VPS backend as fallback
  async tryVPSBackend() {
    try {
      if (!VISITOR_COUNTER_CONFIG.useVPSFallback) {
        return false;
      }
      
      console.log('🔄 Trying Hetzner VPS backend fallback...');
      
      const response = await fetch(`${VISITOR_COUNTER_CONFIG.vpsUrl}/api/visitor-increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitorId: this.visitorId,
          spaceName: 'main-world'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.count !== undefined) {
          console.log(`✅ Hetzner VPS backend success! Count: ${data.count}`);
          this.updateDisplay(data.count);
          this.initialized = true;
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      console.warn('❌ Hetzner VPS backend failed:', error.message);
      return false;
    }
  }

  // Initialize the counter
  async initialize() {
    console.log('🚀 Initializing visitor counter...');
    
    // Try primary Cloudflare Worker
    if (await this.tryCloudflareWorker(VISITOR_COUNTER_CONFIG.primaryUrl)) {
      return;
    }
    
    // Try fallback Cloudflare Workers
    for (const fallbackUrl of VISITOR_COUNTER_CONFIG.fallbackUrls) {
      if (await this.tryCloudflareWorker(fallbackUrl)) {
        return;
      }
    }
    
    // Try Hetzner VPS backend as last resort
    if (await this.tryVPSBackend()) {
      return;
    }
    
    // If all fails, show a default message
    console.error('❌ All visitor counter services failed');
    this.updateDisplay(0);
  }

  // Get current statistics (optional feature)
  async getStats() {
    try {
      const response = await fetch(`${VISITOR_COUNTER_CONFIG.primaryUrl}/stats`);
      if (response.ok) {
        const stats = await response.json();
        console.log('📊 Visitor Statistics:', stats);
        return stats;
      }
    } catch (error) {
      console.error('Failed to get stats:', error);
    }
    return null;
  }
}

// Create global instance
window.visitorCounter = new VisitorCounter();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.visitorCounter.initialize();
  });
} else {
  // DOM is already loaded
  window.visitorCounter.initialize();
}

// Optional: Expose functions for debugging
window.getVisitorStats = async () => {
  const stats = await window.visitorCounter.getStats();
  if (stats) {
    console.table(stats.week);
    console.log('Total visitors:', stats.total);
    console.log('Unique visitors:', stats.unique);
    console.log('Today:', stats.today);
    console.log('7-day average:', stats.average);
  }
  return stats;
};

console.log('✨ Visitor counter script loaded. Use window.getVisitorStats() to see statistics.');
