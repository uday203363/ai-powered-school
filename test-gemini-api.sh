#!/bin/bash
# Gemini API Key Verification Script

# Load environment variables
API_KEY="AIzaSyAxP3FQXYFn2BhK40b9kPS1r5gyyeNPR8Y"
MODEL="gemini-2.0-flash"

echo "🔍 Testing Gemini API Key..."
echo "API Key: ${API_KEY:0:20}***"
echo "Model: $MODEL"
echo ""

# Test API call
RESPONSE=$(curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello, respond with YES if you can read this"
      }]
    }]
  }')

echo "Response:"
echo "$RESPONSE" | head -20

# Check if response contains error
if echo "$RESPONSE" | grep -q "error"; then
  echo ""
  echo "❌ ERROR DETECTED!"
  echo "$RESPONSE" | grep -i "error"
  exit 1
else
  echo ""
  echo "✅ API KEY IS WORKING!"
  exit 0
fi
