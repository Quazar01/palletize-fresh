import productsData from '../data/products.json';

// Create a map of artikelnummer to box type
const productToBoxMap = new Map();

productsData.products.forEach(product => {
  productToBoxMap.set(product.id, product.type);
});

/**
 * Get the box type for a given artikelnummer
 * @param {number} artikelnummer - The product ID
 * @returns {string|null} - The box type (red, green, black, blue, half-blue, renrum) or null
 */
export const getProductBoxType = (artikelnummer) => {
  return productToBoxMap.get(artikelnummer) || null;
};

/**
 * Get all products
 * @returns {Array} - Array of all products
 */
export const getAllProducts = () => {
  return productsData.products;
};

/**
 * Check if a product exists
 * @param {number} artikelnummer - The product ID
 * @returns {boolean}
 */
export const productExists = (artikelnummer) => {
  return productToBoxMap.has(artikelnummer);
};
