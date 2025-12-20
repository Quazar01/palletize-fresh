import { COMBO_PALLET, TRUCK_SLOT, getBoxType } from './constants';

/**
 * Calculate truck slots needed based on pallet heights
 * Only relevant for Enkel and Helsingborg modes (non-combined pallets)
 * 
 * @param {Array} fullPalletsList - Full EU pallets
 * @param {Array} skvettpalls - Individual skvettpalls (from comboPallets in Enkel/Helsingborg)
 * @param {Array} mixPallList - Mix pall (if exists)
 * @returns {number} Number of truck slots needed (rounded to 2 decimals)
 */
export const calculateTruckSlots = (fullPalletsList, skvettpalls, mixPallList) => {
  let totalHeightInRedUnits = 0;

  // Full pallets: Each is 1 pallet + (fullPalletRows * heightInRedBoxUnits)
  fullPalletsList.forEach(pallet => {
    const boxConfig = getBoxType(pallet.boxType);
    if (boxConfig) {
      // Check if pallet has individual box counts (mixed full pallets and skvettpalls)
      if (pallet.palletBoxCounts && pallet.palletBoxCounts.length > 0) {
        // Calculate height for each individual pallet based on its box count
        pallet.palletBoxCounts.forEach(boxCount => {
          const stackHeight = Math.ceil(boxCount / boxConfig.boxesPerRow);
          const individualPalletHeight = COMBO_PALLET.PALLET_HEIGHT_RED_UNITS + 
                                        (stackHeight * boxConfig.heightInRedBoxUnits);
          totalHeightInRedUnits += individualPalletHeight;
        });
      } else {
        // Standard calculation for uniform full pallets
        const palletHeight = COMBO_PALLET.PALLET_HEIGHT_RED_UNITS + 
                            (boxConfig.fullPalletRows * boxConfig.heightInRedBoxUnits);
        totalHeightInRedUnits += palletHeight * pallet.fullPallets;
      }
    }
  });

  // Skvettpalls: Use their calculated height
  skvettpalls.forEach(skvettpall => {
    if (skvettpall.heightInRedUnits) {
      totalHeightInRedUnits += skvettpall.heightInRedUnits;
    }
  });

  // Mix pall: Calculate as pseudo-skvettpall (1 pallet + stacked boxes)
  if (mixPallList && mixPallList.length > 0) {
    const totalMixBoxes = mixPallList.reduce((sum, item) => sum + item.boxCount, 0);
    // Assuming all mix boxes are red boxes (8 per row)
    const mixStackHeight = Math.ceil(totalMixBoxes / 8);
    const mixPallHeight = COMBO_PALLET.PALLET_HEIGHT_RED_UNITS + mixStackHeight;
    totalHeightInRedUnits += mixPallHeight;
  }

  // Calculate truck slots (2 full pallets = 18 red units per slot)
  // Return with 2 decimal places
  const truckSlots = totalHeightInRedUnits / TRUCK_SLOT.MAX_HEIGHT_RED_UNITS;

  return Math.round(truckSlots * 100) / 100;
};
