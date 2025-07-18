import Cap from '@cap.js/server';

const cap = new Cap({ tokens_store_path: '/tmp/tokens.json' });

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405 };
  }

  const { token } = JSON.parse(event.body || '{}');
  if (!token) {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }

  const result = await cap.validateToken(token);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}
