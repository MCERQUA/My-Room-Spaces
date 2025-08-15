import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000011);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.getElementById('scene-container').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add a rotating cube as main element
const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshPhongMaterial({ 
  color: 0x00ff88,
  transparent: true,
  opacity: 0.8
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, -5);
cube.castShadow = true;
scene.add(cube);

// Add floor
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3;
floor.receiveShadow = true;
scene.add(floor);

// Add some decorative elements
const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0xff0088 });

for (let i = 0; i < 5; i++) {
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.set(
    (Math.random() - 0.5) * 10,
    Math.random() * 2,
    (Math.random() - 0.5) * 10 - 5
  );
  sphere.castShadow = true;
  scene.add(sphere);
}

// Camera position
camera.position.set(0, 2, 5);
camera.lookAt(0, 0, -5);

// Mobile controls
let isMoving = false;
let lastTap = 0;
let moveDirection = new THREE.Vector3();
let cameraRotation = { x: 0, y: 0 };
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// Touch controls for mobile
document.addEventListener('touchstart', (event) => {
  if (event.touches.length === 1) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 500 && tapLength > 0) {
      // Double tap - move forward
      isMoving = true;
      moveForward();
    }
    lastTap = currentTime;
    
    // Start drag for looking around
    isDragging = true;
    previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
  event.preventDefault();
});

document.addEventListener('touchmove', (event) => {
  if (isDragging && event.touches.length === 1) {
    const deltaMove = {
      x: event.touches[0].clientX - previousMousePosition.x,
      y: event.touches[0].clientY - previousMousePosition.y
    };
    
    cameraRotation.y -= deltaMove.x * 0.005;
    cameraRotation.x -= deltaMove.y * 0.005;
    cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation.x));
    
    previousMousePosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }
  event.preventDefault();
});

document.addEventListener('touchend', (event) => {
  isMoving = false;
  isDragging = false;
  event.preventDefault();
});

// Mouse controls for desktop
document.addEventListener('mousedown', (event) => {
  isDragging = true;
  previousMousePosition = { x: event.clientX, y: event.clientY };
});

document.addEventListener('mousemove', (event) => {
  if (isDragging) {
    const deltaMove = {
      x: event.clientX - previousMousePosition.x,
      y: event.clientY - previousMousePosition.y
    };
    
    cameraRotation.y -= deltaMove.x * 0.005;
    cameraRotation.x -= deltaMove.y * 0.005;
    cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, cameraRotation.x));
    
    previousMousePosition = { x: event.clientX, y: event.clientY };
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

// Keyboard controls
const keys = {};
document.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});

document.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

function moveForward() {
  if (isMoving) {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    camera.position.add(direction.multiplyScalar(0.1));
    requestAnimationFrame(moveForward);
  }
}

// Interactive screen element
const screenElement = document.getElementById('interactive-screen');
let screenInteracted = false;

screenElement.addEventListener('click', () => {
  if (!screenInteracted) {
    screenElement.innerHTML = `
      <h2>System Activated!</h2>
      <div class="terminal-content">
        <p>> Welcome to the matrix...</p>
        <p>> Systems online: ✓</p>
        <p>> Reality.exe loading...</p>
        <p>> Have a great day! 🚀</p>
      </div>
    `;
    screenInteracted = true;
    
    // Add a visual effect to the cube
    cube.material.color.setHex(0xff0088);
    cube.material.emissive.setHex(0x440044);
  }
});

// Add meme/2D plane functionality
function createMemePlane() {
  // Create a canvas for the meme text
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  
  // Draw meme background
  context.fillStyle = '#000000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw meme text
  context.fillStyle = '#00ff00';
  context.font = 'bold 48px Arial';
  context.textAlign = 'center';
  context.fillText('SUCH 3D', canvas.width/2, canvas.height/2 - 50);
  context.fillText('VERY WOW', canvas.width/2, canvas.height/2 + 50);
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create plane geometry
  const planeGeometry = new THREE.PlaneGeometry(4, 4);
  const planeMaterial = new THREE.MeshBasicMaterial({ 
    map: texture,
    transparent: true,
    opacity: 0.9
  });
  
  const memePlane = new THREE.Mesh(planeGeometry, planeMaterial);
  memePlane.position.set(-6, 2, -3);
  memePlane.rotation.y = Math.PI / 4;
  
  return memePlane;
}

// Add the meme plane to the scene
const meme = createMemePlane();
scene.add(meme);

// GLTF Loader setup (ready for 3D models)
const loader = new GLTFLoader();

// Example of how to load a GLTF model (uncomment when you have a model file)
/*
loader.load('models/computer.glb', function (gltf) {
  const model = gltf.scene;
  model.position.set(3, -2, -5);
  model.scale.set(0.5, 0.5, 0.5);
  scene.add(model);
}, undefined, function (error) {
  console.error('Error loading GLTF model:', error);
});
*/

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update camera rotation
  camera.rotation.order = 'YXZ';
  camera.rotation.y = cameraRotation.y;
  camera.rotation.x = cameraRotation.x;
  
  // Handle keyboard movement
  const moveSpeed = 0.1;
  if (keys['KeyW'] || keys['ArrowUp']) {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    camera.position.add(direction.multiplyScalar(moveSpeed));
  }
  if (keys['KeyS'] || keys['ArrowDown']) {
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(camera.quaternion);
    camera.position.add(direction.multiplyScalar(moveSpeed));
  }
  if (keys['KeyA'] || keys['ArrowLeft']) {
    const direction = new THREE.Vector3(-1, 0, 0);
    direction.applyQuaternion(camera.quaternion);
    camera.position.add(direction.multiplyScalar(moveSpeed));
  }
  if (keys['KeyD'] || keys['ArrowRight']) {
    const direction = new THREE.Vector3(1, 0, 0);
    direction.applyQuaternion(camera.quaternion);
    camera.position.add(direction.multiplyScalar(moveSpeed));
  }
  
  // Rotate the cube
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  
  // Animate meme plane
  meme.rotation.z += 0.005;
  
  // Render the scene
  renderer.render(scene, camera);
}

// Start the animation loop
animate();

console.log('3D Interactive Website loaded successfully!');