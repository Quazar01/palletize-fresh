import { COMBO_PALLET } from './constants';

/**
 * COMBO PALLET OPTIMIZER
 * 
 * This module implements advanced bin packing algorithms to minimize the number
 * of combo pallets needed. It includes:
 * 
 * 1. Best-Fit Decreasing (BFD) - Places items in bins with tightest fit
 * 2. First-Fit Decreasing (FFD) - Original greedy approach
 * 3. Branch and Bound - Exhaustive search for small instances (≤8 items)
 * 4. Limited Branch and Bound - Aggressive pruning for medium instances (≤15 items)
 * 5. Mix Pall Integration - Combines mix pall with skvettpalls when beneficial
 * 
 * Mix Pall Handling:
 * - All boxes in mix pall are treated as RED BOXES for height calculation
 * - Example: 4 red + 2 green + 2 black + 2 blue = 10 red boxes total
 * - The optimizer automatically decides whether to combine mix pall with
 *   skvettpalls or keep it separate based on which minimizes total parcels
 */

/**
 * Check if a combo pallet is valid (within height constraints)
 * @param {Array} skvettpalls - Array of skvettpalls in the combo
 * @returns {boolean}
 */
const isValidComboPallet = (skvettpalls) => {
  const totalHeight = skvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);
  const maxAllowedHeight = COMBO_PALLET.MAX_HEIGHT_RED_UNITS * (1 + COMBO_PALLET.HEIGHT_MARGIN);
  return totalHeight <= maxAllowedHeight;
};

/**
 * Calculate total height of a combo pallet
 * @param {Array} skvettpalls - Array of skvettpalls
 * @returns {number} - Total height in red box units
 */
const getComboPalletHeight = (skvettpalls) => {
  return skvettpalls.reduce((sum, pall) => sum + pall.heightInRedUnits, 0);
};

/**
 * Calculate remaining space in a combo pallet
 * @param {Array} skvettpalls - Current skvettpalls in combo
 * @returns {number} - Remaining space in red box units
 */
const getRemainingSpace = (skvettpalls) => {
  const maxAllowedHeight = COMBO_PALLET.MAX_HEIGHT_RED_UNITS * (1 + COMBO_PALLET.HEIGHT_MARGIN);
  const currentHeight = getComboPalletHeight(skvettpalls);
  return maxAllowedHeight - currentHeight;
};

/**
 * Best-Fit Decreasing algorithm for bin packing
 * Places each item in the bin where it fits best (minimum remaining space)
 * @param {Array} skvettpalls - Array of skvettpalls to combine
 * @returns {Array} - Array of combo pallets
 */
const bestFitDecreasing = (skvettpalls) => {
  if (skvettpalls.length === 0) {
    return [];
  }

  // Sort skvettpalls by height (descending) for better optimization
  const sortedSkvettpalls = [...skvettpalls].sort((a, b) => b.heightInRedUnits - a.heightInRedUnits);
  
  const comboPallets = [];

  for (const skvettpall of sortedSkvettpalls) {
    let bestBinIndex = -1;
    let minRemainingSpace = Infinity;

    // Find the bin where this skvettpall fits best
    for (let i = 0; i < comboPallets.length; i++) {
      const testCombo = [...comboPallets[i].skvettpalls, skvettpall];
      
      if (isValidComboPallet(testCombo)) {
        const remainingSpace = getRemainingSpace(testCombo);
        
        // Choose bin with minimum remaining space (tightest fit)
        if (remainingSpace < minRemainingSpace) {
          minRemainingSpace = remainingSpace;
          bestBinIndex = i;
        }
      }
    }

    if (bestBinIndex !== -1) {
      // Add to existing combo
      comboPallets[bestBinIndex].skvettpalls.push(skvettpall);
      comboPallets[bestBinIndex].totalHeight = getComboPalletHeight(comboPallets[bestBinIndex].skvettpalls);
    } else {
      // Create new combo
      comboPallets.push({
        skvettpalls: [skvettpall],
        totalHeight: skvettpall.heightInRedUnits,
        palletCount: 1,
      });
    }
  }

  return comboPallets;
};

/**
 * First-Fit Decreasing algorithm (original greedy approach)
 * @param {Array} skvettpalls - Array of skvettpalls to combine
 * @returns {Array} - Array of combo pallets
 */
export const optimizeComboPallets = (skvettpalls) => {
  if (skvettpalls.length === 0) {
    return [];
  }

  // Sort skvettpalls by height (descending) for better optimization
  const sortedSkvettpalls = [...skvettpalls].sort((a, b) => b.heightInRedUnits - a.heightInRedUnits);
  
  const comboPallets = [];
  const used = new Array(sortedSkvettpalls.length).fill(false);

  // Greedy approach with first-fit decreasing
  for (let i = 0; i < sortedSkvettpalls.length; i++) {
    if (used[i]) continue;

    const currentCombo = [sortedSkvettpalls[i]];
    used[i] = true;

    // Try to add more skvettpalls to this combo
    for (let j = i + 1; j < sortedSkvettpalls.length; j++) {
      if (used[j]) continue;

      const testCombo = [...currentCombo, sortedSkvettpalls[j]];
      
      if (isValidComboPallet(testCombo)) {
        currentCombo.push(sortedSkvettpalls[j]);
        used[j] = true;
      }
    }

    comboPallets.push({
      skvettpalls: currentCombo,
      totalHeight: getComboPalletHeight(currentCombo),
      palletCount: 1,
    });
  }

  return comboPallets;
};

/**
 * Advanced optimization using multiple strategies and choosing the best
 * Combines Best-Fit Decreasing with Branch and Bound for optimal results
 * @param {Array} skvettpalls - Array of skvettpalls to combine
 * @param {number} maxIterations - Maximum iterations to prevent timeout
 * @returns {Array} - Array of combo pallets
 */
export const optimizeComboPalletsAdvanced = (skvettpalls, maxIterations = 5000) => {
  if (skvettpalls.length === 0) {
    return [];
  }

  // For small instances, use exhaustive Branch and Bound
  if (skvettpalls.length <= 8) {
    return branchAndBoundExhaustive(skvettpalls, maxIterations);
  }

  // For larger instances, try multiple heuristics and choose best
  const bfdSolution = bestFitDecreasing(skvettpalls);
  const ffdSolution = optimizeComboPallets(skvettpalls);
  
  // Try different sorting strategies
  const sortedByHeightAsc = [...skvettpalls].sort((a, b) => a.heightInRedUnits - b.heightInRedUnits);
  const bfdAscSolution = bestFitDecreasing(sortedByHeightAsc);
  
  // For medium instances, also try limited Branch and Bound
  let bnbSolution = null;
  if (skvettpalls.length <= 15) {
    bnbSolution = branchAndBoundLimited(skvettpalls, Math.min(maxIterations, 2000));
  }

  // Choose the solution with minimum number of combo pallets
  const solutions = [bfdSolution, ffdSolution, bfdAscSolution, bnbSolution].filter(s => s !== null);
  
  return solutions.reduce((best, current) => 
    current.length < best.length ? current : best
  );
};

/**
 * Branch and Bound with exhaustive search for small instances
 * @param {Array} skvettpalls - Array of skvettpalls to combine
 * @param {number} maxIterations - Maximum iterations
 * @returns {Array} - Array of combo pallets
 */
const branchAndBoundExhaustive = (skvettpalls, maxIterations) => {
  let bestSolution = null;
  let bestParcelCount = Infinity;
  let iterations = 0;

  const maxAllowedHeight = COMBO_PALLET.MAX_HEIGHT_RED_UNITS * (1 + COMBO_PALLET.HEIGHT_MARGIN);

  const solve = (remaining, currentSolution) => {
    iterations++;
    
    if (iterations > maxIterations) {
      return;
    }

    // Base case: no more skvettpalls to assign
    if (remaining.length === 0) {
      if (currentSolution.length < bestParcelCount) {
        bestParcelCount = currentSolution.length;
        bestSolution = JSON.parse(JSON.stringify(currentSolution));
      }
      return;
    }

    // Pruning: if current solution already has more parcels than best, stop
    if (currentSolution.length >= bestParcelCount) {
      return;
    }

    const current = remaining[0];
    const rest = remaining.slice(1);

    // Try adding to existing combos (sorted by remaining space for efficiency)
    const combosWithSpace = currentSolution
      .map((combo, index) => ({
        index,
        remainingSpace: maxAllowedHeight - combo.totalHeight,
        combo
      }))
      .filter(item => item.remainingSpace >= current.heightInRedUnits)
      .sort((a, b) => a.remainingSpace - b.remainingSpace); // Try tightest fit first

    for (const {index} of combosWithSpace) {
      const testCombo = [...currentSolution[index].skvettpalls, current];
      
      if (isValidComboPallet(testCombo)) {
        const newSolution = [...currentSolution];
        newSolution[index] = {
          skvettpalls: testCombo,
          totalHeight: getComboPalletHeight(testCombo),
          palletCount: 1,
        };
        solve(rest, newSolution);
      }
    }

    // Try creating a new combo (only if we haven't exceeded best solution potential)
    if (currentSolution.length + 1 < bestParcelCount) {
      const newSolution = [
        ...currentSolution,
        {
          skvettpalls: [current],
          totalHeight: current.heightInRedUnits,
          palletCount: 1,
        }
      ];
      solve(rest, newSolution);
    }
  };

  // Start with a best-fit decreasing solution as initial bound
  bestSolution = bestFitDecreasing(skvettpalls);
  bestParcelCount = bestSolution.length;

  // Sort by height descending for better branching
  const sorted = [...skvettpalls].sort((a, b) => b.heightInRedUnits - a.heightInRedUnits);
  
  solve(sorted, []);

  return bestSolution || [];
};

/**
 * Limited Branch and Bound for medium-sized instances
 * Uses aggressive pruning to handle larger problem sizes
 * @param {Array} skvettpalls - Array of skvettpalls to combine
 * @param {number} maxIterations - Maximum iterations
 * @returns {Array} - Array of combo pallets
 */
const branchAndBoundLimited = (skvettpalls, maxIterations) => {
  let bestSolution = bestFitDecreasing(skvettpalls);
  let bestParcelCount = bestSolution.length;
  let iterations = 0;

  const maxAllowedHeight = COMBO_PALLET.MAX_HEIGHT_RED_UNITS * (1 + COMBO_PALLET.HEIGHT_MARGIN);

  const solve = (remaining, currentSolution, depth) => {
    iterations++;
    
    if (iterations > maxIterations || depth > 10) {
      return;
    }

    if (remaining.length === 0) {
      if (currentSolution.length < bestParcelCount) {
        bestParcelCount = currentSolution.length;
        bestSolution = JSON.parse(JSON.stringify(currentSolution));
      }
      return;
    }

    // Aggressive pruning
    if (currentSolution.length >= bestParcelCount - 1) {
      return;
    }

    const current = remaining[0];
    const rest = remaining.slice(1);

    // Only try best 3 fitting bins
    const combosWithSpace = currentSolution
      .map((combo, index) => ({
        index,
        remainingSpace: maxAllowedHeight - combo.totalHeight,
      }))
      .filter(item => item.remainingSpace >= current.heightInRedUnits)
      .sort((a, b) => a.remainingSpace - b.remainingSpace)
      .slice(0, 3);

    for (const {index} of combosWithSpace) {
      const testCombo = [...currentSolution[index].skvettpalls, current];
      
      if (isValidComboPallet(testCombo)) {
        const newSolution = [...currentSolution];
        newSolution[index] = {
          skvettpalls: testCombo,
          totalHeight: getComboPalletHeight(testCombo),
          palletCount: 1,
        };
        solve(rest, newSolution, depth + 1);
      }
    }

    // Try creating new combo with limited depth
    if (currentSolution.length + 1 < bestParcelCount && depth < 8) {
      const newSolution = [
        ...currentSolution,
        {
          skvettpalls: [current],
          totalHeight: current.heightInRedUnits,
          palletCount: 1,
        }
      ];
      solve(rest, newSolution, depth + 1);
    }
  };

  const sorted = [...skvettpalls].sort((a, b) => b.heightInRedUnits - a.heightInRedUnits);
  solve(sorted, [], 0);

  return bestSolution;
};

/**
 * Calculate total parcels after combo optimization
 * @param {number} fullPalletsCount - Number of full pallets
 * @param {Array} comboPallets - Array of combo pallets
 * @param {boolean} hasMixPall - Whether there's a mix pall
 * @returns {number} - Total number of parcels
 */
export const calculateTotalParcels = (fullPalletsCount, comboPallets, hasMixPall) => {
  let total = fullPalletsCount;
  total += comboPallets.length;
  if (hasMixPall) {
    total += 1;
  }
  return total;
};

/**
 * Convert mix pall to a pseudo-skvettpall for combining
 * Assumes all boxes are red boxes for height calculation
 * @param {Array} mixPallList - List of items in mix pall
 * @returns {Object|null} - Pseudo-skvettpall representing mix pall, or null if empty
 */
export const convertMixPallToSkvettpall = (mixPallList) => {
  if (!mixPallList || mixPallList.length === 0) {
    return null;
  }

  // Count total boxes, treating all as red boxes
  const totalBoxCount = mixPallList.reduce((sum, item) => sum + item.boxCount, 0);

  // Use red box configuration for height calculation
  const redBoxConfig = {
    boxesPerRow: 8,
    heightInRedBoxUnits: 1,
  };

  // Calculate stack height assuming all boxes are red
  const stackHeight = Math.ceil(totalBoxCount / redBoxConfig.boxesPerRow);

  // Calculate total height: pallet (1 red unit) + stack height
  const heightInRedUnits = COMBO_PALLET.PALLET_HEIGHT_RED_UNITS + stackHeight;

  return {
    artikelnummer: 'MIX',
    boxCount: totalBoxCount,
    stackHeight,
    boxType: 'mixed',
    isMixPall: true,
    heightInRedUnits,
    mixPallItems: mixPallList, // Keep original items for display
  };
};

/**
 * Optimize combo pallets including mix pall
 * Tries to combine mix pall with skvettpalls to minimize total parcels
 * @param {Array} skvettpalls - Array of skvettpalls to combine
 * @param {Array} mixPallList - Items in mix pall
 * @param {number} maxIterations - Maximum iterations
 * @returns {Object} - { comboPallets, mixPallCombined }
 */
export const optimizeComboPalletsWithMixPall = (skvettpalls, mixPallList, maxIterations = 5000) => {
  // If no mix pall, use regular optimization
  if (!mixPallList || mixPallList.length === 0) {
    return {
      comboPallets: optimizeComboPalletsAdvanced(skvettpalls, maxIterations),
      mixPallCombined: false,
      standaloneMixPall: null,
    };
  }

  // Convert mix pall to pseudo-skvettpall
  const mixPallAsSkvettpall = convertMixPallToSkvettpall(mixPallList);

  if (!mixPallAsSkvettpall) {
    return {
      comboPallets: optimizeComboPalletsAdvanced(skvettpalls, maxIterations),
      mixPallCombined: false,
      standaloneMixPall: null,
    };
  }

  // If no skvettpalls, mix pall stands alone
  if (!skvettpalls || skvettpalls.length === 0) {
    return {
      comboPallets: [],
      mixPallCombined: false,
      standaloneMixPall: {
        skvettpalls: [mixPallAsSkvettpall],
        totalHeight: mixPallAsSkvettpall.heightInRedUnits,
        palletCount: 1,
        isMixPallCombo: true,
      },
    };
  }

  // Try optimization WITH mix pall included
  const allItemsIncludingMix = [...skvettpalls, mixPallAsSkvettpall];
  const comboWithMix = optimizeComboPalletsAdvanced(allItemsIncludingMix, maxIterations);

  // Try optimization WITHOUT mix pall
  const comboWithoutMix = optimizeComboPalletsAdvanced(skvettpalls, maxIterations);

  // Compare: combo with mix pall vs combo without + standalone mix pall
  const totalWithMix = comboWithMix.length;
  const totalWithoutMix = comboWithoutMix.length + 1; // +1 for standalone mix pall

  if (totalWithMix < totalWithoutMix) {
    // Combining mix pall saves parcels
    return {
      comboPallets: comboWithMix,
      mixPallCombined: true,
      standaloneMixPall: null,
    };
  } else {
    // Keep mix pall separate
    return {
      comboPallets: comboWithoutMix,
      mixPallCombined: false,
      standaloneMixPall: {
        skvettpalls: [mixPallAsSkvettpall],
        totalHeight: mixPallAsSkvettpall.heightInRedUnits,
        palletCount: 1,
        isMixPallCombo: true,
      },
    };
  }
};
