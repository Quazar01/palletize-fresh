// Simple in-memory storage as fallback when Netlify Blobs isn't available
// This data resets with each function invocation
let productsCache = null;

const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Try to use Netlify Blobs if available
    try {
      const store = getStore('products');
      const productsData = await store.get('products-list', { type: 'json' });
      
      if (productsData) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(productsData),
        };
      }
    } catch (blobError) {
      console.log('Netlify Blobs not available, using fallback:', blobError.message);
    }

    // Fallback: load from products.json
    const productsJson = require('../../src/data/products.json');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(productsJson),
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
