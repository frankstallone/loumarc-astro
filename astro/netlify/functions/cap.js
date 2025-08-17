/**
 * @fileoverview Netlify serverless function for CAPTCHA challenge management using @cap.js/server.
 *
 * This function provides three main endpoints for CAPTCHA functionality:
 * - /challenge: Creates a new CAPTCHA challenge
 * - /redeem: Redeems a completed CAPTCHA challenge
 * - /validate: Validates an existing CAPTCHA token
 *
 * The function uses the @cap.js/server library to handle CAPTCHA operations
 * and stores tokens in a temporary file at /tmp/tokens.json.
 *
 * @module netlify/functions/cap
 * @requires @cap.js/server
 */

import Cap from '@cap.js/server';

/**
 * CAPTCHA server instance configured with temporary token storage.
 * @type {Cap}
 */
const cap = new Cap({ tokens_store_path: '/tmp/tokens.json' });

/**
 * Netlify serverless function handler for CAPTCHA operations.
 *
 * This function routes requests to different CAPTCHA endpoints based on the URL path:
 * - `/challenge`: Creates a new CAPTCHA challenge for client-side rendering
 * - `/redeem`: Processes completed CAPTCHA solutions and returns validation results
 * - `/validate`: Validates existing CAPTCHA tokens
 *
 * All endpoints require POST requests and return JSON responses with appropriate HTTP status codes.
 *
 * @async
 * @function handler
 * @param {Object} event - Netlify function event object
 * @param {string} [event.path] - The request path (e.g., '/challenge', '/redeem', '/validate')
 * @param {string} event.httpMethod - The HTTP method of the request
 * @param {string} [event.body] - The request body as a JSON string
 * @returns {Promise<Object>} Netlify function response object
 * @returns {number} returns.statusCode - HTTP status code (200, 400, 404, 405)
 * @returns {Object} [returns.headers] - Response headers (Content-Type: application/json)
 * @returns {string} [returns.body] - JSON stringified response body
 *
 * @example
 * // Create a new CAPTCHA challenge
 * // URL: /api/challenge
 * // Method: POST
 * // Request Body: None
 * // Response: { statusCode: 200, headers: {...}, body: '{"token":"...","challenge":"..."}' }
 *
 * @example
 * // Redeem a completed challenge
 * // URL: /api/redeem
 * // Method: POST
 * // Request Body: {"token":"abc123","solutions":["answer1","answer2"]}
 * // Response: { statusCode: 200, headers: {...}, body: '{"success":true}' }
 *
 * @example
 * // Validate an existing token
 * // URL: /api/validate
 * // Method: POST
 * // Request Body: {"token":"abc123"}
 * // Response: { statusCode: 200, headers: {...}, body: '{"valid":true}' }
 */
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
