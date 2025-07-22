export async function handler(event) {
  console.log('submission-created triggered');
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'submission-created working',
      method: event.httpMethod,
    }),
  };
}
