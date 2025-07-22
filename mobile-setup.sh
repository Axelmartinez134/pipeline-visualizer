#!/bin/bash

# 📱 Mobile Testing Quick Setup Script
# This script automates the process of setting up mobile testing access

echo "🚀 Setting up mobile testing access..."

# Kill any existing dev servers
echo "📄 Stopping existing dev servers..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Wait a moment for processes to close
sleep 2

# Get the local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not find local IP address"
    echo "💡 Try running manually: ifconfig | grep 'inet '"
    exit 1
fi

echo "✅ Found local IP: $LOCAL_IP"

# Start the dev server with network access
echo "🌐 Starting dev server with network access..."
npm run dev-mobile &

# Wait for server to start
sleep 3

# Try to detect the port by checking common ports
PORT=""
for p in 3000 3001 3002 3003; do
    if lsof -i :$p -t >/dev/null 2>&1; then
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:$p | grep -q "200"; then
            PORT=$p
            break
        fi
    fi
done

if [ -z "$PORT" ]; then
    echo "⚠️  Could not auto-detect port. Check terminal output above."
    PORT="PORT_FROM_TERMINAL"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📱 Access from your phone:"
echo "   URL: http://$LOCAL_IP:$PORT"
echo ""
echo "📋 Make sure:"
echo "   ✅ Phone is on same WiFi as computer"
echo "   ✅ Bookmark the URL on your phone"
echo "   ✅ Test the thought bubble positioning!"
echo ""
echo "🛑 To stop the server: Ctrl+C or run 'pkill -f vite'"
echo ""

# Keep the script running so user can see the output
wait 