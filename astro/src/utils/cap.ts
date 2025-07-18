import Cap from '@cap.js/server';

// Singleton Cap instance shared across API endpoints
const cap = new Cap({
  tokens_store_path: '.data/tokensList.json',
});

export default cap;
