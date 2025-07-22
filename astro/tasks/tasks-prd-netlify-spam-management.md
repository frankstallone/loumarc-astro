# Tasks: Netlify Form Spam Management Enhancement

## Relevant Files

- `netlify/functions/submission-created.js` - Main function that handles form submissions and spam management (fully functional on production)
- `netlify/functions/cap.js` - CapJS validation service that provides the token validation endpoint
- `src/components/FormBuilder.astro` - Main contact form component with CapJS integration
- `src/components/AccessibilityForm.astro` - Accessibility form component with CapJS integration
- `README.md` - Project documentation, includes environment variable setup instructions

### Notes

- **IMPORTANT**: `submission-created` functions work on production but NOT on deploy previews (undocumented Netlify limitation)
- Environment variables must be configured in Netlify dashboard: `NETLIFY_API_TOKEN`, `URL`, and `SITE_ID` (for testing)
- Testing can be done using Netlify CLI for local development, but full form integration testing requires production deployment
- Forms use `data-netlify="true"` attribute for Netlify form handling
- CapJS widgets use `data-cap-api-endpoint="/api/"` pointing to the cap.js function
- See README for environment variable setup instructions

## Tasks

- [x] 1.0 Configure Environment and API Setup
  - [x] 1.1 Add `NETLIFY_API_TOKEN` environment variable to Netlify site settings with value `nfp_9rWHavWKGca2fR8hSnbm8Dpp21oWmckZ78fa`
  - [x] 1.2 Verify existing `URL` environment variable is properly configured for CapJS validation calls
  - [x] 1.3 Test API token permissions by making a test call to Netlify API (optional: create a temporary test function)
  - [x] 1.4 Document environment variable setup in deployment notes

- [x] 2.0 Enhance Form Submission Handler with Spam Detection
  - [x] 2.1 Modify `netlify/functions/submission-created.js` to extract submission ID from `body.payload.id`
  - [x] 2.2 Add validation to ensure submission ID exists and is in correct format before proceeding
  - [x] 2.3 Update the existing CapJS token validation logic to capture the validation result
  - [x] 2.4 Add conditional logic to trigger spam flagging when `result.valid` is false
  - [x] 2.5 Ensure the function maintains existing behavior for valid submissions (return 200 status)

- [x] 3.0 Implement Netlify API Integration for Spam Flagging
  - [x] 3.1 Create `markSubmissionAsSpam()` helper function that accepts submission ID
  - [x] 3.2 Implement PUT request to `https://api.netlify.com/api/v1/submissions/{submission_id}/spam`
  - [x] 3.3 Add proper authentication headers: `Authorization: Bearer ${process.env.NETLIFY_API_TOKEN}`
  - [x] 3.4 Set appropriate request headers: `Content-Type: application/json`
  - [x] 3.5 Configure reasonable timeout (5-10 seconds) to prevent function hanging
  - [x] 3.6 Integrate spam flagging call into the main submission handler after invalid token detection

- [x] 4.0 Add Error Handling and Logging
  - [x] 4.1 Add console.log for successful spam flagging actions with submission ID
  - [x] 4.2 Implement try-catch around Netlify API calls to handle network errors
  - [x] 4.3 Log errors for failed API calls but continue normal function execution
  - [x] 4.4 Handle specific error cases: missing submission ID, API timeout, invalid token, rate limits
  - [x] 4.5 Ensure function always returns appropriate status codes regardless of spam flagging success/failure
  - [x] 4.6 Add logging for debugging: token validation results, submission IDs processed

- [ ] 5.0 Testing and Validation
  - [x] 5.1 Test spam flagging with FormBuilder.astro form by submitting without solving CapJS (successfully tested on production - discovered deploy preview limitation)
  - [ ] 5.2 Test spam flagging with AccessibilityForm.astro form by submitting without solving CapJS
  - [ ] 5.3 Verify legitimate submissions (with valid CapJS tokens) are processed normally
  - [ ] 5.4 Test error scenarios: invalid API token, network timeouts, missing submission ID
  - [ ] 5.5 Confirm spam submissions appear in Netlify dashboard Spam section
  - [ ] 5.6 Verify email notifications are NOT sent for flagged spam submissions
  - [ ] 5.7 Test function performance to ensure responses remain under 2 seconds
  - [ ] 5.8 Validate logs are properly generated for debugging and monitoring
