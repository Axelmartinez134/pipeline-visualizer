# 📱 Mobile Testing Guide
### How to Access Your Local Development Server on Your Phone

This guide shows you how to test your pipeline visualizer on your phone without committing code to GitHub.

---

## 🚀 **Method 1: Vite Network Access (Recommended)**

### Quick Start:
```bash
# Stop current dev server (if running)
pkill -f "npm run dev"

# Start with network access
npm run dev-mobile
```

### Step-by-Step:

1. **Start the server with network access:**
   ```bash
   npm run dev-mobile
   ```
   
2. **Find your computer's IP address:**
   ```bash
   ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1
   ```
   
3. **Example output:**
   ```
   192.168.1.197
   ```

4. **Access from your phone:**
   - Connect phone to **same WiFi** as your computer
   - Open browser on phone
   - Go to: `http://YOUR_IP_ADDRESS:PORT`
   - Example: `http://192.168.1.197:3000`

### What You'll See in Terminal:
```
  VITE v7.0.5  ready in 98 ms
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.197:3000/  ← Use this URL on your phone
```

---

## 🌐 **Method 2: ngrok (Access from anywhere)**

### One-time Setup:
```bash
# Install ngrok
brew install ngrok

# Sign up at ngrok.com and get auth token
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Usage:
```bash
# In terminal 1: Start your dev server
npm run dev

# In terminal 2: Create tunnel
ngrok http 3001

# Example output:
# Forwarding: https://abc123.ngrok.io -> http://localhost:3001
```

### Benefits of ngrok:
- ✅ Access from anywhere (not just same WiFi)
- ✅ HTTPS automatically enabled
- ✅ Share with team members
- ✅ Works behind firewalls

---

## 🔧 **Method 3: Manual Vite Host Flag**

### Temporary (current session only):
```bash
npm run dev -- --host
```

### Permanent Solution:
We've added this to your `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "dev-mobile": "vite --host",  ← New script for mobile testing
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## 🛠 **Troubleshooting**

### Phone Can't Connect?

1. **Check WiFi Network:**
   ```bash
   # On computer, check your network
   networksetup -getcurrentlocation
   
   # Make sure phone is on same network
   ```

2. **Check IP Address Again:**
   ```bash
   # IP might change if you reconnect to WiFi
   ifconfig | grep "inet " | grep -v "127.0.0.1"
   ```

3. **Test Server is Running:**
   ```bash
   # Should return "200"
   curl -s -o /dev/null -w "%{http_code}" http://YOUR_IP:PORT
   ```

4. **Check Firewall (Mac):**
   - System Preferences > Security & Privacy > Firewall
   - Either disable or add Node.js to allowed apps

5. **Try Different Browsers:**
   - Safari vs Chrome on phone
   - Clear browser cache

### Common Issues:

| Problem | Solution |
|---------|----------|
| "This site can't be reached" | Check WiFi + IP address |
| Server not starting | Kill existing processes: `pkill -f vite` |
| Wrong port | Check terminal output for actual port |
| Firewall blocking | Add Node.js to firewall exceptions |

---

## 📋 **Quick Reference Commands**

### Start Mobile Testing:
```bash
npm run dev-mobile
```

### Find Your IP:
```bash
ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1
```

### Kill Dev Server:
```bash
pkill -f "npm run dev"
```

### Check What's Running:
```bash
lsof -i :3000 -i :3001 -i :3002 -i :3003
```

---

## 📱 **Testing Your Mobile Features**

Once connected, test these specific mobile features:

1. **Thought Bubble Positioning:**
   - Click Marketing/Sales/Onboarding/Fulfillment/Retention tabs
   - Verify bubbles appear in top 25% of screen
   - Check 60px spacing above pipeline

2. **Responsive Design:**
   - Test different orientations
   - Check touch interactions
   - Verify text readability

3. **Pipeline Interactions:**
   - Tap to zoom functionality
   - Slider controls
   - Animation smoothness

---

## 💡 **Pro Tips**

- **Bookmark the IP:** Save `http://192.168.1.197:3000` as bookmark on phone
- **Use Chrome DevTools:** Chrome > Developer Tools > Mobile View for quick testing
- **Keep Terminal Open:** Don't close the terminal with the running server
- **Auto-reload:** Changes save automatically and reload on phone

---

## 🔄 **For Future Projects**

Add this to any new project's `package.json`:
```json
"scripts": {
  "dev-mobile": "vite --host"
}
```

Or with custom port:
```json
"scripts": {
  "dev-mobile": "vite --host --port 3001"
}
```

---

**Created:** December 2024  
**Last Updated:** December 2024  
**Works with:** Vite, React, Vue, any web dev project 