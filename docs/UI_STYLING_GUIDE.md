# UI Styling Guide - Glassmorphism Design System

This guide documents the modern glassmorphism design system used throughout the 3D Interactive Website. Follow these guidelines to maintain visual consistency when adding or modifying UI components.

## Table of Contents
- [Design Principles](#design-principles)
- [Color Palette](#color-palette)
- [Core Styles](#core-styles)
- [Component Patterns](#component-patterns)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

## Design Principles

Our UI follows a **glassmorphism** design philosophy that creates a modern, elegant interface without obstructing the 3D scene:

1. **Transparency First**: All UI panels use semi-transparent backgrounds
2. **Backdrop Blur**: Creates the frosted glass effect
3. **Minimal Visual Weight**: Keeps focus on the 3D content
4. **Consistent Depth**: Uses subtle shadows and borders
5. **Smooth Interactions**: All hover states include transitions

## Color Palette

### Primary Colors
```css
/* White with varying opacity */
--glass-white-10: rgba(255, 255, 255, 0.1);
--glass-white-15: rgba(255, 255, 255, 0.15);
--glass-white-20: rgba(255, 255, 255, 0.2);

/* Text colors */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.8);
--text-muted: rgba(255, 255, 255, 0.5);

/* Accent color */
--accent-blue: #4a90e2;
--accent-blue-20: rgba(74, 144, 226, 0.2);
--accent-blue-30: rgba(74, 144, 226, 0.3);
--accent-blue-50: rgba(74, 144, 226, 0.5);

/* Semantic colors */
--danger-red: rgba(255, 59, 48, 0.2);
--danger-red-hover: rgba(255, 59, 48, 0.3);
```

### Background Colors
```css
/* Panel backgrounds */
--panel-bg: rgba(255, 255, 255, 0.1);
--panel-bg-hover: rgba(255, 255, 255, 0.15);

/* Overlay backgrounds */
--overlay-dark: rgba(0, 0, 0, 0.7);
--overlay-light: rgba(0, 0, 0, 0.4);
```

## Core Styles

### Glass Panel Base
Every glass panel should include these core properties:

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
```

### Glass Button
Standard button styling:

```css
.glass-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}
```

### Icon Button (Menu Style)
For icon-only buttons with tooltips:

```css
.glass-icon-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #ffffff;
  transition: all 0.3s ease;
  position: relative;
}

.glass-icon-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
```

### Input Fields
For text inputs and form elements:

```css
.glass-input {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.glass-input:focus {
  outline: none;
  border-color: rgba(74, 144, 226, 0.5);
  background: rgba(255, 255, 255, 0.15);
}

.glass-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}
```

## Component Patterns

### 1. Dialog/Modal Pattern
Used for Help Dialog, Welcome Dialog:

```css
.glass-dialog {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400px;
  max-width: 90vw;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 500;
}

/* Dark overlay behind dialog */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  z-index: 499;
}
```

### 2. Control Panel Pattern
Used for Screen Controls, Object Controls:

```css
.glass-controls {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  min-width: 200px;
}

/* Control panel heading */
.glass-controls h3 {
  color: #ffffff;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

/* Button groups within controls */
.control-group {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
```

### 3. Chat/List Pattern
Used for Chat Interface, User List:

```css
.glass-list {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* List header */
.glass-list-header {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-weight: 600;
}

/* Scrollable content */
.glass-list-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* Custom scrollbar */
.glass-list-content::-webkit-scrollbar {
  width: 6px;
}

.glass-list-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.glass-list-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
```

### 4. Tooltip Pattern
For hover hints:

```css
.tooltip {
  position: absolute;
  bottom: -35px;
  left: 50%;
  transform: translateX(-50%) scale(0);
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.3s ease;
  pointer-events: none;
}

.parent:hover .tooltip {
  transform: translateX(-50%) scale(1);
  opacity: 1;
}
```

## Implementation Examples

### Creating a New Glass Panel

```html
<!-- HTML Structure -->
<div class="my-new-panel">
  <h3>Panel Title</h3>
  <div class="panel-content">
    <button class="panel-button">Action</button>
  </div>
</div>
```

```css
/* CSS Implementation */
.my-new-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  z-index: 350;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  min-width: 240px;
}

.my-new-panel h3 {
  color: #ffffff;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.panel-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s ease;
}

.panel-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}
```

### Adding an Accent Button

```css
.accent-button {
  background: rgba(74, 144, 226, 0.2);
  border: 1px solid rgba(74, 144, 226, 0.3);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.accent-button:hover {
  background: rgba(74, 144, 226, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.3);
}
```

### Creating a Toggle Switch

```css
.glass-toggle {
  width: 50px;
  height: 26px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.glass-toggle.active {
  background: rgba(74, 144, 226, 0.3);
  border-color: rgba(74, 144, 226, 0.4);
}

.glass-toggle::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.glass-toggle.active::after {
  left: 26px;
}
```

## Best Practices

### 1. Consistency
- Always use the established color palette
- Maintain consistent padding: 20px for panels, 12px for sections
- Use 16px border-radius for panels, 10-12px for buttons
- Keep transitions at 0.3s ease for smooth interactions

### 2. Accessibility
- Ensure sufficient contrast (white text on glass backgrounds)
- Add hover states to all interactive elements
- Include focus states for keyboard navigation
- Use appropriate z-index values (300+ for UI elements)

### 3. Performance
- Limit backdrop-filter usage on mobile devices
- Group glass elements when possible to reduce render overhead
- Use transform for animations instead of position changes

### 4. Responsive Design
```css
@media (max-width: 768px) {
  .glass-panel {
    padding: 16px;
    border-radius: 12px;
  }
  
  .glass-button {
    padding: 8px 12px;
    font-size: 12px;
  }
  
  /* Adjust panel widths for mobile */
  .glass-controls {
    width: calc(100vw - 40px);
    max-width: 300px;
  }
}
```

### 5. Dark Theme Considerations
Our glassmorphism design works well on dark backgrounds. If implementing a light theme:
- Increase background opacity to 0.2-0.3
- Use dark text colors
- Adjust shadow opacity

### 6. Animation Guidelines
- Use `transform` and `opacity` for smooth animations
- Add `will-change` property for frequently animated elements
- Avoid animating backdrop-filter directly

```css
.animated-panel {
  will-change: transform, opacity;
  transition: all 0.3s ease;
}

.animated-panel.hidden {
  opacity: 0;
  transform: translateY(-10px);
}
```

## Component Library Reference

### Current Glass Components:
1. **Glass Menu** (top-left) - Icon-based navigation
2. **User List** (top-right) - Online users display
3. **Chat Interface** (bottom-right) - Messaging panel
4. **Screen Controls** - Media sharing controls
5. **Object Controls** - 3D object manipulation
6. **Help Dialog** - Information modal
7. **Welcome Dialog** - Name entry modal

### Future Component Templates:
- Settings panel
- Notification toasts
- Progress indicators
- File upload zones
- Color/theme pickers

## Maintenance Tips

When updating or adding new UI elements:

1. **Start with an existing component** as a template
2. **Use CSS variables** for colors when possible
3. **Test on multiple backgrounds** (the 3D scene varies)
4. **Verify mobile appearance** and touch interactions
5. **Check z-index layering** with other UI elements
6. **Ensure smooth transitions** for all state changes

## Example: Adding a New Feature Panel

Here's a complete example of adding a new settings panel:

```html
<div class="settings-panel" id="settings-panel" style="display: none;">
  <h3>⚙️ Settings</h3>
  
  <div class="setting-group">
    <label>Graphics Quality</label>
    <div class="button-group">
      <button class="setting-btn active">High</button>
      <button class="setting-btn">Medium</button>
      <button class="setting-btn">Low</button>
    </div>
  </div>
  
  <div class="setting-group">
    <label>Sound Effects</label>
    <div class="glass-toggle" id="sound-toggle"></div>
  </div>
  
  <button class="save-button">Save Settings</button>
</div>
```

```css
.settings-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  z-index: 350;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  width: 280px;
}

.settings-panel h3 {
  color: #ffffff;
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 8px;
}

.button-group {
  display: flex;
  gap: 4px;
}

.setting-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 8px;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.setting-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.setting-btn.active {
  background: rgba(74, 144, 226, 0.3);
  border-color: rgba(74, 144, 226, 0.4);
}

.save-button {
  width: 100%;
  background: rgba(74, 144, 226, 0.3);
  border: 1px solid rgba(74, 144, 226, 0.4);
  color: #ffffff;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-button:hover {
  background: rgba(74, 144, 226, 0.4);
  transform: translateY(-1px);
}
```

This styling guide ensures that all future UI additions maintain the same high-quality glassmorphism aesthetic that defines the modern look of the 3D Interactive Website.