import Cap from '@cap.js/server';

const cap = new Cap({ tokens_store_path: '/tmp/tokens.json' });

export async function handler(event) {
  const path = event.path || '';

  if (path.endsWith('/challenge')) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    const challenge = cap.createChallenge();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(challenge),
    };
  }

  if (path.endsWith('/redeem')) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
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

  if (path.endsWith('/validate')) {
    if (event.httpMethod !== 'POST') return { statusCode: 405 };
    const { token } = JSON.parse(event.body || '{}');
    if (!token) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false }),
      };
    }

    const result = await cap.validateToken(token);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  }

  return { statusCode: 404 };
}
