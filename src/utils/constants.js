// EU Pallet dimensions in mm
export const EU_PALLET = {
  LENGTH: 1200,
  WIDTH: 800,
  HEIGHT: 150, // Pallet thickness
};

// Box specifications
export const BOX_TYPES = {
  RED: {
    name: 'red',
    boxesPerRow: 8,
    fullPalletRows: 8,
    fullPalletBoxes: 64,
    heightBygelage2: 136, // mm - on pallet floor
    heightBygelage1: 136, // mm - stacked
    heightInRedBoxUnits: 1, // Reference unit
    areaFraction: 1/8, // of pallet area
  },
  GREEN: {
    name: 'green',
    boxesPerRow: 4,
    fullPalletRows: 7,
    fullPalletBoxes: 28,
    heightBygelage2: 155, // mm
    heightBygelage1: 155, // mm
    heightInRedBoxUnits: 8/7, // 1.142857
    areaFraction: 1/4,
  },
  BLACK: {
    name: 'black',
    boxesPerRow: 8,
    fullPalletRows: 6,
    fullPalletBoxes: 48,
    heightBygelage2: 181, // mm
    heightBygelage1: 181, // mm
    heightInRedBoxUnits: 8/6, // 1.333333
    areaFraction: 1/8,
  },
  BLUE: {
    name: 'blue',
    boxesPerRow: 8,
    fullPalletRows: 11,
    fullPalletBoxes: 88,
    heightBygelage2: 99, // mm - Bygelläge 2
    heightBygelage1: 99, // mm
    heightInRedBoxUnits: 8/11, // 0.727272
    areaFraction: 1/8,
  },
  HALF_BLUE: {
    name: 'half-blue',
    boxesPerRow: 8,
    fullPalletRows: 16,
    fullPalletBoxes: 128,
    heightBygelage2: 68, // mm
    heightBygelage1: 68, // mm
    heightInRedBoxUnits: 8/16, // 0.5
    areaFraction: 1/8,
  },
  RENRUM: {
    name: 'renrum',
    boxesPerRow: 8,
    fullPalletRows: 16,
    fullPalletBoxes: 128,
    heightBygelage2: 68,
    heightBygelage1: 68,
    heightInRedBoxUnits: 8/16,
    areaFraction: 1/8,
  }
};

// Combo pallet constraints
export const COMBO_PALLET = {
  MAX_HEIGHT_RED_UNITS: 9, // Maximum 9 red box heights
  PALLET_HEIGHT_RED_UNITS: 1, // EU pallet = 1 red box height
  HEIGHT_MARGIN: 0.01, // 1% acceptable margin
};

// Truck slot constraints (for Enkel and Helsingborg modes)
export const TRUCK_SLOT = {
  MAX_HEIGHT_RED_UNITS: 18, // Two full pallets: 2 * (1 pallet + 8 red boxes) = 2 * 9 = 18
};

// Get box type configuration by name
export const getBoxType = (typeName) => {
  const typeMap = {
    'red': BOX_TYPES.RED,
    'green': BOX_TYPES.GREEN,
    'black': BOX_TYPES.BLACK,
    'blue': BOX_TYPES.BLUE,
    'half-blue': BOX_TYPES.HALF_BLUE,
    'renrum': BOX_TYPES.RENRUM,
  };
  return typeMap[typeName] || null;
};
