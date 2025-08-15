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
    serverEndpoint: 'https://3d-threejs-site-production.up.railway.app',
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
    serverEndpoint: 'https://3d-threejs-site-production.up.railway.app',
    welcomeMessage: 'Welcome to the White Room',
    themeColor: '#e0e0e0',
    cameraPosition: { x: 0, y: 2, z: -4 },
    mobileCameraPosition: { x: 0, y: 2, z: 0 }
  },
  
  // Space environment
  'space': {
    name: 'Space Station',
    roomModel: {
      desktop: null, // No room model - pure space environment
      mobile: null
    },
    serverEndpoint: 'https://3d-threejs-site-production.up.railway.app',
    welcomeMessage: 'Welcome to the Space Station',
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
    serverEndpoint: 'https://3d-threejs-site-production.up.railway.app',
    welcomeMessage: 'Welcome to the Custom Space',
    themeColor: '#0099ff',
    cameraPosition: { x: 0, y: 2, z: -4 },
    mobileCameraPosition: { x: 0, y: 2, z: 0 }
  }
};

// Function to detect which space to load based on URL
function detectSpace() {
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
  
  // Check path (e.g., /white/ or /space/white)
  const path = window.location.pathname;
  const pathMatch = path.match(/\/(space\/)?([^\/]+)/);
  if (pathMatch && pathMatch[2] && SPACES_CONFIG[pathMatch[2]]) {
    console.log(`Loading space from path: ${pathMatch[2]}`);
    return pathMatch[2];
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