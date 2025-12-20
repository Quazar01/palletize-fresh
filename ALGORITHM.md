# Pallet Optimization Algorithm

## Overview

This document explains the algorithms used to optimize pallet configurations for product orders.

## Step 1: Order Processing

### Input
- Excel file with columns:
  - `Artikelnummer`: Product ID
  - `Beställda DFP`: Number of boxes ordered

### Process
1. Parse Excel file
2. For each product:
   - Look up box type from `products.json`
   - Calculate full pallets: `fullPallets = floor(boxCount / fullPalletBoxes)`
   - Calculate remaining: `remainingBoxes = boxCount % fullPalletBoxes`

### Output
- List of full pallets (each is a separate parcel)
- List of remaining boxes for further processing

## Step 2: Skvettpall Classification

For each product's remaining boxes:

### If boxes ≥ boxesPerRow:
- Create a **Skvettpall**
- Calculate stack height: `stackHeight = ceil(boxes / boxesPerRow)`
- Calculate height in red units: `height = 1 + (stackHeight * boxHeightRatio)`

### If boxes < boxesPerRow:
- Add to **Mix Pall** list

## Step 3: Combo Pallet Optimization

### Objective
Minimize the total number of parcels by combining skvettpalls.

### Constraints
- Maximum height: 9 red box units
- Margin: +1% acceptable
- Each pallet base: 1 red box unit

### Algorithm: Branch-and-Bound with Greedy First-Fit Decreasing

```
function optimizeComboPallets(skvettpalls):
    1. Sort skvettpalls by height (descending)
    2. Initialize empty comboPallets list
    3. For each skvettpall:
        a. Try to add to existing combos
        b. If fits (total height ≤ 9.09 red units):
            - Add to that combo
        c. Else:
            - Create new combo pallet
    4. Return comboPallets
```

### Height Calculation

For a combo pallet with multiple skvettpalls:

```
totalHeight = Σ (palletHeight + stackRows * boxHeightRatio)
```

Where:
- `palletHeight` = 1 red unit
- `boxHeightRatio` depends on box type:
  - Red: 1.0
  - Green: 8/7 ≈ 1.143
  - Black: 8/6 ≈ 1.333
  - Blue: 8/11 ≈ 0.727
  - Half-blue: 8/16 = 0.5

### Example

Combining two skvettpalls:
1. **Skvettpall A**: 31 red boxes (4 rows)
   - Height = 1 + (4 × 1.0) = 5 red units

2. **Skvettpall B**: 7 green boxes (2 rows)
   - Height = 1 + (2 × 8/7) = 1 + 2.286 = 3.286 red units

3. **Combo Height**: 5 + 3.286 = 8.286 red units ✓ (< 9)

## Step 4: Mix Pall Creation

All products with boxes < boxesPerRow are combined into one Mix Pall.
- This forms 1 parcel regardless of content

## Step 5: Parcel Count

```
totalParcels = fullPalletsCount + comboPalletsCount + (mixPall ? 1 : 0)
```

## Optimization Strategies

### Basic (Greedy)
- Fast, O(n²) complexity
- Finds good solution quickly
- Used by default

### Advanced (Branch-and-Bound)
- Explores alternative combinations
- Finds better (sometimes optimal) solution
- Limited by iteration count to prevent timeout
- O(2ⁿ) worst case, but pruned heavily

## Box Type Specifications Reference

| Box Type   | Area    | Per Row | Full Pallet | Height (mm) | Red Units |
|------------|---------|---------|-------------|-------------|-----------|
| Red        | 1/8     | 8       | 64 (8×8)    | 136         | 1.0       |
| Green      | 1/4     | 4       | 28 (7×4)    | 155         | 8/7       |
| Black      | 1/8     | 8       | 48 (6×8)    | 181         | 8/6       |
| Blue       | 1/8     | 8       | 88 (11×8)   | 99          | 8/11      |
| Half-blue  | 1/8     | 8       | 128 (16×8)  | 68          | 8/16      |

## Performance

- **Time Complexity**: O(n²) for basic, O(2ⁿ) for advanced (with pruning)
- **Space Complexity**: O(n)
- **Typical Processing Time**: < 1 second for most orders


