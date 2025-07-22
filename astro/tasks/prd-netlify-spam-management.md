# Product Requirements Document: Netlify Form Spam Management Enhancement

## Introduction/Overview

This feature enhances the existing CapJS-protected Netlify form submission system to actively manage invalid submissions. Currently, when a form submission fails CapJS token validation, the system only returns a 401 status code. This enhancement will integrate with the Netlify API to automatically mark invalid submissions as spam, preventing notification emails while maintaining a clean submission dashboard.

**Problem Statement:** Despite implementing CapJS captcha protection, spam submissions are still reaching the client via email notifications. While the validation correctly identifies invalid tokens, these submissions remain in the legitimate submissions list, triggering unwanted email alerts.

**Goal:** Close the loop between CapJS validation and Netlify's submission management by automatically flagging invalid submissions as spam through the Netlify API.

## Goals

1. **Eliminate spam email notifications** to the client for invalid CapJS token submissions
2. **Maintain submission data integrity** by moving spam to the appropriate Netlify dashboard section
3. **Preserve user experience** by ensuring the enhancement doesn't affect legitimate form submissions
4. **Enable spam review capability** by marking submissions as spam rather than deleting them completely
5. **Provide operational visibility** through basic logging of spam management actions

## User Stories

**As a business owner:**

- I want to stop receiving email notifications for spam form submissions so that I only see legitimate customer inquiries
- I want spam submissions to be automatically identified and segregated so I can focus on real business opportunities
- I want the ability to review flagged submissions in case of false positives

**As a developer/administrator:**

- I want the system to automatically handle spam without manual intervention
- I want to monitor the effectiveness of spam detection through logs
- I want the system to be resilient and continue functioning even if the spam flagging fails

**As a website visitor:**

- I want my legitimate form submissions to be processed normally without any delays or errors
- I want the spam protection to be invisible to me as a legitimate user

## Functional Requirements

1. **Token Validation Integration**: The system must validate CapJS tokens for all form submissions using the existing `/api/validate` endpoint.

2. **Automatic Spam Flagging**: When a submission has an invalid or missing CapJS token, the system must automatically mark it as spam using the Netlify API.

3. **Submission ID Extraction**: The system must extract the submission ID from `body.payload.id` to target the correct submission for spam flagging.

4. **Netlify API Integration**: The system must make a PUT request to `/submissions/{submission_id}/spam` endpoint to mark submissions as spam.

5. **Authentication**: The system must authenticate with Netlify API using a personal access token stored in the `NETLIFY_API_TOKEN` environment variable.

6. **Error Resilience**: If the Netlify API call fails, the system must log the error and proceed normally (return 200 status for valid submissions, 401 for invalid ones).

7. **Universal Coverage**: The enhancement must apply to all forms that use CapJS validation (both main contact form and accessibility form).

8. **Asynchronous Processing**: Netlify API calls must be handled asynchronously to prevent function timeouts.

9. **Basic Logging**: The system must log spam flagging actions and any API call failures using console.log for debugging purposes.

10. **Graceful Degradation**: The core validation functionality must continue working even if spam flagging features fail.

## Non-Goals (Out of Scope)

1. **Complete Deletion**: This feature will not permanently delete spam submissions (marking as spam is preferred for review capability)
2. **Advanced Analytics**: No detailed metrics, dashboards, or reporting beyond basic console logging
3. **Retroactive Processing**: No processing of existing spam submissions, only new submissions going forward
4. **Custom Spam Rules**: No additional spam detection logic beyond CapJS token validation
5. **Email Integration**: No direct integration with email systems (relies on Netlify's existing email notification behavior)
6. **Rate Limiting**: No rate limiting or throttling of API calls (assuming normal form submission volumes)
7. **Retry Logic**: No automatic retry mechanisms for failed API calls (single attempt only)

## Design Considerations

- **API Endpoint**: Use Netlify's REST API v1 (`https://api.netlify.com/api/v1/submissions/{submission_id}/spam`)
- **HTTP Method**: PUT request to mark as spam
- **Headers**: Include `Authorization: Bearer {token}` and `Content-Type: application/json`
- **Response Handling**: Accept 200/204 responses as success, log others as errors
- **Timeout**: Use reasonable timeout (5-10 seconds) to prevent function hanging

## Technical Considerations

1. **Environment Variables**:
   - `NETLIFY_API_TOKEN`: Personal access token for Netlify API (provided: `nfp_9rWHavWKGca2fR8hSnbm8Dpp21oWmckZ78fa`)
   - `URL`: Existing environment variable for base URL

2. **Dependencies**:
   - Uses existing `fetch` for HTTP requests (no additional dependencies required)
   - Integrates with existing CapJS validation flow

3. **Error Handling**:
   - Network timeouts: Log error, proceed with normal response
   - Invalid API token: Log error, proceed with normal response
   - Missing submission ID: Log error, proceed with normal response
   - API rate limits: Log error, proceed with normal response

4. **Security**:
   - API token must be stored as environment variable, never in code
   - Validate submission ID format before making API calls
   - Ensure proper error messages don't expose sensitive information

5. **Performance**:
   - API calls should not block the main validation response
   - Consider function timeout limits (10 seconds default for Netlify functions)

## Success Metrics

1. **Email Reduction**: Zero spam email notifications sent to the client for submissions with invalid CapJS tokens
2. **Submission Organization**: All invalid token submissions appear in Netlify's Spam dashboard section
3. **System Reliability**: 99%+ uptime for form validation functionality regardless of spam flagging status
4. **Response Time**: Form validation responses remain under 2 seconds including spam flagging
5. **Error Rate**: Less than 5% of legitimate submissions incorrectly flagged (monitor through Netlify Spam section)

## Open Questions

1. **API Rate Limits**: What are Netlify's API rate limits and do we need to implement throttling for high-volume periods?

2. **Submission Timing**: Is there a race condition where the API call to mark as spam happens before Netlify has fully processed the submission?

3. **Token Permissions**: Does the provided API token have sufficient permissions for the submissions spam endpoint?

4. **Monitoring**: Should we implement any alerting if spam flagging consistently fails (indicating API issues)?

5. **Testing**: How should we test this feature without generating actual spam in the production dashboard?

## Implementation Notes

- Start with the existing `submission-created.js` function
- Add the spam flagging logic after the existing CapJS validation
- Test with both `FormBuilder.astro` and `AccessibilityForm.astro` forms
- Ensure compatibility with the existing CapJS widget implementations
- Validate the enhancement works with the current form submission flow
