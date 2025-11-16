const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get the products store
    const store = getStore('products');
    
    // Retrieve products from blob storage
    const productsData = await store.get('products-list', { type: 'json' });
    
    // If no data exists yet, return empty array
    if (!productsData) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ products: [] }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(productsData),
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch products', message: error.message }),
    };
  }
};
