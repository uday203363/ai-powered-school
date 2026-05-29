// Gemini API Key Verification Script
// Run: node test-gemini-api.js

const apiKey = 'AIzaSyAxP3FQXYFn2BhK40b9kPS1r5gyyeNPR8Y';
const model = 'gemini-2.0-flash';

console.log('🔍 Testing Gemini API Key...');
console.log(`API Key: ${apiKey.substring(0, 20)}***`);
console.log(`Model: ${model}`);
console.log('');

const testMessage = 'Hello Gemini! If you can read this, respond with "YES - API KEY IS WORKING"';

async function testGeminiAPI() {
  try {
    console.log('📤 Sending test request...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: testMessage,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    console.log('');
    console.log('📥 Response received:');
    console.log('---');

    if (data.error) {
      console.log('❌ ERROR:');
      console.log(`   Code: ${data.error.code}`);
      console.log(`   Message: ${data.error.message}`);
      console.log('');
      console.log('❌ API KEY IS NOT WORKING!');
      console.log('');
      console.log('Possible reasons:');
      console.log('  1. API key is invalid or expired');
      console.log('  2. Gemini API is not enabled in Google Cloud');
      console.log('  3. Quota has been exceeded');
      console.log('  4. Wrong API key format');
      return false;
    } else if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const responseText = data.candidates[0].content.parts[0].text;
      console.log('✅ Response from Gemini:');
      console.log(`   "${responseText}"`);
      console.log('');
      console.log('✅ API KEY IS WORKING!');
      return true;
    } else {
      console.log('⚠️  Unexpected response format:');
      console.log(JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('');
    console.log('❌ Network Error:');
    console.log(`   ${error.message}`);
    console.log('');
    console.log('Check your internet connection or firewall settings.');
    return false;
  }
}

// Run the test
testGeminiAPI().then(success => {
  process.exit(success ? 0 : 1);
});
