import cap from '../../utils/cap';

export function POST() {
  const body = JSON.stringify(cap.createChallenge());
  return new Response(body, {
    headers: { 'Content-Type': 'application/json' },
  });
}
