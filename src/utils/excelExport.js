import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';

const COL = {
  LEFT_ART: 1, // A
  LEFT_DFP: 2, // B
  LEFT_PALL: 6, // F
  RIGHT_ART: 8, // H
  RIGHT_START: 9, // I
  RIGHT_END: 13, // M
  DATE: 10 // J
};

const sanitizeFilenamePart = (value) => {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_');
};

const normalizeCustomerText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseKundLabel = (value) => {
  const text = String(value || '');
  const match = text.match(/kund\s*:\s*(.*)/i);
  return match ? match[1].trim() : '';
};

const getCellString = (sheet, row, col) => {
  const value = sheet.cell(row, col).value();
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const getCellFormula = (sheet, row, col) => {
  try {
    return sheet.cell(row, col).formula();
  } catch {
    return undefined;
  }
};

const isDateLikeValue = (value) => {
  if (value instanceof Date) return true;
  if (value === undefined || value === null) return false;

  const asString = String(value).trim();
  if (!asString) return false;

  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(asString)) return true;
  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(asString)) return true;

  const parsed = Date.parse(asString);
  return Number.isFinite(parsed);
};

const setCellValue = (sheet, row, col, value) => {
  const cell = sheet.cell(row, col);

  if (value === undefined || value === null || value === '') {
    cell.value('');
    return;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    cell.value(value);
  } else {
    cell.value(String(value));
  }

  cell.style('bold', true);
  cell.style('fontSize', 18);
};

const clearColumnRange = (sheet, startRow, endRow, columns) => {
  for (let row = startRow; row <= endRow; row += 1) {
    columns.forEach((col) => {
      const formula = getCellFormula(sheet, row, col);
      if (typeof formula === 'string' && formula.trim().length > 0) return;

      const currentValue = sheet.cell(row, col).value();
      if (typeof currentValue === 'string' && currentValue.trim().length > 0) return;

      setCellValue(sheet, row, col, '');
    });
  }
};

const clearBlockRange = (sheet, startRow, endRow, startCol, endCol) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const formula = getCellFormula(sheet, row, col);
      if (typeof formula === 'string' && formula.trim().length > 0) continue;

      const currentValue = sheet.cell(row, col).value();
      if (typeof currentValue === 'string' && currentValue.trim().length > 0) continue;

      setCellValue(sheet, row, col, '');
    }
  }
};

const findTemplateHeaderRow = (sheet, startRow = 1, endRow = 40) => {
  const usedRange = sheet.usedRange();
  const lastUsedRow = usedRange ? usedRange.endCell().rowNumber() : 40;
  const searchEnd = Math.min(lastUsedRow, endRow);

  for (let row = startRow; row <= searchEnd; row += 1) {
    const leftArt = getCellString(sheet, row, COL.LEFT_ART);
    const leftDfp = getCellString(sheet, row, COL.LEFT_DFP);
    const leftPall = getCellString(sheet, row, COL.LEFT_PALL);
    const rightArt = getCellString(sheet, row, COL.RIGHT_ART);

    const looksLikeHeader =
      leftArt.includes('art') &&
      leftDfp.includes('dfp') &&
      leftPall.includes('pall') &&
      rightArt.includes('art');

    if (looksLikeHeader) {
      return row;
    }
  }

  return null;
};

const findDataEndRow = (sheet, startRow, endLimitRow = null) => {
  const usedRange = sheet.usedRange();
  const lastUsedRow = usedRange ? usedRange.endCell().rowNumber() : startRow + 220;
  const rawSearchEnd = Math.min(lastUsedRow, startRow + 500);
  const searchEnd = endLimitRow ? Math.min(rawSearchEnd, endLimitRow) : rawSearchEnd;

  for (let row = startRow; row <= searchEnd; row += 1) {
    const marker = getCellString(sheet, row, COL.RIGHT_ART);
    if (marker.includes('full pall')) {
      return Math.max(startRow, row - 1);
    }
  }

  return endLimitRow ? Math.max(startRow, endLimitRow) : Math.max(startRow + 220, 260);
};

const clearCustomRowHeights = (sheet, startRow, endRow) => {
  if (endRow < startRow) return;

  for (let row = startRow; row <= endRow; row += 1) {
    sheet.row(row).height(null);
  }
};

const findDateHeaderCell = (sheet, row = 1) => {
  const usedRange = sheet.usedRange();
  const lastUsedCol = usedRange ? usedRange.endCell().columnNumber() : 20;
  const searchEndCol = Math.max(lastUsedCol, COL.DATE);

  for (let col = COL.RIGHT_ART; col <= searchEndCol; col += 1) {
    const value = sheet.cell(row, col).value();
    if (isDateLikeValue(value)) {
      return { row, col };
    }
  }

  return { row, col: COL.DATE };
};

const findKundHeaders = (sheet) => {
  const headers = [];
  const usedRange = sheet.usedRange();
  const lastUsedRow = usedRange ? usedRange.endCell().rowNumber() : 80;
  const lastUsedCol = usedRange ? usedRange.endCell().columnNumber() : 20;
  const scanMaxRow = Math.min(lastUsedRow, 500);
  const scanMaxCol = Math.min(Math.max(lastUsedCol, 20), 80);

  for (let row = 1; row <= scanMaxRow; row += 1) {
    for (let col = 1; col <= scanMaxCol; col += 1) {
      const value = sheet.cell(row, col).value();
      if (value === undefined || value === null) continue;

      const text = String(value);
      if (/kund\s*:/i.test(text)) {
        headers.push({
          row,
          col,
          raw: text,
          kund: parseKundLabel(text),
          normalizedKund: normalizeCustomerText(parseKundLabel(text))
        });
        break;
      }
    }
  }

  return headers;
};

const findMatchingKundHeader = (sheet, kundValue, tableName = '') => {
  const headers = findKundHeaders(sheet);
  const normalizedTableName = normalizeCustomerText(tableName);
  const normalizedTarget = normalizeCustomerText(kundValue);

  if (normalizedTableName) {
    const byTableName = headers.find((header) =>
      header.normalizedKund === normalizedTableName ||
      header.normalizedKund.includes(normalizedTableName) ||
      normalizedTableName.includes(header.normalizedKund)
    );

    if (byTableName) {
      return { match: byTableName, headers, normalizedTarget, normalizedTableName };
    }

    return { match: null, headers, normalizedTarget, normalizedTableName };
  }

  const exactMatch = headers.find((header) => header.normalizedKund === normalizedTarget);
  if (exactMatch) {
    return { match: exactMatch, headers, normalizedTarget, normalizedTableName };
  }

  if (!normalizedTarget && headers.length > 0) {
    return { match: headers[0], headers, normalizedTarget, normalizedTableName };
  }

  return { match: null, headers, normalizedTarget, normalizedTableName };
};

const updateKundAndDateHeaderRow = (sheet, orderData, kundHeader) => {
  const kundRow = kundHeader.row;
  const kundCol = kundHeader.col;
  const usedRange = sheet.usedRange();
  const lastUsedCol = usedRange ? usedRange.endCell().columnNumber() : 40;
  const searchMaxCol = Math.min(Math.max(lastUsedCol, 20), 100);

  const kundValue = orderData?.kund || '-';
  const originalKundText = String(sheet.cell(kundRow, kundCol).value() ?? '');

  if (/kund\s*:/i.test(originalKundText)) {
    setCellValue(
      sheet,
      kundRow,
      kundCol,
      originalKundText.replace(/(kund\s*:\s*).*/i, `$1${kundValue}`)
    );
  } else {
    setCellValue(sheet, kundRow, kundCol, `Kund: ${kundValue}`);
  }

  const providedDate = orderData?.datum;
  if (!providedDate) return;

  let dateCol = null;

  for (let col = Math.max(1, kundCol); col <= searchMaxCol; col += 1) {
    const formula = getCellFormula(sheet, kundRow, col);
    if (typeof formula === 'string' && /today\s*\(/i.test(formula)) {
      dateCol = col;
      break;
    }

    const value = sheet.cell(kundRow, col).value();
    if (typeof value === 'string' && /today\s*\(/i.test(value)) {
      dateCol = col;
      break;
    }
  }

  if (dateCol === null) {
    for (let col = Math.max(kundCol + 1, 1); col <= searchMaxCol; col += 1) {
      const value = sheet.cell(kundRow, col).value();
      if (isDateLikeValue(value)) {
        dateCol = col;
        break;
      }
    }
  }

  if (dateCol === null) {
    const fallback = findDateHeaderCell(sheet, kundRow);
    dateCol = fallback.col;
  }

  setCellValue(sheet, kundRow, dateCol, providedDate);
};

const flattenComboItems = (combo) => {
  const rows = [];
  const hasMixPall = combo.skvettpalls.some((item) => item.isMixPall);

  if (hasMixPall) {
    rows.push({ art: 'Blandpall', dfp: '' });
  }

  combo.skvettpalls.forEach((item) => {
    if (item.isMixPall && Array.isArray(item.mixPallItems)) {
      item.mixPallItems.forEach((mixItem) => {
        rows.push({ art: mixItem.artikelnummer, dfp: mixItem.boxCount });
      });
      return;
    }

    rows.push({ art: item.artikelnummer, dfp: item.boxCount });
  });

  return rows;
};

const writeLeftComboSection = (sheet, startRow, comboPallets, mixPall) => {
  const standAloneCombos = comboPallets.filter((combo) => combo.skvettpalls.length === 1);

  const multiCombos = comboPallets.filter((combo) => combo.skvettpalls.length > 1);

  let row = startRow;

  standAloneCombos.forEach((combo) => {
    const items = flattenComboItems(combo);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, COL.LEFT_ART, item.art);
      setCellValue(sheet, row, COL.LEFT_DFP, item.dfp);
      setCellValue(sheet, row, COL.LEFT_PALL, index === items.length - 1 ? combo.skvettpalls.length : '');
      row += 1;
    });
  });

  if (standAloneCombos.length > 0 && multiCombos.length > 0) {
    row += 1;
  }

  multiCombos.forEach((combo) => {
    const items = flattenComboItems(combo);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, COL.LEFT_ART, item.art);
      setCellValue(sheet, row, COL.LEFT_DFP, item.dfp);
      setCellValue(sheet, row, COL.LEFT_PALL, index === items.length - 1 ? combo.skvettpalls.length : '');
      row += 1;
    });

    row += 1;
  });

  if (mixPall.length > 0) {
    row += 2;
    setCellValue(sheet, row, COL.LEFT_ART, 'Blandpall');
    setCellValue(sheet, row, COL.LEFT_PALL, 1);
    row += 1;

    mixPall.forEach((item) => {
      setCellValue(sheet, row, COL.LEFT_ART, item.artikelnummer);
      setCellValue(sheet, row, COL.LEFT_DFP, item.boxCount);
      row += 1;
    });
  }

  return Math.max(startRow, row - 1);
};

const writeRightFullPallSection = (sheet, startRow, fullPallets) => {
  let row = startRow;

  fullPallets.forEach((pallet) => {
    const boxCounts = Array.isArray(pallet.palletBoxCounts) && pallet.palletBoxCounts.length > 0
      ? pallet.palletBoxCounts
      : Array.from({ length: pallet.fullPallets || 0 }, () => pallet.boxesPerPallet);

    if (boxCounts.length === 0) return;

    setCellValue(sheet, row, COL.RIGHT_ART, pallet.artikelnummer);

    const slotsPerRow = COL.RIGHT_END - COL.RIGHT_START + 1;
    boxCounts.forEach((count, index) => {
      const localRow = row + Math.floor(index / slotsPerRow);
      const col = COL.RIGHT_START + (index % slotsPerRow);
      setCellValue(sheet, localRow, col, count);
    });

    row += Math.ceil(boxCounts.length / slotsPerRow);
    row += 1;
  });

  return Math.max(startRow, row - 1);
};

const writeLeftComboSectionCustom = (sheet, startRow, comboPallets, mixPall, columns) => {
  const artCol = columns?.artCol ?? COL.LEFT_ART;
  const dfpCol = columns?.dfpCol ?? COL.LEFT_DFP;
  const pallCol = columns?.pallCol ?? COL.LEFT_PALL;

  const standAloneCombos = comboPallets.filter((combo) => combo.skvettpalls.length === 1);
  const multiCombos = comboPallets.filter((combo) => combo.skvettpalls.length > 1);

  let row = startRow;

  standAloneCombos.forEach((combo) => {
    const items = flattenComboItems(combo);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, artCol, item.art);
      setCellValue(sheet, row, dfpCol, item.dfp);
      setCellValue(sheet, row, pallCol, index === items.length - 1 ? combo.skvettpalls.length : '');
      row += 1;
    });
  });

  if (standAloneCombos.length > 0 && multiCombos.length > 0) {
    row += 1;
  }

  multiCombos.forEach((combo) => {
    const items = flattenComboItems(combo);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, artCol, item.art);
      setCellValue(sheet, row, dfpCol, item.dfp);
      setCellValue(sheet, row, pallCol, index === items.length - 1 ? combo.skvettpalls.length : '');
      row += 1;
    });

    row += 1;
  });

  if (mixPall.length > 0) {
    row += 2;
    setCellValue(sheet, row, artCol, 'Blandpall');
    setCellValue(sheet, row, pallCol, 1);
    row += 1;

    mixPall.forEach((item) => {
      setCellValue(sheet, row, artCol, item.artikelnummer);
      setCellValue(sheet, row, dfpCol, item.boxCount);
      row += 1;
    });
  }

  return Math.max(startRow, row - 1);
};

const writeRightFullPallSectionCustom = (sheet, startRow, fullPallets, columns) => {
  const artCol = columns?.artCol ?? COL.RIGHT_ART;
  const startCol = columns?.startCol ?? COL.RIGHT_START;
  const endCol = columns?.endCol ?? COL.RIGHT_END;
  let row = startRow;

  fullPallets.forEach((pallet) => {
    const boxCounts = Array.isArray(pallet.palletBoxCounts) && pallet.palletBoxCounts.length > 0
      ? pallet.palletBoxCounts
      : Array.from({ length: pallet.fullPallets || 0 }, () => pallet.boxesPerPallet);

    if (boxCounts.length === 0) return;

    setCellValue(sheet, row, artCol, pallet.artikelnummer);

    const slotsPerRow = endCol - startCol + 1;
    boxCounts.forEach((count, index) => {
      const localRow = row + Math.floor(index / slotsPerRow);
      const col = startCol + (index % slotsPerRow);
      setCellValue(sheet, localRow, col, count);
    });

    row += Math.ceil(boxCounts.length / slotsPerRow);
    row += 1;
  });

  return Math.max(startRow, row - 1);
};

const writeHelsingborgEnkelSection = (sheet, startRow, comboPallets, mixPall, columns) => {
  const artCol = columns.artCol;
  const dfpCol = columns.dfpCol;
  const hojdCol = columns.hojdCol;
  const clearToCol = columns.clearToCol || hojdCol;
  let row = startRow;

  const enkelRows = [];
  comboPallets.forEach((combo) => {
    combo.skvettpalls.forEach((item) => {
      if (item.isMixPall) {
        const totalBoxes = (item.mixPallItems || []).reduce((sum, mixItem) => sum + (mixItem.boxCount || 0), 0);
        enkelRows.push({
          art: 'Blandpall',
          dfp: totalBoxes,
          hojd: item.heightInRedUnits ?? item.stackHeight ?? ''
        });
        return;
      }

      enkelRows.push({
        art: item.artikelnummer,
        dfp: item.boxCount,
        hojd: item.heightInRedUnits ?? item.stackHeight ?? ''
      });
    });
  });

  if (mixPall.length > 0) {
    const totalBoxes = mixPall.reduce((sum, item) => sum + (item.boxCount || 0), 0);
    const stackHeight = Math.ceil(totalBoxes / 8);
    enkelRows.push({ art: 'Blandpall', dfp: totalBoxes, hojd: 1 + stackHeight });
  }

  const clearEndRow = Math.max(startRow + Math.max(enkelRows.length + 20, 30), 80);
  clearBlockRange(sheet, startRow, clearEndRow, artCol, clearToCol);

  enkelRows.forEach((item) => {
    setCellValue(sheet, row, artCol, item.art);
    setCellValue(sheet, row, dfpCol, item.dfp);
    setCellValue(sheet, row, hojdCol, item.hojd);
    row += 1;
  });

  return Math.max(startRow, row - 1);
};

const columnNumberToName = (columnNumber) => {
  let col = columnNumber;
  let label = '';

  while (col > 0) {
    const remainder = (col - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    col = Math.floor((col - 1) / 26);
  }

  return label;
};

const getSpecialTableNamesForSheet = (sheetName) => {
  const normalizedSheetName = normalizeCustomerText(sheetName);

  if (normalizedSheetName === 'ica dag') {
    return ['Ica Borlänge', 'Ica Viby', 'Ica Helsingborg'];
  }

  if (normalizedSheetName === 'ica helg') {
    return ['ICA Borlänge', 'ICA Helsingborg', 'ICA Viby'];
  }

  if (normalizedSheetName === 'axfood pontus' || normalizedSheetName === 'axfood pontus bigger') {
    return ['Axfood'];
  }

  return [];
};

const resolveSpecialTableLayout = (sheetName, orderData, tableName = '') => {
  const normalizedSheetName = normalizeCustomerText(sheetName);
  const normalizedCustomer = normalizeCustomerText(orderData?.kund || '');
  const normalizedTableName = normalizeCustomerText(tableName || '');

  if (normalizedSheetName === 'ica dag') {
    const tableLayouts = [
      {
        sheetName: 'ICA Dag',
        tableName: 'Ica Borlänge',
        customerTokens: ['ica borlange', 'borlange'],
        type: 'defaultColumns',
        comboStartRow: 4,
        fullStartRow: 4,
        dateRow: 2,
        dateCol: COL.DATE,
        nextComboStartRow: 60
      },
      {
        sheetName: 'ICA Dag',
        tableName: 'Ica Viby',
        customerTokens: ['ica viby', 'viby'],
        type: 'defaultColumns',
        comboStartRow: 60,
        fullStartRow: 60,
        dateRow: 58,
        dateCol: COL.DATE,
        nextComboStartRow: 115
      },
      {
        sheetName: 'ICA Dag',
        tableName: 'Ica Helsingborg',
        customerTokens: ['ica helsingborg', 'helsingborg'],
        type: 'defaultColumns',
        comboStartRow: 115,
        fullStartRow: 115,
        dateRow: 113,
        dateCol: COL.DATE,
        nextComboStartRow: null
      }
    ];

    if (normalizedTableName) {
      return tableLayouts.find((layout) => normalizeCustomerText(layout.tableName) === normalizedTableName) || null;
    }

    return tableLayouts.find((layout) =>
      layout.customerTokens.some((token) => normalizedCustomer.includes(token))
    ) || null;
  }

  if (normalizedSheetName === 'ica helg') {
    const tableLayouts = [
      {
        sheetName: 'ICA Helg',
        tableName: 'ICA Borlänge',
        customerTokens: ['ica borlange', 'borlange'],
        type: 'customComboAndFull',
        comboStartRow: 5,
        fullStartRow: 13,
        dateRow: 2,
        dateCol: 13,
        comboColumns: { pallCol: 1, artCol: 2, dfpCol: 4 },
        fullColumns: { artCol: 11, startCol: 13, endCol: 17 },
        clearEndRow: 120
      },
      {
        sheetName: 'ICA Helg',
        tableName: 'ICA Helsingborg',
        customerTokens: ['ica helsingborg', 'helsingborg'],
        type: 'helsingborgEnkel',
        enkelStartRow: 5,
        fullStartRow: 15,
        dateRow: 2,
        dateCol: 29,
        requiredPalletMode: 'helsingborg',
        enkelColumns: { artCol: 18, dfpCol: 20, hojdCol: 21, clearToCol: 23 },
        fullColumns: { artCol: 28, startCol: 30, endCol: 34 },
        clearEndRow: 120
      },
      {
        sheetName: 'ICA Helg',
        tableName: 'ICA Viby',
        customerTokens: ['ica viby', 'viby'],
        type: 'customComboAndFull',
        comboStartRow: 5,
        fullStartRow: 13,
        dateRow: 2,
        dateCol: 47,
        comboColumns: { pallCol: 35, artCol: 36, dfpCol: 38 },
        fullColumns: { artCol: 45, startCol: 47, endCol: 51 },
        clearEndRow: 120
      }
    ];

    if (normalizedTableName) {
      return tableLayouts.find((layout) => normalizeCustomerText(layout.tableName) === normalizedTableName) || null;
    }

    return tableLayouts.find((layout) =>
      layout.customerTokens.some((token) => normalizedCustomer.includes(token))
    ) || null;
  }

  if (normalizedSheetName === 'axfood pontus') {
    const tableLayouts = [
      {
        sheetName: 'Axfood Pontus',
        tableName: 'Axfood',
        customerTokens: ['axfood'],
        type: 'customComboAndFull',
        comboStartRow: 5,
        fullStartRow: 12,
        dateRow: 2,
        dateCol: 17,
        comboColumns: { pallCol: 1, artCol: 2, dfpCol: 4 },
        fullColumns: { artCol: 11, startCol: 13, endCol: 17 },
        clearEndRow: 120
      }
    ];

    if (normalizedTableName) {
      return tableLayouts.find((layout) => normalizeCustomerText(layout.tableName) === normalizedTableName) || null;
    }

    return tableLayouts.find((layout) =>
      layout.customerTokens.some((token) => normalizedCustomer.includes(token))
    ) || null;
  }

  if (normalizedSheetName === 'axfood pontus bigger') {
    const tableLayouts = [
      {
        sheetName: 'Axfood Pontus BIGGER',
        tableName: 'Axfood',
        customerTokens: ['axfood'],
        type: 'customComboAndFull',
        comboStartRow: 4,
        fullStartRow: 11,
        dateRow: 1,
        dateCol: 17,
        comboColumns: { pallCol: 1, artCol: 2, dfpCol: 4 },
        fullColumns: { artCol: 11, startCol: 13, endCol: 17 },
        clearEndRow: 130
      }
    ];

    if (normalizedTableName) {
      return tableLayouts.find((layout) => normalizeCustomerText(layout.tableName) === normalizedTableName) || null;
    }

    return tableLayouts.find((layout) =>
      layout.customerTokens.some((token) => normalizedCustomer.includes(token))
    ) || null;
  }

  return null;
};

const fillTemplatePattern = ({
  sheet,
  sheetName,
  tableName,
  orderData,
  comboPallets,
  fullPallets,
  mixPall,
  palletMode,
  debugInfo
}) => {
  const specialLayout = resolveSpecialTableLayout(sheetName, orderData, tableName);
  const normalizedSheetName = normalizeCustomerText(sheetName);

  if (normalizedSheetName === 'ica dag' && !specialLayout) {
    throw new Error(
      `Bladet ICA Dag stöder endast kunderna Ica Borlänge, Ica Viby och Ica Helsingborg. Fick: ${orderData?.kund || '-'}.`
    );
  }

  if (normalizedSheetName === 'ica helg' && !specialLayout) {
    throw new Error(
      `Bladet ICA Helg stöder endast kunderna Ica Borlänge, Ica Helsingborg och Ica Viby. Fick: ${orderData?.kund || '-'}.`
    );
  }

  if (normalizedSheetName === 'axfood pontus' && !specialLayout) {
    throw new Error(
      `Bladet Axfood Pontus stöder endast kunden Axfood. Fick: ${orderData?.kund || '-'}.`
    );
  }

  if (normalizedSheetName === 'axfood pontus bigger' && !specialLayout) {
    throw new Error(
      `Bladet Axfood Pontus BIGGER stöder endast kunden Axfood. Fick: ${orderData?.kund || '-'}.`
    );
  }

  if (specialLayout) {
    if (specialLayout.requiredPalletMode && palletMode !== specialLayout.requiredPalletMode) {
      throw new Error(
        `Tabellen ${specialLayout.tableName} i ${specialLayout.sheetName} kräver läget ${specialLayout.requiredPalletMode}. Nuvarande läge: ${palletMode || '-'}.`
      );
    }

    if (orderData?.datum && specialLayout.dateRow && specialLayout.dateCol) {
      setCellValue(sheet, specialLayout.dateRow, specialLayout.dateCol, orderData.datum);
    }

    if (specialLayout.type === 'defaultColumns') {
      const dataStartRow = specialLayout.comboStartRow;
      const maxClearRow = specialLayout.nextComboStartRow
        ? specialLayout.nextComboStartRow - 1
        : findDataEndRow(sheet, dataStartRow);

      clearColumnRange(sheet, dataStartRow, maxClearRow, [COL.LEFT_ART, COL.LEFT_DFP, COL.LEFT_PALL]);
      clearBlockRange(sheet, specialLayout.fullStartRow, maxClearRow, COL.RIGHT_ART, COL.RIGHT_END);

      writeLeftComboSection(sheet, dataStartRow, comboPallets, mixPall);
      writeRightFullPallSection(sheet, specialLayout.fullStartRow, fullPallets);
      clearCustomRowHeights(sheet, dataStartRow, maxClearRow);

      if (debugInfo) {
        debugInfo.specialTable = {
          sheetName,
          requestedCustomer: orderData?.kund || '',
          matchedTable: specialLayout.tableName,
          comboStartCell: `A${specialLayout.comboStartRow}`,
          fullStartCell: `H${specialLayout.fullStartRow}`,
          dateCell: `J${specialLayout.dateRow}`,
          dataEndRow: maxClearRow
        };
      }

      return;
    }

    if (specialLayout.type === 'customComboAndFull') {
      const maxClearRow = specialLayout.clearEndRow || 120;
      clearColumnRange(
        sheet,
        specialLayout.comboStartRow,
        maxClearRow,
        [specialLayout.comboColumns.artCol, specialLayout.comboColumns.dfpCol, specialLayout.comboColumns.pallCol]
      );
      clearBlockRange(
        sheet,
        specialLayout.fullStartRow,
        maxClearRow,
        specialLayout.fullColumns.artCol,
        specialLayout.fullColumns.endCol
      );

      writeLeftComboSectionCustom(sheet, specialLayout.comboStartRow, comboPallets, mixPall, specialLayout.comboColumns);
      writeRightFullPallSectionCustom(sheet, specialLayout.fullStartRow, fullPallets, specialLayout.fullColumns);
      clearCustomRowHeights(sheet, specialLayout.comboStartRow, maxClearRow);

      if (debugInfo) {
        debugInfo.specialTable = {
          sheetName,
          requestedCustomer: orderData?.kund || '',
          matchedTable: specialLayout.tableName,
          comboStartCell: `${columnNumberToName(specialLayout.comboColumns.pallCol)}${specialLayout.comboStartRow}`,
          fullStartCell: `${columnNumberToName(specialLayout.fullColumns.artCol)}${specialLayout.fullStartRow}`,
          dateCell: `${columnNumberToName(specialLayout.dateCol)}${specialLayout.dateRow}`,
          dataEndRow: maxClearRow
        };
      }

      return;
    }

    if (specialLayout.type === 'helsingborgEnkel') {
      const maxClearRow = specialLayout.clearEndRow || 120;
      clearBlockRange(
        sheet,
        specialLayout.fullStartRow,
        maxClearRow,
        specialLayout.fullColumns.artCol,
        specialLayout.fullColumns.endCol
      );

      const dataEndRow = writeHelsingborgEnkelSection(
        sheet,
        specialLayout.enkelStartRow,
        comboPallets,
        mixPall,
        specialLayout.enkelColumns
      );

      const fullEndRow = writeRightFullPallSectionCustom(
        sheet,
        specialLayout.fullStartRow,
        fullPallets,
        specialLayout.fullColumns
      );

      if (debugInfo) {
        debugInfo.specialTable = {
          sheetName,
          requestedCustomer: orderData?.kund || '',
          matchedTable: specialLayout.tableName,
          enkelStartCell: `R${specialLayout.enkelStartRow}`,
          fullStartCell: `AB${specialLayout.fullStartRow}`,
          dateCell: `AC${specialLayout.dateRow}`,
          dataEndRow,
          fullDataEndRow: fullEndRow
        };
      }

      return;
    }
  }

  const { match: kundHeader, headers } = findMatchingKundHeader(sheet, orderData?.kund || '', tableName);
  if (!kundHeader) {
    throw new Error(
      tableName
        ? `Ingen tabell med Kund: ${tableName} hittades i valt blad.`
        : `Ingen tabell med Kund: ${orderData?.kund || '-'} hittades i valt blad.`
    );
  }

  const sortedHeaderRows = headers.map((header) => header.row).sort((a, b) => a - b);
  const nextHeaderRow = sortedHeaderRows.find((row) => row > kundHeader.row) || null;
  const tableSearchEnd = nextHeaderRow ? nextHeaderRow - 1 : kundHeader.row + 500;

  updateKundAndDateHeaderRow(sheet, orderData, kundHeader);

  const headerRow = findTemplateHeaderRow(sheet, kundHeader.row + 1, tableSearchEnd);
  if (!headerRow) {
    throw new Error(`Kunde inte hitta rubrikraden (Art nr/DFP/pall) för Kund: ${orderData?.kund || '-'}.`);
  }

  const dataStartRow = headerRow + 1;
  const maxClearRow = findDataEndRow(sheet, dataStartRow, tableSearchEnd);

  clearColumnRange(sheet, dataStartRow, maxClearRow, [COL.LEFT_ART, COL.LEFT_DFP, COL.LEFT_PALL]);
  clearBlockRange(sheet, dataStartRow, maxClearRow, COL.RIGHT_ART, COL.RIGHT_END);

  writeLeftComboSection(sheet, dataStartRow, comboPallets, mixPall);
  writeRightFullPallSection(sheet, dataStartRow, fullPallets);
  clearCustomRowHeights(sheet, dataStartRow, maxClearRow);

  if (debugInfo) {
    debugInfo.kundMatch = {
      requested: orderData?.kund || '',
      matchedHeaderRow: kundHeader.row,
      matchedHeaderColumn: kundHeader.col,
      matchedKundLabel: kundHeader.kund,
      detectedHeaderRow: headerRow,
      dataStartRow,
      dataEndRow: maxClearRow,
      nextTableHeaderRow: nextHeaderRow
    };
  }
};

const loadTemplateWorkbook = async ({ templatePath, templateFile }) => {
  if (templateFile) {
    const fileBuffer = await templateFile.arrayBuffer();
    return XlsxPopulate.fromDataAsync(fileBuffer);
  }

  if (!templatePath) {
    throw new Error('Template path is not configured.');
  }

  const cacheBustedTemplatePath = templatePath.includes('?')
    ? `${templatePath}&_ts=${Date.now()}`
    : `${templatePath}?_ts=${Date.now()}`;

  const response = await fetch(cacheBustedTemplatePath, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Template not found at ${templatePath} (HTTP ${response.status}).`);
  }

  const buffer = await response.arrayBuffer();
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Templatefilen är tom eller kunde inte läsas.');
  }

  return XlsxPopulate.fromDataAsync(buffer);
};

const triggerBlobDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const getTemplateSheetNames = async ({ templatePath, templateFile }) => {
  const workbook = await loadTemplateWorkbook({ templatePath, templateFile });
  const sheetNames = workbook.sheets().map((sheet) => sheet.name()).filter(Boolean);

  if (sheetNames.length === 0) {
    throw new Error('Mallen innehåller inga läsbara blad (sheets). Kontrollera att filen är en giltig .xlsx.');
  }

  return sheetNames;
};

export const getTemplateTableNames = async ({ templatePath, templateFile, sheetName }) => {
  if (!sheetName) return [];

  const specialTables = getSpecialTableNamesForSheet(sheetName);
  if (specialTables.length > 0) {
    return specialTables;
  }

  const workbook = await loadTemplateWorkbook({ templatePath, templateFile });
  const sheet = workbook.sheet(sheetName);

  if (!sheet) {
    throw new Error(`Blad '${sheetName}' hittades inte i mallen.`);
  }

  const kundHeaders = findKundHeaders(sheet)
    .map((header) => header.kund)
    .filter((value) => String(value || '').trim().length > 0);

  return [...new Set(kundHeaders)];
};

export const exportResultsToExcelTemplate = async ({
  orderData,
  palletMode,
  tableName,
  fullPallets,
  comboPallets,
  mixPall,
  templateFile,
  sheetName,
  debug = false,
  templatePath = '/templates/Plocklist-Template.xlsx'
}) => {
  const workbook = await loadTemplateWorkbook({ templatePath, templateFile });
  const availableSheetNames = workbook.sheets().map((sheet) => sheet.name());
  const requestedSheetName = sheetName || availableSheetNames[0];
  const sheet = workbook.sheet(requestedSheetName);

  if (!sheet) {
    throw new Error(`Blad '${requestedSheetName}' hittades inte i mallen.`);
  }

  const debugInfo = debug ? {
    selectedSheet: requestedSheetName,
    availableSheets: availableSheetNames,
    templateSource: templateFile ? `uploaded:${templateFile.name}` : templatePath,
    timestamp: new Date().toISOString()
  } : null;

  fillTemplatePattern({
    sheet,
    sheetName: requestedSheetName,
    tableName,
    orderData,
    palletMode,
    comboPallets,
    fullPallets,
    mixPall,
    debugInfo
  });

  const datePart = new Date().toISOString().split('T')[0];
  const fileName = `Plocklistor för avgång ${datePart}.xlsx`;

  const outputBlob = await workbook.outputAsync();
  triggerBlobDownload(outputBlob, fileName);

  if (debug && debugInfo) {
    const debugBlob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
    triggerBlobDownload(debugBlob, `Plocklistor för avgång ${datePart}.debug.json`);
    console.info('Export debug info:', debugInfo);
  }
};
