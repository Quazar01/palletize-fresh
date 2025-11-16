import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where,
  orderBy,
  doc,
  setDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const PRODUCTS_COLLECTION = 'products';

/**
 * Fetch all products from Firebase
 * @returns {Promise<Array>} Array of products
 */
export const getProducts = async () => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = query(productsRef, orderBy('id', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({ ...doc.data(), docId: doc.id });
    });
    
    // Custom sort: IDs starting with 47 go to the end
    products.sort((a, b) => {
      const aStartsWith47 = a.id.toString().startsWith('47');
      const bStartsWith47 = b.id.toString().startsWith('47');
      
      // If one starts with 47 and the other doesn't, put the 47 one at the end
      if (aStartsWith47 && !bStartsWith47) return 1;
      if (!aStartsWith47 && bStartsWith47) return -1;
      
      // Otherwise, sort by ID ascending
      return a.id - b.id;
    });
    
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error('Failed to fetch products: ' + error.message);
  }
};

/**
 * Add a new product to Firebase
 * @param {Object} product - Product object with id, name, and type
 * @returns {Promise<Object>} The added product
 */
export const addProduct = async (product) => {
  try {
    // Validate required fields
    if (!product.id || !product.name || !product.type) {
      throw new Error('Missing required fields: id, name, type');
    }

    // Check if product ID already exists
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = query(productsRef, where('id', '==', product.id));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      throw new Error(`Product with ID ${product.id} already exists`);
    }

    // Add the product using the numeric ID as the document ID
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id.toString());
    await setDoc(docRef, {
      id: product.id,
      name: product.name.trim(),
      type: product.type,
      createdAt: new Date().toISOString()
    });

    return {
      id: product.id,
      name: product.name.trim(),
      type: product.type
    };
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

/**
 * Initialize Firebase with products from JSON (one-time operation)
 * @param {Array} products - Array of products to upload
 * @returns {Promise<Object>} Result object with success count
 */
export const initializeProducts = async (products) => {
  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const product of products) {
      try {
        const docRef = doc(db, PRODUCTS_COLLECTION, product.id.toString());
        await setDoc(docRef, {
          id: product.id,
          name: product.name,
          type: product.type,
          createdAt: new Date().toISOString()
        });
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({ product, error: error.message });
        console.error(`Error adding product ${product.id}:`, error);
      }
    }

    return {
      success: true,
      successCount,
      errorCount,
      errors
    };
  } catch (error) {
    console.error('Error initializing products:', error);
    throw new Error('Failed to initialize products: ' + error.message);
  }
};
