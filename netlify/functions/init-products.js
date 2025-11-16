const { getStore } = require('@netlify/blobs');
const productsJson = require('../../src/data/products.json');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get the products store
    const store = getStore('products');
    
    // Check if products already exist in blob storage
    const existingData = await store.get('products-list', { type: 'json' });
    
    if (existingData && existingData.products && existingData.products.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          message: 'Products already initialized',
          count: existingData.products.length 
        }),
      };
    }

    // Initialize with products from products.json
    await store.setJSON('products-list', productsJson);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Products initialized successfully',
        count: productsJson.products.length 
      }),
    };
  } catch (error) {
    console.error('Error initializing products:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to initialize products', message: error.message }),
    };
  }
};
