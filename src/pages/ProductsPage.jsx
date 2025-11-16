import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, addProduct } from '../firebase/productService';
import './ProductsPage.css';

const ProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({
    id: '',
    name: '',
    type: 'red'
  });
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const boxTypes = ['red', 'green', 'black', 'blue', 'half-blue', 'renrum'];
  
  // Map internal values to Swedish display names
  const boxTypeLabels = {
    'red': 'RÖD',
    'green': 'GRÖN',
    'black': 'SVART',
    'blue': 'BLÅ',
    'half-blue': 'HALF-BLUE',
    'renrum': 'RENRUM'
  };

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setErrorMessage('Failed to load products: ' + error.message);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: name === 'id' ? (value === '' ? '' : parseInt(value)) : value
    }));
  };

  const validateProduct = () => {
    // Check if ID is provided
    if (!newProduct.id || newProduct.id === '') {
      setErrorMessage('Product ID is required');
      return false;
    }

    // Check if ID is a valid number
    if (isNaN(newProduct.id)) {
      setErrorMessage('Product ID must be a number');
      return false;
    }

    // Check if name is provided
    if (!newProduct.name || newProduct.name.trim() === '') {
      setErrorMessage('Product name is required');
      return false;
    }

    return true;
  };

  const handleAddProduct = async () => {
    setShowError(false);
    setErrorMessage('');

    if (!validateProduct()) {
      setShowError(true);
      return;
    }

    try {
      // Add product to Firebase
      const addedProduct = await addProduct({
        id: parseInt(newProduct.id),
        name: newProduct.name.trim(),
        type: newProduct.type,
      });

      // Refresh products list
      await fetchProducts();

      // Clear the form
      setNewProduct({
        id: '',
        name: '',
        type: 'red'
      });

      alert(`Product ${addedProduct.id} - ${addedProduct.name} added successfully!`);
    } catch (error) {
      console.error('Error adding product:', error);
      setErrorMessage(error.message || 'Failed to add product. Please try again.');
      setShowError(true);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="products-page">
      <div className="products-header">
        <button onClick={handleGoBack} className="back-button">
          ← Tillbaka
        </button>
        <h1>Produkthantering</h1>
      </div>

      {showError && (
        <div className="error-banner">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setShowError(false)} className="close-banner">×</button>
        </div>
      )}

      <div className="products-content">
        {/* Add Product Form */}
        <div className="add-product-section">
          <h2>Lägg till produkt</h2>
          <div className="product-form">
            <div className="form-group">
              <label>Produkt-ID:</label>
              <input
                type="number"
                name="id"
                value={newProduct.id}
                onChange={handleInputChange}
                placeholder="t.ex. 1234"
              />
            </div>
            <div className="form-group">
              <label>Produktnamn:</label>
              <input
                type="text"
                name="name"
                value={newProduct.name}
                onChange={handleInputChange}
                placeholder="t.ex. Produkt A"
              />
            </div>
            <div className="form-group">
              <label>Back:</label>
              <select
                name="type"
                value={newProduct.type}
                onChange={handleInputChange}
              >
                {boxTypes.map(type => (
                  <option key={type} value={type}>
                    {boxTypeLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleAddProduct} className="add-btn">
              Lägg till produkt
            </button>
          </div>
        </div>

        {/* Products List */}
        <div className="products-list-section">
          <h2>Produktlista ({products.length} produkter)</h2>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Laddar produkter...</p>
            </div>
          ) : (
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Namn</th>
                    <th>Back</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>{product.name}</td>
                      <td>
                        <span className={`box-type-badge ${product.type}`}>
                          {boxTypeLabels[product.type] || product.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
