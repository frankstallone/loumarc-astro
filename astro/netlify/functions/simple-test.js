export async function handler(event) {
  console.log('Simple test function triggered');
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Simple test working',
      method: event.httpMethod,
    }),
  };
}
