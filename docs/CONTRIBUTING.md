# 🤝 Contributing Guide

Thank you for your interest in contributing to the Self-Hosted Multi-user 3D World Website! This guide will help you get started.

## 🌟 Ways to Contribute

### 🐛 Bug Reports
- Report issues you encounter
- Provide detailed reproduction steps
- Include browser and system information

### ✨ Feature Requests
- Suggest new features for the 3D world
- Propose UI/UX improvements
- Share ideas for multi-user enhancements

### 💻 Code Contributions
- Fix bugs and issues
- Implement new features
- Improve performance and optimization
- Add documentation and examples

### 📚 Documentation
- Improve existing documentation
- Add tutorials and guides
- Create video demonstrations
- Translate documentation

### 🎨 Design and Assets
- Create 3D models for the world
- Design UI improvements
- Create promotional materials
- Develop themes and customizations

## 🛠️ Development Setup

### Prerequisites

```bash
# Required software
Node.js 18+
Git
Modern web browser (Chrome recommended)
Code editor (VS Code recommended)
```

### Local Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/3D-threejs-site.git
   cd 3D-threejs-site
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1 - Backend server
   npm run dev
   
   # Terminal 2 - Frontend (if using live server)
   npm start
   # OR open index.html in browser and navigate to localhost:8080
   ```

4. **Test multi-user features:**
   - Open multiple browser tabs to `http://localhost:8080`
   - Verify users can see each other
   - Test chat, screen sharing, and object manipulation

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/amazing-feature

# 2. Make your changes
# Edit files...

# 3. Test your changes
npm run dev  # Start backend
# Test in browser

# 4. Commit changes
git add .
git commit -m "Add amazing feature

- Feature does X
- Improves Y
- Fixes Z"

# 5. Push and create PR
git push origin feature/amazing-feature
# Open pull request on GitHub
```

## 📁 Project Structure

### Key Files

```
├── index.html              # Main frontend application (2400+ lines)
├── signaling-server.js     # Backend server (350+ lines)
├── package.json            # Dependencies and scripts
├── netlify.toml           # Frontend deployment config
└── docs/                  # Documentation
    ├── SETUP.md
    ├── USER_GUIDE.md
    └── ...
```

### Code Organization

**Frontend (index.html):**
```javascript
// 1. HTML Structure (lines 1-600)
// 2. CSS Styles (lines 600-800)  
// 3. JavaScript Application (lines 800-2400)
//    - 3D Scene Setup
//    - Multi-user System
//    - Screen Sharing
//    - Chat System
//    - Object Manipulation
```

**Backend (signaling-server.js):**
```javascript
// 1. Dependencies and Setup (lines 1-50)
// 2. World State Management (lines 50-100)
// 3. Socket.IO Event Handlers (lines 100-300)
// 4. API Endpoints (lines 300-350)
```

## 🎯 Contribution Guidelines

### Code Style

**JavaScript:**
```javascript
// Use clear, descriptive variable names
const userAvatars = new Map();
const SIGNALING_SERVER = 'https://...';

// Add comments for complex logic
function updateAvatarLabel(userId, newName) {
  // Update the canvas texture with new name
  const canvas = document.createElement('canvas');
  // ...
}

// Use consistent indentation (2 spaces)
if (condition) {
  doSomething();
}
```

**Console Logging:**
```javascript
// Use emoji prefixes for different log types
console.log('🔧 Debug info');
console.log('✅ Success message');
console.log('❌ Error occurred');
console.log('📝 User action');
console.log('🧑‍🤝‍🧑 Multi-user event');
```

### Git Commit Messages

**Format:**
```
<type>: <description>

<optional body>

<optional footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code changes that neither fix bugs nor add features
- `perf:` Performance improvements
- `test:` Adding or modifying tests
- `chore:` Other changes (build tools, etc.)

**Examples:**
```bash
feat: add voice chat functionality

- Implement WebRTC audio streaming
- Add microphone controls to UI
- Update user avatars with speaking indicators

fix: resolve screen sharing connection issues

- Fix WebRTC peer connection establishment
- Handle edge cases in offer/answer exchange
- Add better error handling for connection failures

docs: update setup guide with Railway v2 instructions

- Add new environment variable configuration
- Update deployment screenshots
- Fix broken links to Railway dashboard
```

### Pull Request Process

1. **Create descriptive PR title:**
   ```
   Add real-time voice chat feature
   Fix mobile touch controls on iOS
   Update documentation for new API endpoints
   ```

2. **Fill out PR template:**
   ```markdown
   ## What does this PR do?
   Brief description of changes

   ## How to test
   Step-by-step testing instructions

   ## Screenshots/GIFs
   Visual evidence of changes (if applicable)

   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Manual testing completed
   - [ ] Documentation updated (if needed)
   ```

3. **Ensure code quality:**
   - No console errors in browser
   - Features work in multiple browsers
   - Mobile compatibility maintained
   - Documentation updated if needed

4. **Request review:**
   - Tag relevant maintainers
   - Respond to feedback promptly
   - Make requested changes

## 🚀 Feature Development

### Adding New Features

**Planning phase:**
1. **Open GitHub issue** to discuss the feature
2. **Get feedback** from maintainers and community
3. **Design the implementation** approach
4. **Consider backward compatibility**

**Implementation phase:**
1. **Create feature branch** from main
2. **Implement core functionality** 
3. **Add error handling** and edge cases
4. **Test multi-user scenarios**
5. **Update documentation**

**Example - Adding Voice Chat:**

```javascript
// 1. Add UI controls
const voiceChatButton = document.createElement('button');
voiceChatButton.textContent = '🎤 Voice Chat';

// 2. Implement WebRTC audio
async function startVoiceChat() {
  const audioStream = await navigator.mediaDevices.getUserMedia({audio: true});
  // Handle audio streaming...
}

// 3. Add server-side coordination
socket.on('voice-chat-start', (data) => {
  // Handle voice chat coordination
});

// 4. Test with multiple users
// 5. Update documentation
```

### Testing Guidelines

**Manual Testing Checklist:**

**Single User:**
- [ ] 3D world loads correctly
- [ ] Camera controls work (WASD + mouse)
- [ ] Objects can be loaded and manipulated
- [ ] UI elements respond properly

**Multi-User (2+ browser tabs):**
- [ ] Users can see each other's avatars
- [ ] Real-time movement synchronization works
- [ ] Chat messages sync between users
- [ ] Object manipulations sync to all users
- [ ] Screen sharing works between users

**Cross-Browser:**
- [ ] Chrome - Full functionality
- [ ] Firefox - Full functionality  
- [ ] Safari - Basic functionality (no screen sharing)
- [ ] Mobile Chrome - Touch controls work

**Performance:**
- [ ] No memory leaks after extended use
- [ ] Frame rate remains stable
- [ ] Multiple users don't degrade performance significantly

### Security Considerations

**Frontend Security:**
- Validate all user inputs
- Sanitize chat messages
- Don't expose sensitive configuration
- Use HTTPS in production

**Backend Security:**
- Validate all Socket.IO event data
- Implement rate limiting for production
- Sanitize user-generated content
- Use environment variables for sensitive data

**Example - Input Validation:**
```javascript
// Client-side validation
function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message || message.length > 200) {
    return; // Reject invalid messages
  }
  // Send valid message...
}

// Server-side validation
socket.on('chat-message', (data) => {
  if (!data.message || typeof data.message !== 'string' || data.message.length > 200) {
    return; // Reject invalid data
  }
  // Process valid message...
});
```

## 🎨 Design Guidelines

### UI/UX Principles

1. **Keep it simple:** Prioritize ease of use over complexity
2. **Mobile-first:** Ensure touch-friendly interfaces
3. **Accessibility:** Support keyboard navigation and screen readers
4. **Performance:** Maintain smooth 60fps in 3D world
5. **Cross-platform:** Work across different browsers and devices

### Visual Design

**Color Scheme:**
```css
:root {
  --primary-color: #4CAF50;    /* Green for interactive elements */
  --secondary-color: #2196F3;  /* Blue for information */
  --warning-color: #FF9800;    /* Orange for warnings */
  --error-color: #F44336;      /* Red for errors */
  --background-dark: #1a1a1a;  /* Dark theme background */
  --text-light: #ffffff;       /* Light text */
}
```

**Typography:**
- Use system fonts for performance
- Maintain readable font sizes (14px minimum)
- Ensure good contrast ratios

**3D World Design:**
- Professional lighting setup
- Realistic shadows and materials
- Consistent object scaling
- Clear visual hierarchy

## 📋 Issue Templates

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug.

**Environment**
- Browser: [Chrome 96, Firefox 94, etc.]
- OS: [Windows 11, macOS 12, etc.]
- Device: [Desktop, iPhone 12, etc.]

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**  
What actually happened.

**Console Errors**
```
Paste any console error messages
```

**Screenshots**
Add screenshots if applicable.

**Additional Context**
Any other context about the problem.
```

### Feature Request Template

```markdown
**Feature Description**
Clear description of the feature you'd like to see.

**Use Case**
Explain why this feature would be useful.

**Proposed Implementation**
Ideas for how this could be implemented.

**Alternatives Considered**
Other solutions you've considered.

**Additional Context**
Any other context or screenshots.
```

## 🎖️ Recognition

### Contributors

All contributors are recognized in:
- GitHub contributors page
- Project README credits
- Release notes for their contributions

### How to Get Recognized

1. **Make meaningful contributions** (code, docs, design, etc.)
2. **Help others** in issues and discussions
3. **Share the project** with your network
4. **Provide feedback** and suggestions

## 📞 Getting Help

### Development Questions

- **GitHub Discussions** - Ask questions and share ideas
- **GitHub Issues** - Report bugs and request features  
- **Code Review** - Get feedback on your contributions

### Real-Time Help

- **Discord/Slack** - (To be set up based on community size)
- **Video Calls** - Available for major feature discussions

### Documentation

- **Setup Guide** - [docs/SETUP.md](SETUP.md)
- **Architecture Overview** - [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- **API Reference** - [docs/API.md](API.md)
- **User Guide** - [docs/USER_GUIDE.md](USER_GUIDE.md)

## 🎉 Thank You!

Every contribution helps make this 3D world better for everyone. Whether you:

- Fix a typo in documentation
- Report a bug you encountered  
- Implement a major new feature
- Help other users in discussions
- Share the project with friends

**You're making a difference!** 

Welcome to our community of 3D world builders! 🌟

---

*Happy coding and world building!* 🚀