export async function handler(event) {
  // This function tests the NETLIFY_API_TOKEN by listing recent submissions
  const siteId = process.env.SITE_ID; // You may need to set this in your env
  const token = process.env.NETLIFY_API_TOKEN;

  if (!siteId || !token) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: 'Missing SITE_ID or NETLIFY_API_TOKEN',
      }),
    };
  }

  try {
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/submissions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    const data = await res.json();
    return {
      statusCode: res.status,
      body: JSON.stringify({
        success: true,
        submissions: Array.isArray(data) ? data.slice(0, 3) : data,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'API call failed',
        error: err.message,
      }),
    };
  }
}
