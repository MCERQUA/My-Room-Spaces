# Login System Documentation

## Overview
The 3D Three.js site uses a welcome dialog system that appears when users first load the page, allowing them to enter their display name before joining the multi-user 3D world.

## How the Login System Works

### 1. Welcome Dialog Display Flow
```javascript
// On page load:
showWelcomeDialog() → Shows overlay and dialog → User enters name → initializeRoomSystem()
```

### 2. Key Components

#### HTML Elements (lines 1344-1350)
```html
<div class="welcome-overlay" id="welcome-overlay" style="display: none;"></div>
<div class="welcome-dialog" id="welcome-dialog" style="display: none;">
  <h2>Welcome</h2>
  <p>Enter your name to join</p>
  <input type="text" class="welcome-input" id="welcome-input" placeholder="Your name" maxlength="20">
  <button class="welcome-button" id="welcome-button">Join</button>
</div>
```

**CRITICAL**: These elements MUST have `style="display: none;"` initially, otherwise they appear before JavaScript can control them.

#### JavaScript Function (lines 2175-2250)
```javascript
function showWelcomeDialog() {
  const welcomeDialog = document.getElementById('welcome-dialog');
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const welcomeInput = document.getElementById('welcome-input');
  const welcomeButton = document.getElementById('welcome-button');
  
  // Show the dialog and overlay
  welcomeDialog.style.display = 'block';
  welcomeOverlay.style.display = 'block';
  
  // Event handlers for submit...
}
```

### 3. Initialization Order
The function is called at line 4327:
```javascript
// Show welcome dialog first, then initialize room system
showWelcomeDialog();
```

This happens AFTER:
- Three.js scene is created
- Renderer is initialized
- WebGL context is established
- Mobile detection is complete

## What Breaks the Login System

### 1. ❌ Variable Scope Issues
**Problem**: Defining variables inside try/catch blocks
```javascript
// BROKEN - Variables not accessible outside try block
function showWelcomeDialog() {
  try {
    const welcomeDialog = document.getElementById('welcome-dialog');
    // ...
  } catch (error) {
    // ...
  }
  
  // ERROR: welcomeDialog is undefined here!
  welcomeDialog.addEventListener(...); 
}
```

**Solution**: Define variables at function scope
```javascript
// WORKING
function showWelcomeDialog() {
  const welcomeDialog = document.getElementById('welcome-dialog');
  const welcomeOverlay = document.getElementById('welcome-overlay');
  // Now accessible throughout the function
}
```

### 2. ❌ Variable Reference Before Definition
**Problem**: Using variables before they're defined
```javascript
// At line 1522
if (!isMobile) {  // ERROR: isMobile not defined yet!
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

// isMobile is defined later at line 1566
const isMobile = /Android|webOS|iPhone|iPad/.test(navigator.userAgent);
```

**Solution**: Use `isMobileEarly` which is defined at the beginning (line 1383)
```javascript
if (!isMobileEarly) {  // WORKS: isMobileEarly defined early
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}
```

### 3. ❌ Missing Initial Display Style
**Problem**: Dialog elements visible by default
```html
<!-- BROKEN - Dialog shows immediately on page load -->
<div class="welcome-dialog" id="welcome-dialog">
```

**Solution**: Hide initially with inline style
```html
<!-- WORKING - Hidden until JavaScript shows it -->
<div class="welcome-dialog" id="welcome-dialog" style="display: none;">
```

### 4. ❌ Over-Engineering Error Handling
**Problem**: Adding unnecessary try/catch blocks that break functionality
```javascript
// BROKEN - Too much error handling creates more problems
function showWelcomeDialog() {
  try {
    // code...
    if (!welcomeDialog) {
      initializeRoomSystem(); // Skips login entirely!
      return;
    }
  } catch (error) {
    initializeRoomSystem(); // Skips login on any error!
  }
}
```

**Solution**: Keep it simple - the working version has no try/catch
```javascript
// WORKING - Simple and reliable
function showWelcomeDialog() {
  const welcomeDialog = document.getElementById('welcome-dialog');
  welcomeDialog.style.display = 'block';
  // Simple, direct, works
}
```

## Mobile-Specific Considerations

### Touch Event Handling
The system handles both mouse and touch events to prevent double-firing:
```javascript
let touchHandled = false;

welcomeButton.addEventListener('touchstart', (e) => {
  touchHandled = true;
  e.preventDefault();
});

welcomeButton.addEventListener('click', (e) => {
  if (!touchHandled) {
    submitName();
  }
});
```

### Input Focus
Mobile devices are handled specially to prevent unwanted keyboard popup:
```javascript
setTimeout(() => {
  // Only focus on non-touch devices
  if (!('ontouchstart' in window)) {
    welcomeInput.focus();
  }
}, 100);
```

## Testing the Login System

### Quick Checks
1. **Dialog Appears**: Should see glassmorphism welcome dialog on page load
2. **Can Enter Name**: Input field should accept up to 20 characters
3. **Join Button Works**: Clicking/tapping should hide dialog and connect to room
4. **Enter Key Works**: Pressing Enter in input should submit
5. **Empty Name Allowed**: Submitting without name generates random username

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Dialog doesn't appear | JavaScript error before `showWelcomeDialog()` | Check console for errors, especially "undefined" variables |
| Dialog appears but broken | Variable scope issues | Ensure all DOM elements defined at function scope |
| Can't click Join button | Touch event conflicts | Check touchHandled flag logic |
| Dialog shows before page loads | Missing `style="display: none;"` | Add inline style to HTML elements |
| Immediate crash on load | `isMobile` referenced before definition | Use `isMobileEarly` instead |

## Best Practices

### DO ✅
- Define all DOM element variables at function scope
- Use `isMobileEarly` for early mobile detection
- Keep the function simple without unnecessary error handling
- Hide dialog elements with inline `style="display: none;"`
- Test on both desktop and mobile devices

### DON'T ❌
- Don't wrap everything in try/catch blocks
- Don't define variables inside conditional blocks
- Don't reference variables before they're defined
- Don't skip the login on error (users need names for multi-user)
- Don't modify without testing the full flow

## Code References

- **Welcome Dialog HTML**: lines 1344-1350
- **showWelcomeDialog Function**: lines 2175-2250
- **Function Call**: line 4327
- **Mobile Detection**: line 1383 (isMobileEarly), line 1566 (isMobile)
- **CSS Styles**: lines 944-1032

## Working Version Reference
The last known fully working version is from commit `4e55f9b` (August 11, 2025) with the message "Fix mobile login and make chat visible by default".

To restore if broken:
```bash
git show 4e55f9b:index.html | grep -A100 "function showWelcomeDialog"
```