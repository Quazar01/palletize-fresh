const { getStore } = require('@netlify/blobs');

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
    // Parse the request body
    const newProduct = JSON.parse(event.body);

    // Validate required fields
    if (!newProduct.id || !newProduct.name || !newProduct.type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: id, name, type' }),
      };
    }

    // Validate ID is a number
    if (typeof newProduct.id !== 'number' || isNaN(newProduct.id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Product ID must be a number' }),
      };
    }

    // Validate box type
    const validTypes = ['red', 'green', 'black', 'blue', 'half-blue', 'renrum'];
    if (!validTypes.includes(newProduct.type)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid box type' }),
      };
    }

    // Get the products store
    const store = getStore('products');
    
    // Retrieve current products
    let productsData = await store.get('products-list', { type: 'json' });
    
    // If no data exists, initialize with empty array
    if (!productsData) {
      productsData = { products: [] };
    }

    // Check if product ID already exists
    const existingProduct = productsData.products.find(p => p.id === newProduct.id);
    if (existingProduct) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: `Product with ID ${newProduct.id} already exists` }),
      };
    }

    // Add the new product
    const productToAdd = {
      id: newProduct.id,
      name: newProduct.name.trim(),
      type: newProduct.type,
    };

    productsData.products.push(productToAdd);

    // Sort products by ID
    productsData.products.sort((a, b) => a.id - b.id);

    // Save back to blob storage
    await store.setJSON('products-list', productsData);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Product added successfully',
        product: productToAdd 
      }),
    };
  } catch (error) {
    console.error('Error adding product:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to add product', message: error.message }),
    };
  }
};
