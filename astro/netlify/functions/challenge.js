import Cap from '@cap.js/server';

const cap = new Cap({ tokens_store_path: '/tmp/tokens.json' });

export async function handler() {
  const challenge = cap.createChallenge();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(challenge),
  };
}
