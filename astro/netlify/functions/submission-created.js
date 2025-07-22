export async function handler(event) {
  try {
    console.log('🚨 submission-created function triggered!', {
      method: event.httpMethod,
      headers: event.headers,
    });

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw body:', event.body);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Invalid JSON in request body',
        }),
      };
    }

    const token = body.payload?.data?.['cap-token'];
    const submissionId = body.payload?.id; // Extract submission ID for later use

    if (
      !submissionId ||
      typeof submissionId !== 'string' ||
      !submissionId.trim()
    ) {
      console.warn(`[Debug] Missing or invalid submission ID:`, submissionId);
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: 'Missing or invalid submission ID',
        }),
      };
    }

    if (!token) {
      console.warn(
        `[Debug] Missing Cap token for submission ID: ${submissionId}`,
      );
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Missing Cap token' }),
      };
    }

    let validationResult = { valid: false };
    try {
      const res = await fetch(`${process.env.URL}/api/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      validationResult = await res.json();
      console.log(
        `[Debug] Submission ID: ${submissionId}, CapJS token validation result:`,
        validationResult,
      );
      if (!validationResult.valid) {
        // Trigger spam flagging asynchronously
        markSubmissionAsSpam(submissionId).catch((err) => {
          console.error('Failed to mark submission as spam:', err);
        });
        return {
          statusCode: 401,
          body: JSON.stringify({
            success: false,
            message: 'Invalid Cap token',
          }),
        };
      }
    } catch (err) {
      console.error(
        `[Debug] Validation failed for submission ID: ${submissionId}`,
        err,
      );
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, message: 'Validation failed' }),
      };
    }

    // validationResult is now available for later use
    console.log(`[Debug] Submission processed successfully: ${submissionId}`);
    return { statusCode: 200 };
  } catch (error) {
    console.error('FUNCTION CRASH:', error);
    console.error('Error stack:', error.stack);
    console.error('Event object:', JSON.stringify(event, null, 2));
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Function crashed',
        error: error.message,
      }),
    };
  }
}

// Helper for spam flagging logic
async function markSubmissionAsSpam(submissionId) {
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    console.error('NETLIFY_API_TOKEN is not set');
    return;
  }
  const url = `https://api.netlify.com/api/v1/submissions/${submissionId}/spam`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      console.log(`[SpamFlag] Submission ${submissionId} marked as spam.`);
    } else {
      const text = await res.text();
      console.error(`Failed to mark submission as spam: ${res.status} ${text}`);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Spam flagging request timed out');
    } else {
      console.error('Error marking submission as spam:', err);
    }
  }
}
