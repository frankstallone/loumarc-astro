import Cap from '@cap.js/server';

const cap = new Cap({ tokens_store_path: '/tmp/tokens.json' });

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405 };
  }

  const { token, solutions } = JSON.parse(event.body || '{}');
  if (!token || !solutions) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false }),
    };
  }

  const result = await cap.redeemChallenge({ token, solutions });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  };
}
