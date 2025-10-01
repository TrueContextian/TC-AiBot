// Test Anthropic API directly
require('dotenv').config();
const { anthropic } = require('@ai-sdk/anthropic');
const { streamText } = require('ai');

async function test() {
  console.log('Testing Anthropic API...');
  console.log('API Key set:', !!process.env.ANTHROPIC_API_KEY);
  console.log('API Key starts with:', process.env.ANTHROPIC_API_KEY?.substring(0, 15));

  try {
    const result = streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      messages: [
        { role: 'user', content: 'Say hello!' }
      ],
    });

    const response = await result.toDataStreamResponse();
    console.log('\n✅ API call successful!');
    console.log('Response status:', response.status);
    console.log('Response type:', response.headers.get('content-type'));

    // Read response body
    const text = await response.text();
    console.log('\nResponse preview:', text.substring(0, 200));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

test();
