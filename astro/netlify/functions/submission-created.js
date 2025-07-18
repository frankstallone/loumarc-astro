import Cap from '@cap.js/server';

const cap = new Cap({ tokens_store_path: '/tmp/tokens.json' });

export async function handler(event) {
  const body = JSON.parse(event.body || '{}');
  const token = body.payload?.data?.['cap-token'];

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Missing Cap token' }),
    };
  }

  const result = await cap.validateToken(token);
  if (!result.valid) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: 'Invalid Cap token' }),
    };
  }

  return { statusCode: 200 };
}
