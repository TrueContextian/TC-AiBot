// Simple test script to verify the AI bot is working
const fetch = require('node-fetch');

async function testChat() {
  console.log('Testing TrueContext AI Bot API...\n');

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'What is TrueContext Teamwork?'
          }
        ]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error response:', error);
      return;
    }

    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('\nStreaming response:\n');

    // Read the streaming response
    const reader = response.body;
    let fullResponse = '';

    for await (const chunk of reader) {
      const text = chunk.toString();
      fullResponse += text;
      process.stdout.write(text);
    }

    console.log('\n\n✅ API is working correctly!');
    console.log('Response length:', fullResponse.length, 'bytes');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testChat();
