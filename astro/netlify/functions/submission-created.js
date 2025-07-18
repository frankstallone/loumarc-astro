export async function handler(event) {
  const body = JSON.parse(event.body || '{}');
  const token = body.payload?.data?.['cap-token'];

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: 'Missing Cap token' }),
    };
  }

  try {
    const res = await fetch(`${process.env.URL}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const result = await res.json();
    if (!result.valid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: 'Invalid Cap token' }),
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Validation failed' }),
    };
  }

  return { statusCode: 200 };
}
