import { getBoxType, COMBO_PALLET } from './constants';
import { getProductBoxType } from './productMapping';

/**
 * Calculate full pallets and remaining boxes for a product
 * @param {number} artikelnummer - Product ID
 * @param {number} boxCount - Number of boxes ordered
 * @returns {Object} - { fullPallets, remainingBoxes, boxType, boxConfig }
 */
export const calculatePallets = (artikelnummer, boxCount) => {
  const boxTypeName = getProductBoxType(artikelnummer);
  
  if (!boxTypeName) {
    console.warn(`Unknown product: ${artikelnummer}`);
    return null;
  }

  const boxConfig = getBoxType(boxTypeName);
  
  if (!boxConfig) {
    console.warn(`Unknown box type: ${boxTypeName}`);
    return null;
  }

  const fullPallets = Math.floor(boxCount / boxConfig.fullPalletBoxes);
  const remainingBoxes = boxCount % boxConfig.fullPalletBoxes;

  return {
    artikelnummer,
    fullPallets,
    remainingBoxes,
    boxType: boxTypeName,
    boxConfig,
    totalBoxes: boxCount,
  };
};

/**
 * Calculate stack height for a skvettpall
 * @param {number} boxCount - Number of boxes in the skvettpall
 * @param {Object} boxConfig - Box configuration
 * @returns {number} - Stack height (rows)
 */
export const calculateStackHeight = (boxCount, boxConfig) => {
  return Math.ceil(boxCount / boxConfig.boxesPerRow);
};

/**
 * Check if skvettpall should go to mix-pall (less than one row)
 * @param {number} boxCount - Number of boxes
 * @param {Object} boxConfig - Box configuration
 * @returns {boolean}
 */
export const shouldGoToMixPall = (boxCount, boxConfig) => {
  return boxCount < boxConfig.boxesPerRow;
};

/**
 * Calculate height of a skvettpall in red box units
 * @param {number} boxCount - Number of boxes
 * @param {Object} boxConfig - Box configuration
 * @returns {number} - Height in red box units
 */
export const calculateSkvettpallHeight = (boxCount, boxConfig) => {
  const stackHeight = calculateStackHeight(boxCount, boxConfig);
  // Pallet (1 red unit) + stack height * box height in red units
  return COMBO_PALLET.PALLET_HEIGHT_RED_UNITS + (stackHeight * boxConfig.heightInRedBoxUnits);
};

/**
 * Process an order from Excel data
 * @param {Array} orderData - Array of { artikelnummer, beställdaDFP }
 * @returns {Object} - Processed order with full pallets, skvettpalls, and mix-pall
 */
export const processOrder = (orderData) => {
  const fullPalletsList = [];
  const skvettpallsList = [];
  const mixPallList = [];
  let totalEUPallets = 0;
  let totalBoxes = 0;
  let totalParcels = 0;

  orderData.forEach(item => {
    const result = calculatePallets(item.artikelnummer, item.beställdaDFP);
    
    if (!result) {
      console.warn(`Skipping unknown product: ${item.artikelnummer}`);
      return;
    }

    totalBoxes += result.totalBoxes;

    // Add full pallets
    if (result.fullPallets > 0) {
      fullPalletsList.push({
        artikelnummer: result.artikelnummer,
        fullPallets: result.fullPallets,
        boxType: result.boxType,
        boxesPerPallet: result.boxConfig.fullPalletBoxes,
        totalBoxes: result.fullPallets * result.boxConfig.fullPalletBoxes,
      });
      totalEUPallets += result.fullPallets;
      totalParcels += result.fullPallets; // Each full pallet is a parcel
    }

    // Handle remaining boxes
    if (result.remainingBoxes > 0) {
      if (shouldGoToMixPall(result.remainingBoxes, result.boxConfig)) {
        // Less than one row - goes to mix pall
        mixPallList.push({
          artikelnummer: result.artikelnummer,
          boxCount: result.remainingBoxes,
          boxType: result.boxType,
          boxConfig: result.boxConfig,
        });
      } else {
        // Forms a skvettpall
        const stackHeight = calculateStackHeight(result.remainingBoxes, result.boxConfig);
        skvettpallsList.push({
          artikelnummer: result.artikelnummer,
          boxCount: result.remainingBoxes,
          stackHeight,
          boxType: result.boxType,
          boxConfig: result.boxConfig,
          heightInRedUnits: calculateSkvettpallHeight(result.remainingBoxes, result.boxConfig),
        });
        totalEUPallets += 1; // Each skvettpall uses one EU pallet
      }
    }
  });

  return {
    fullPalletsList,
    skvettpallsList,
    mixPallList,
    totalEUPallets,
    totalBoxes,
    totalParcels, // Will be updated after combo optimization
  };
};
