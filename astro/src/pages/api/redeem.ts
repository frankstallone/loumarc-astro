import cap from '../../utils/cap';

export async function POST({ request }: { request: Request }) {
  const { token, solutions } = await request.json();
  if (!token || !solutions) {
    return new Response(JSON.stringify({ success: false }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await cap.redeemChallenge({ token, solutions });
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}
