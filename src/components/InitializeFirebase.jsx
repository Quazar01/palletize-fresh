import React, { useState } from 'react';
import { initializeProducts } from '../firebase/productService';
import productsData from '../data/products.json';

const InitializeFirebase = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleInitialize = async () => {
    if (!window.confirm(`This will upload ${productsData.products.length} products to Firebase. Continue?`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const result = await initializeProducts(productsData.products);
      setResult(result);
      alert(`Successfully uploaded ${result.successCount} products!`);
    } catch (err) {
      setError(err.message);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Initialize Firebase Database</h1>
      <p>This will upload all products from products.json to Firebase Firestore.</p>
      <p><strong>Total products to upload: {productsData.products.length}</strong></p>
      
      <button 
        onClick={handleInitialize}
        disabled={loading}
        style={{
          padding: '12px 24px',
          backgroundColor: loading ? '#ccc' : '#5ba0a0',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginTop: '20px'
        }}
      >
        {loading ? 'Uploading...' : 'Initialize Firebase'}
      </button>

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
          <h3>Upload Complete!</h3>
          <p>✅ Successfully uploaded: {result.successCount} products</p>
          {result.errorCount > 0 && (
            <p>❌ Errors: {result.errorCount}</p>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '4px' }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <h4>⚠️ Important Notes:</h4>
        <ul>
          <li>This should only be run ONCE to initialize the database</li>
          <li>Make sure you've configured Firebase in firebaseConfig.js</li>
          <li>After initialization, you can delete this component</li>
        </ul>
      </div>
    </div>
  );
};

export default InitializeFirebase;
