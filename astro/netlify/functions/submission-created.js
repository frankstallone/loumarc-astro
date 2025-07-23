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
      // Trigger spam flagging for missing token (wait for completion)
      try {
        await markSubmissionAsSpam(submissionId);
      } catch (err) {
        console.error(
          'Failed to mark submission as spam (missing token):',
          err,
        );
      }
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
        // Trigger spam flagging (wait for completion)
        try {
          await markSubmissionAsSpam(submissionId);
        } catch (err) {
          console.error('Failed to mark submission as spam:', err);
        }
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
  console.log(
    `[SpamFlag] Starting spam flagging process for submission: ${submissionId}`,
  );

  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    console.error(
      '[SpamFlag] NETLIFY_API_TOKEN is not set in environment variables',
    );
    return;
  }
  console.log(
    `[SpamFlag] API token available, length: ${token.length} characters`,
  );

  const url = `https://api.netlify.com/api/v1/submissions/${submissionId}/spam`;
  console.log(`[SpamFlag] Making API call to: ${url}`);

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

    console.log(`[SpamFlag] API response status: ${res.status}`);

    if (res.ok) {
      console.log(
        `[SpamFlag] SUCCESS: Submission ${submissionId} marked as spam.`,
      );
    } else {
      const text = await res.text();
      console.error(`[SpamFlag] FAILED: ${res.status} - ${text}`);
    }
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      console.error('[SpamFlag] ERROR: Request timed out after 5 seconds');
    } else {
      console.error('[SpamFlag] ERROR: Network or other error:', err.message);
      console.error('[SpamFlag] ERROR Stack:', err.stack);
    }
  }
}
