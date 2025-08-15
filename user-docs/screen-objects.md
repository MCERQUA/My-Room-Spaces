# Screen Objects in 3D Models

## What are Screen Objects?

Screen objects are special 3D meshes in your room model that act as virtual display screens. These surfaces can show:
- 🖥️ Shared desktops from other users
- 📹 Video files you upload
- 🎥 Live screen captures
- 📺 Any video content

## How Screen Objects Work

### Automatic Detection
The system automatically finds screen objects in your 3D model by looking for meshes with specific names:
- `SHARESCREEN` (primary screen name)
- Any mesh containing "screen" in its name
- Any mesh containing "display" in its name

### Special Properties
When a screen object is detected, it receives:
1. **Dynamic Texture**: A real-time updating canvas texture for video content
2. **16:9 Aspect Ratio**: Maintains standard widescreen proportions
3. **Emissive Glow**: Slight glow effect to simulate a real screen
4. **Protected Processing**: Not compressed or modified during mobile optimization

## Creating Your Own Screen Objects

### In Your 3D Modeling Software

1. **Create a Plane or Box**: 
   - Width: 16 units
   - Height: 9 units
   - (Or any multiple maintaining 16:9 ratio)

2. **Name it Correctly**:
   - Recommended: `SHARESCREEN`
   - Alternative: `DisplayScreen`, `VideoScreen`, `MainScreen`
   - Must contain "screen" in the name

3. **Position and Orient**:
   - Face the screen toward where users typically view from
   - Place at comfortable viewing height
   - Ensure it's not obscured by other objects

### Example Names That Work
✅ Good screen object names:
- `SHARESCREEN`
- `MainScreen`
- `DisplayScreen01`
- `screen_wall`
- `videoscreen`

❌ Names that won't be detected:
- `Monitor` (doesn't contain "screen")
- `Display` (needs "screen" in name)
- `TV` (not recognized)

## Multiple Screens

You can have multiple screen objects in one room:

```
Room Model
├── SHARESCREEN (main screen)
├── screen_left (secondary display)
└── screen_right (another display)
```

**Note**: Currently, all detected screens will show the same content. Future updates will allow independent screen control.

## Technical Details

### Texture Specifications
- **Resolution**: 1920×1080 (Full HD)
- **Format**: Canvas-based texture
- **Update Rate**: 60 FPS when content is playing
- **Memory**: Automatically managed and cleaned up

### Material Settings
Screen objects automatically receive:
```javascript
material.map = dynamicTexture
material.emissive = 0x222222  // Slight glow
material.emissiveIntensity = 0.2
```

## Troubleshooting

### Screen Not Working?

1. **Check the Name**: 
   - Open browser console (F12)
   - Look for "Found screen object: [name]"
   - If not found, rename your mesh

2. **Verify Geometry**:
   - Must be a mesh (not a group or empty)
   - Should have proper UV mapping
   - Face normals should point outward

3. **Scale Issues**:
   - Maintain 16:9 aspect ratio
   - Avoid extremely small or large scales
   - Keep within 1-50 units size range

### Screen Shows Green Text Instead of Video?

This is the default screen texture. To display content:
1. Click the 🖥️ button in the menu
2. Choose "Share Screen" or "Load Video"
3. Content will replace the green text

## Best Practices

1. **Single Main Screen**: Have one primary SHARESCREEN for best performance
2. **Clear Naming**: Use descriptive names like `SHARESCREEN_conference`
3. **Optimal Placement**: Position screens where all users can see them
4. **Test Both Platforms**: Verify screens work on desktop and mobile
5. **Keep It Simple**: Flat planes work better than complex curved surfaces

## Examples from Current Model

The default room model (`BAKE-WEBROOM1.glb`) includes:
- **Name**: `SHARESCREEN`
- **Position**: Center wall
- **Size**: 16×9 units
- **Material**: Standard material ready for texture application

This serves as a good reference for creating your own screen objects.

## Future Features

Planned enhancements for screen objects:
- 🎮 Independent content on multiple screens
- 🎨 Customizable screen borders and frames
- 📱 Touch interaction on mobile devices
- 🔊 Spatial audio from screen position
- 💫 Screen transition effects