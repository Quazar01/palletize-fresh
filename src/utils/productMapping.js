import productsData from '../data/products.json';
import { getProducts } from '../firebase/productService';

// Create a map of artikelnummer to box type
let productToBoxMap = new Map();
let isFirebaseLoaded = false;
let firebaseLoadPromise = null;

// Initialize with static products data
productsData.products.forEach(product => {
  productToBoxMap.set(product.id, product.type);
});

/**
 * Load products from Firebase and update the map
 * @returns {Promise<void>}
 */
const loadProductsFromFirebase = async () => {
  if (isFirebaseLoaded) return;
  
  if (!firebaseLoadPromise) {
    firebaseLoadPromise = (async () => {
      try {
        const firebaseProducts = await getProducts();
        // Clear the map and reload with Firebase data
        productToBoxMap.clear();
        firebaseProducts.forEach(product => {
          productToBoxMap.set(product.id, product.type);
        });
        isFirebaseLoaded = true;
        console.log('Products loaded from Firebase:', firebaseProducts.length);
      } catch (error) {
        console.error('Failed to load products from Firebase, using static data:', error);
        // Keep using static data if Firebase fails
      }
    })();
  }
  
  return firebaseLoadPromise;
};

// Start loading immediately
loadProductsFromFirebase();

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
  return Array.from(productToBoxMap.entries()).map(([id, type]) => ({ id, type }));
};

/**
 * Check if a product exists
 * @param {number} artikelnummer - The product ID
 * @returns {boolean}
 */
export const productExists = (artikelnummer) => {
  return productToBoxMap.has(artikelnummer);
};

/**
 * Reload products from Firebase (useful after adding new products)
 * @returns {Promise<void>}
 */
export const reloadProducts = async () => {
  isFirebaseLoaded = false;
  firebaseLoadPromise = null;
  await loadProductsFromFirebase();
};
