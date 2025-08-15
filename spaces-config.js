// Space Configuration System
// This file defines different 3D spaces with their own room models and settings

const SPACES_CONFIG = {
  // Default space (original room)
  'default': {
    name: 'Main Space',
    roomModel: {
      desktop: './models/BAKE-WEBROOM1.glb',
      mobile: './models/unpacked-mobile/WEBROOM1-mob.gltf'
    },
    serverEndpoint: 'http://178.156.181.117:3001',
    welcomeMessage: 'Welcome to the Main Space',
    themeColor: '#00ffcc',
    cameraPosition: { x: 0, y: 2, z: -4 },
    mobileCameraPosition: { x: 0, y: 2, z: 0 }
  },
  
  // White room space
  'white': {
    name: 'White Room',
    roomModel: {
      desktop: './models/white-room1.glb',
      mobile: './models/unpacked-white/white-room-mobile.gltf' // Mobile-optimized with JPG textures
    },
    serverEndpoint: 'http://178.156.181.117:3001',
    welcomeMessage: 'Welcome to the White Room',
    themeColor: '#e0e0e0',
    cameraPosition: { x: 0, y: 2, z: -4 },
    mobileCameraPosition: { x: 0, y: 2, z: 0 }
  },
  
  // Game Room - Space environment
  'Game-Room': {
    name: 'Game Room',
    roomModel: {
      desktop: null, // No room model - pure space environment
      mobile: null
    },
    serverEndpoint: 'http://178.156.181.117:3001',
    welcomeMessage: 'Welcome to the Game Room',
    themeColor: '#00ff88',
    cameraPosition: { x: 0, y: 5, z: 10 },
    mobileCameraPosition: { x: 0, y: 5, z: 10 },
    environment: {
      type: 'space',
      backgroundColor: '#000000',
      starfield: true,
      aurora: true,
      nebula: true,
      particles: true
    }
  },
  
  // Add more spaces as needed
  'custom': {
    name: 'Custom Space',
    roomModel: {
      desktop: './models/BAKE-WEBROOM1.glb', // Change this to your new GLB
      mobile: './models/WEBROOM1-mob.glb'
    },
    serverEndpoint: 'http://178.156.181.117:3001',
    welcomeMessage: 'Welcome to the Custom Space',
    themeColor: '#0099ff',
    cameraPosition: { x: 0, y: 2, z: -4 },
    mobileCameraPosition: { x: 0, y: 2, z: 0 }
  }
};

// Function to detect which space to load based on URL
function detectSpace() {
  console.log('=== SPACE DETECTION DEBUG ===');
  console.log('Current URL:', window.location.href);
  console.log('Pathname:', window.location.pathname);
  console.log('Available spaces:', Object.keys(SPACES_CONFIG));
  
  // Check URL parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const spaceParam = urlParams.get('space');
  if (spaceParam && SPACES_CONFIG[spaceParam]) {
    console.log(`Loading space from URL parameter: ${spaceParam}`);
    return spaceParam;
  }
  
  // Check subdomain (e.g., white.yourdomain.com)
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  if (subdomain && SPACES_CONFIG[subdomain]) {
    console.log(`Loading space from subdomain: ${subdomain}`);
    return subdomain;
  }
  
  // Check path (e.g., /white/ or /Game-Room or /space/white)
  const path = window.location.pathname;
  // Remove trailing slash and index.html if present
  const cleanPath = path.replace(/\/index\.html$/, '').replace(/\/$/, '');
  
  // Try to match the last segment of the path
  const segments = cleanPath.split('/').filter(s => s);
  console.log('Path segments:', segments);
  
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    console.log(`Checking segment "${lastSegment}" against spaces...`);
    
    // Check exact match
    if (SPACES_CONFIG[lastSegment]) {
      console.log(`Loading space from path: ${lastSegment}`);
      return lastSegment;
    }
    
    // Check case-insensitive match for Game-Room
    const lowerSegment = lastSegment.toLowerCase();
    if (lowerSegment === 'game-room' || lowerSegment === 'gameroom') {
      console.log('Loading Game-Room space (case-insensitive match)');
      return 'Game-Room';
    }
  }
  
  // Default to main space
  console.log('Loading default space');
  return 'default';
}

// Get current space configuration
function getCurrentSpaceConfig() {
  const spaceId = detectSpace();
  return {
    id: spaceId,
    ...SPACES_CONFIG[spaceId]
  };
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SPACES_CONFIG, detectSpace, getCurrentSpaceConfig };
}