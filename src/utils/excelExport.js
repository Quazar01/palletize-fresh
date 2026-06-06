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

const LIGHT_GREY_FILL = {
  type: 'solid',
  color: 'D9D9D9'
};

const TEMPLATE_VERSION_MARKER_VALUE = 'PLG_TEMPLATE_V1';
const TEMPLATE_VERSION_DEFINED_NAME = '_PLG_TEMPLATE_VERSION';
const LEGACY_TEMPLATE_VERSION_MARKER_CELL = 'XFD1';

const sanitizeFilenamePart = (value) => {
  return String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_');
};

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateForFilename = (value) => {
  if (!value) return formatLocalDate(new Date());

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatLocalDate(value);
  }

  const raw = String(value).trim();
  if (!raw) return formatLocalDate(new Date());

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dayFirst = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    let year = Number(dayFirst[3]);
    if (year < 100) {
      year += year >= 70 ? 1900 : 2000;
    }

    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return formatLocalDate(parsed);
    }
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return formatLocalDate(parsed);
  }

  return formatLocalDate(new Date());
};

const buildExportFileName = (orderData) => {
  const customer = sanitizeFilenamePart(orderData?.kund || 'Kund') || 'Kund';
  const datePart = parseDateForFilename(orderData?.datum);
  return `${customer}_${datePart}.xlsx`;
};

const buildCombinedExportFileName = () => {
  return `Plocklistor för avgång ${formatLocalDate(new Date())}.xlsx`;
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

const applyLightGreyFill = (sheet, row, columns = []) => {
  columns.forEach((col) => {
    sheet.cell(row, col).style('fill', LIGHT_GREY_FILL);
  });
};

const toSetFromIndexMap = (source, key) => {
  const raw = source?.[String(key)] ?? source?.[key];
  return new Set(Array.isArray(raw) ? raw : []);
};

const isFullPalletBoxMarked = (uiState, palletIndex, boxIndex) => {
  const checked = toSetFromIndexMap(uiState?.checkedPallets, palletIndex);
  const plocked = toSetFromIndexMap(uiState?.plockedPallets, palletIndex);
  return checked.has(boxIndex) || plocked.has(boxIndex);
};

const resolveRedHeightUnits = (item) => {
  if (!item || typeof item !== 'object') return '';

  const candidateValues = [
    item.hojdenIRodaBackarEnhet,
    item.hojdIRodaBackarEnhet,
    item.redHeightUnits,
    item.height_red_units,
    item.leftHojd
  ];

  for (const value of candidateValues) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  const boxCount = Number(item.boxCount);
  const boxesPerRow = Number(item.boxConfig?.boxesPerRow);
  const redUnitFactor = Number(item.boxConfig?.heightInRedBoxUnits);
  if (
    Number.isFinite(boxCount) &&
    Number.isFinite(boxesPerRow) &&
    boxesPerRow > 0 &&
    Number.isFinite(redUnitFactor)
  ) {
    const stackHeight = Math.ceil(boxCount / boxesPerRow);
    return stackHeight * redUnitFactor;
  }

  const heightInRedUnits = Number(item.heightInRedUnits);
  if (Number.isFinite(heightInRedUnits)) {
    return Math.max(0, heightInRedUnits - 1);
  }

  return '';
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

const findDataEndRowByRightArtColumn = (sheet, startRow, rightArtCol, endLimitRow = null) => {
  const usedRange = sheet.usedRange();
  const lastUsedRow = usedRange ? usedRange.endCell().rowNumber() : startRow + 220;
  const rawSearchEnd = Math.min(lastUsedRow, startRow + 500);
  const searchEnd = endLimitRow ? Math.min(rawSearchEnd, endLimitRow) : rawSearchEnd;

  for (let row = startRow; row <= searchEnd; row += 1) {
    const marker = getCellString(sheet, row, rightArtCol);
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

const resolveDateCellOverride = ({ sheetName, tableName }) => {
  const normalizedSheetName = normalizeCustomerText(sheetName || '');
  const normalizedTableName = normalizeCustomerText(tableName || '');

  if (
    normalizedSheetName === 'lidl' &&
    (normalizedTableName === 'ldle orebro' || normalizedTableName === 'lidl orebro')
  ) {
    return { row: 63, col: 10 };
  }

  return null;
};

const updateKundAndDateHeaderRow = (sheet, orderData, kundHeader, { sheetName = '', tableName = '' } = {}) => {
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

  const dateOverride = resolveDateCellOverride({ sheetName, tableName });
  let dateCol = dateOverride?.col ?? null;
  let dateRow = dateOverride?.row ?? kundRow;

  if (dateCol === null) {
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

  setCellValue(sheet, dateRow, dateCol, providedDate);
};

const flattenComboItems = (combo, comboIndex, uiState) => {
  const rows = [];

  const checkedSkvett = toSetFromIndexMap(uiState?.checkedComboSkvettpalls, comboIndex);
  const plockedSkvett = toSetFromIndexMap(uiState?.plockedComboSkvettpalls, comboIndex);
  const checkedMix = toSetFromIndexMap(uiState?.checkedMixPallItems, comboIndex);
  const plockedMix = toSetFromIndexMap(uiState?.plockedMixPallItems, comboIndex);

  const hasMixPall = combo.skvettpalls.some((item) => item.isMixPall);

  if (hasMixPall) {
    let mixPallHighlighted = false;
    combo.skvettpalls.forEach((item) => {
      if (!item.isMixPall || !Array.isArray(item.mixPallItems)) return;
      const allMixItemsMarked =
        item.mixPallItems.length > 0 &&
        item.mixPallItems.every((mixItem) =>
          checkedMix.has(mixItem.artikelnummer) || plockedMix.has(mixItem.artikelnummer)
        );
      if (allMixItemsMarked) {
        mixPallHighlighted = true;
      }
    });

    rows.push({ art: 'Blandpall', dfp: '', isHighlighted: mixPallHighlighted });
  }

  combo.skvettpalls.forEach((item, skvettIndex) => {
    if (item.isMixPall && Array.isArray(item.mixPallItems)) {
      item.mixPallItems.forEach((mixItem) => {
        const mixItemHighlighted =
          checkedMix.has(mixItem.artikelnummer) || plockedMix.has(mixItem.artikelnummer);
        rows.push({ art: mixItem.artikelnummer, dfp: mixItem.boxCount, isHighlighted: mixItemHighlighted });
      });
      return;
    }

    const skvettHighlighted = checkedSkvett.has(skvettIndex) || plockedSkvett.has(skvettIndex);
    rows.push({ art: item.artikelnummer, dfp: item.boxCount, isHighlighted: skvettHighlighted });
  });

  return rows;
};

const writeLeftComboSection = (sheet, startRow, comboPallets, mixPall, uiState) => {
  const standAloneCombos = comboPallets.filter((combo) => combo.skvettpalls.length === 1);

  const multiCombos = comboPallets.filter((combo) => combo.skvettpalls.length > 1);

  let row = startRow;

  standAloneCombos.forEach((combo) => {
    const comboIndex = comboPallets.indexOf(combo);
    const items = flattenComboItems(combo, comboIndex, uiState);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, COL.LEFT_ART, item.art);
      setCellValue(sheet, row, COL.LEFT_DFP, item.dfp);
      setCellValue(sheet, row, COL.LEFT_PALL, index === items.length - 1 ? combo.skvettpalls.length : '');
      if (item.isHighlighted) {
        applyLightGreyFill(sheet, row, [COL.LEFT_ART, COL.LEFT_DFP, COL.LEFT_PALL]);
      }
      row += 1;
    });
  });

  if (standAloneCombos.length > 0 && multiCombos.length > 0) {
    row += 1;
  }

  multiCombos.forEach((combo) => {
    const comboIndex = comboPallets.indexOf(combo);
    const items = flattenComboItems(combo, comboIndex, uiState);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, COL.LEFT_ART, item.art);
      setCellValue(sheet, row, COL.LEFT_DFP, item.dfp);
      setCellValue(sheet, row, COL.LEFT_PALL, index === items.length - 1 ? combo.skvettpalls.length : '');
      if (item.isHighlighted) {
        applyLightGreyFill(sheet, row, [COL.LEFT_ART, COL.LEFT_DFP, COL.LEFT_PALL]);
      }
      row += 1;
    });

    row += 1;
  });

  if (mixPall.length > 0) {
    const standaloneCheckedMix = new Set(uiState?.checkedStandaloneMixItems || []);
    const standalonePlockedMix = new Set(uiState?.plockedStandaloneMixItems || []);
    const hasStandaloneMarked = mixPall.some((item) =>
      standaloneCheckedMix.has(item.artikelnummer) || standalonePlockedMix.has(item.artikelnummer)
    );

    row += 2;
    setCellValue(sheet, row, COL.LEFT_ART, 'Blandpall');
    setCellValue(sheet, row, COL.LEFT_PALL, 1);
    if (hasStandaloneMarked) {
      applyLightGreyFill(sheet, row, [COL.LEFT_ART, COL.LEFT_DFP, COL.LEFT_PALL]);
    }
    row += 1;

    mixPall.forEach((item) => {
      setCellValue(sheet, row, COL.LEFT_ART, item.artikelnummer);
      setCellValue(sheet, row, COL.LEFT_DFP, item.boxCount);
      if (standaloneCheckedMix.has(item.artikelnummer) || standalonePlockedMix.has(item.artikelnummer)) {
        applyLightGreyFill(sheet, row, [COL.LEFT_ART, COL.LEFT_DFP, COL.LEFT_PALL]);
      }
      row += 1;
    });
  }

  return Math.max(startRow, row - 1);
};

const writeRightFullPallSection = (sheet, startRow, fullPallets, uiState) => {
  let row = startRow;

  fullPallets.forEach((pallet, palletIndex) => {
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
      const shouldBeItalic = Boolean(pallet.isSingleSkvettpall) || count !== pallet.boxesPerPallet;
      if (shouldBeItalic) {
        sheet.cell(localRow, col).style('italic', true);
      }
      if (isFullPalletBoxMarked(uiState, palletIndex, index)) {
        applyLightGreyFill(sheet, localRow, [col]);
      }
    });

    row += Math.ceil(boxCounts.length / slotsPerRow);
    row += 1;
  });

  return Math.max(startRow, row - 1);
};

const writeLeftComboSectionCustom = (sheet, startRow, comboPallets, mixPall, columns, uiState) => {
  const artCol = columns?.artCol ?? COL.LEFT_ART;
  const dfpCol = columns?.dfpCol ?? COL.LEFT_DFP;
  const pallCol = columns?.pallCol ?? COL.LEFT_PALL;

  const standAloneCombos = comboPallets.filter((combo) => combo.skvettpalls.length === 1);
  const multiCombos = comboPallets.filter((combo) => combo.skvettpalls.length > 1);

  let row = startRow;

  standAloneCombos.forEach((combo) => {
    const comboIndex = comboPallets.indexOf(combo);
    const items = flattenComboItems(combo, comboIndex, uiState);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, artCol, item.art);
      setCellValue(sheet, row, dfpCol, item.dfp);
      setCellValue(sheet, row, pallCol, index === items.length - 1 ? combo.skvettpalls.length : '');
      if (item.isHighlighted) {
        applyLightGreyFill(sheet, row, [artCol, dfpCol, pallCol]);
      }
      row += 1;
    });
  });

  if (standAloneCombos.length > 0 && multiCombos.length > 0) {
    row += 1;
  }

  multiCombos.forEach((combo) => {
    const comboIndex = comboPallets.indexOf(combo);
    const items = flattenComboItems(combo, comboIndex, uiState);
    if (items.length === 0) return;

    items.forEach((item, index) => {
      setCellValue(sheet, row, artCol, item.art);
      setCellValue(sheet, row, dfpCol, item.dfp);
      setCellValue(sheet, row, pallCol, index === items.length - 1 ? combo.skvettpalls.length : '');
      if (item.isHighlighted) {
        applyLightGreyFill(sheet, row, [artCol, dfpCol, pallCol]);
      }
      row += 1;
    });

    row += 1;
  });

  if (mixPall.length > 0) {
    const standaloneCheckedMix = new Set(uiState?.checkedStandaloneMixItems || []);
    const standalonePlockedMix = new Set(uiState?.plockedStandaloneMixItems || []);
    const hasStandaloneMarked = mixPall.some((item) =>
      standaloneCheckedMix.has(item.artikelnummer) || standalonePlockedMix.has(item.artikelnummer)
    );

    row += 2;
    setCellValue(sheet, row, artCol, 'Blandpall');
    setCellValue(sheet, row, pallCol, 1);
    if (hasStandaloneMarked) {
      applyLightGreyFill(sheet, row, [artCol, dfpCol, pallCol]);
    }
    row += 1;

    mixPall.forEach((item) => {
      setCellValue(sheet, row, artCol, item.artikelnummer);
      setCellValue(sheet, row, dfpCol, item.boxCount);
      if (standaloneCheckedMix.has(item.artikelnummer) || standalonePlockedMix.has(item.artikelnummer)) {
        applyLightGreyFill(sheet, row, [artCol, dfpCol, pallCol]);
      }
      row += 1;
    });
  }

  return Math.max(startRow, row - 1);
};

const writeRightFullPallSectionCustom = (sheet, startRow, fullPallets, columns, uiState) => {
  const artCol = columns?.artCol ?? COL.RIGHT_ART;
  const startCol = columns?.startCol ?? COL.RIGHT_START;
  const endCol = columns?.endCol ?? COL.RIGHT_END;
  let row = startRow;

  fullPallets.forEach((pallet, palletIndex) => {
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
      const shouldBeItalic = Boolean(pallet.isSingleSkvettpall) || count !== pallet.boxesPerPallet;
      if (shouldBeItalic) {
        sheet.cell(localRow, col).style('italic', true);
      }
      if (isFullPalletBoxMarked(uiState, palletIndex, index)) {
        applyLightGreyFill(sheet, localRow, [col]);
      }
    });

    row += Math.ceil(boxCounts.length / slotsPerRow);
    row += 1;
  });

  return Math.max(startRow, row - 1);
};

const writeHelsingborgEnkelSection = (sheet, startRow, comboPallets, mixPall, columns, uiState) => {
  const artCol = columns.artCol;
  const dfpCol = columns.dfpCol;
  const hojdCol = columns.hojdCol;
  const clearToCol = columns.clearToCol || hojdCol;
  let row = startRow;

  const enkelRows = [];
  comboPallets.forEach((combo, comboIndex) => {
    const checkedSkvett = toSetFromIndexMap(uiState?.checkedComboSkvettpalls, comboIndex);
    const plockedSkvett = toSetFromIndexMap(uiState?.plockedComboSkvettpalls, comboIndex);
    const checkedMix = toSetFromIndexMap(uiState?.checkedMixPallItems, comboIndex);
    const plockedMix = toSetFromIndexMap(uiState?.plockedMixPallItems, comboIndex);

    combo.skvettpalls.forEach((item, skvettIndex) => {
      if (item.isMixPall) {
        const totalBoxes = (item.mixPallItems || []).reduce((sum, mixItem) => sum + (mixItem.boxCount || 0), 0);
        const allMixItemsMarked =
          (item.mixPallItems || []).length > 0 &&
          (item.mixPallItems || []).every((mixItem) =>
            checkedMix.has(mixItem.artikelnummer) || plockedMix.has(mixItem.artikelnummer)
          );
        enkelRows.push({
          art: 'Blandpall',
          dfp: totalBoxes,
          hojd: resolveRedHeightUnits(item),
          isHighlighted: allMixItemsMarked
        });
        return;
      }

      enkelRows.push({
        art: item.artikelnummer,
        dfp: item.boxCount,
        hojd: resolveRedHeightUnits(item),
        isHighlighted: checkedSkvett.has(skvettIndex) || plockedSkvett.has(skvettIndex)
      });
    });
  });

  if (mixPall.length > 0) {
    const totalBoxes = mixPall.reduce((sum, item) => sum + (item.boxCount || 0), 0);
    const stackHeight = Math.ceil(totalBoxes / 8);
    const standaloneCheckedMix = new Set(uiState?.checkedStandaloneMixItems || []);
    const standalonePlockedMix = new Set(uiState?.plockedStandaloneMixItems || []);
    const hasStandaloneMarked = mixPall.some((item) =>
      standaloneCheckedMix.has(item.artikelnummer) || standalonePlockedMix.has(item.artikelnummer)
    );

    enkelRows.push({ art: 'Blandpall', dfp: totalBoxes, hojd: 1 + stackHeight, isHighlighted: hasStandaloneMarked });
  }

  const clearEndRow = Math.max(startRow + Math.max(enkelRows.length + 20, 30), 80);
  clearBlockRange(sheet, startRow, clearEndRow, artCol, clearToCol);

  enkelRows.forEach((item) => {
    setCellValue(sheet, row, artCol, item.art);
    setCellValue(sheet, row, dfpCol, item.dfp);
    setCellValue(sheet, row, hojdCol, item.hojd);
    if (typeof item.hojd === 'number' && Number.isFinite(item.hojd)) {
      sheet.cell(row, hojdCol).style('numberFormat', '0.00');
    }
    if (item.isHighlighted) {
      applyLightGreyFill(sheet, row, [artCol, dfpCol, hojdCol]);
    }
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
        fullColumns: { artCol: 11, startCol: 13, endCol: 16, clearEndCol: 17 },
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
        dateCol: 30,
        requiredPalletMode: 'helsingborg',
        enkelColumns: { artCol: 18, dfpCol: 20, hojdCol: 21, clearToCol: 23 },
        fullColumns: { artCol: 28, startCol: 30, endCol: 33, clearEndCol: 34 },
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
        fullColumns: { artCol: 45, startCol: 47, endCol: 50, clearEndCol: 51 },
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
  uiState,
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

      writeLeftComboSection(sheet, dataStartRow, comboPallets, mixPall, uiState);
      writeRightFullPallSection(sheet, specialLayout.fullStartRow, fullPallets, uiState);
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
      const layoutEndRow = specialLayout.clearEndRow || 120;
      const fullClearEndCol = specialLayout.fullColumns.clearEndCol || specialLayout.fullColumns.endCol;
      const maxClearRow = findDataEndRowByRightArtColumn(
        sheet,
        specialLayout.fullStartRow,
        specialLayout.fullColumns.artCol,
        layoutEndRow
      );
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
        fullClearEndCol
      );

      writeLeftComboSectionCustom(
        sheet,
        specialLayout.comboStartRow,
        comboPallets,
        mixPall,
        specialLayout.comboColumns,
        uiState
      );
      writeRightFullPallSectionCustom(
        sheet,
        specialLayout.fullStartRow,
        fullPallets,
        specialLayout.fullColumns,
        uiState
      );
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
      const layoutEndRow = specialLayout.clearEndRow || 120;
      const fullClearEndCol = specialLayout.fullColumns.clearEndCol || specialLayout.fullColumns.endCol;
      const maxClearRow = findDataEndRowByRightArtColumn(
        sheet,
        specialLayout.fullStartRow,
        specialLayout.fullColumns.artCol,
        layoutEndRow
      );
      clearBlockRange(
        sheet,
        specialLayout.fullStartRow,
        maxClearRow,
        specialLayout.fullColumns.artCol,
        fullClearEndCol
      );

      const dataEndRow = writeHelsingborgEnkelSection(
        sheet,
        specialLayout.enkelStartRow,
        comboPallets,
        mixPall,
        specialLayout.enkelColumns,
        uiState
      );

      const fullEndRow = writeRightFullPallSectionCustom(
        sheet,
        specialLayout.fullStartRow,
        fullPallets,
        specialLayout.fullColumns,
        uiState
      );

      if (debugInfo) {
        debugInfo.specialTable = {
          sheetName,
          requestedCustomer: orderData?.kund || '',
          matchedTable: specialLayout.tableName,
          enkelStartCell: `R${specialLayout.enkelStartRow}`,
          fullStartCell: `AB${specialLayout.fullStartRow}`,
          dateCell: `${columnNumberToName(specialLayout.dateCol)}${specialLayout.dateRow}`,
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

  updateKundAndDateHeaderRow(sheet, orderData, kundHeader, { sheetName, tableName });

  const headerRow = findTemplateHeaderRow(sheet, kundHeader.row + 1, tableSearchEnd);
  if (!headerRow) {
    throw new Error(`Kunde inte hitta rubrikraden (Art nr/DFP/pall) för Kund: ${orderData?.kund || '-'}.`);
  }

  const dataStartRow = headerRow + 1;
  const maxClearRow = findDataEndRow(sheet, dataStartRow, tableSearchEnd);

  clearColumnRange(sheet, dataStartRow, maxClearRow, [COL.LEFT_ART, COL.LEFT_DFP, COL.LEFT_PALL]);
  clearBlockRange(sheet, dataStartRow, maxClearRow, COL.RIGHT_ART, COL.RIGHT_END);

  writeLeftComboSection(sheet, dataStartRow, comboPallets, mixPall, uiState);
  writeRightFullPallSection(sheet, dataStartRow, fullPallets, uiState);
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

const setWorkbookTemplateVersionMarker = (workbook) => {
  const firstSheet = workbook.sheets()[0];
  if (!firstSheet) return;

  firstSheet.cell(LEGACY_TEMPLATE_VERSION_MARKER_CELL).value(TEMPLATE_VERSION_MARKER_VALUE);
};

const normalizeTemplateVersionMarker = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('#')) {
    return '';
  }

  return raw
    .replace(/^=/, '')
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();
};

const isTemplateVersionMarkerValid = (marker) => {
  const normalized = normalizeTemplateVersionMarker(marker);
  return (
    normalized === TEMPLATE_VERSION_MARKER_VALUE ||
    normalized.includes(TEMPLATE_VERSION_MARKER_VALUE)
  );
};

const getWorkbookTemplateVersionMarker = (workbook) => {
  let definedNameValue;
  try {
    definedNameValue = workbook.definedName(TEMPLATE_VERSION_DEFINED_NAME);
  } catch {
    definedNameValue = '';
  }

  if (typeof definedNameValue === 'string' && definedNameValue.trim()) {
    return normalizeTemplateVersionMarker(definedNameValue);
  }

  const firstSheet = workbook.sheets()[0];
  if (!firstSheet) return '';

  const rawLegacyValue = firstSheet.cell(LEGACY_TEMPLATE_VERSION_MARKER_CELL).value();
  return normalizeTemplateVersionMarker(rawLegacyValue);
};

const isLegacyExportWorkbook = (workbook) => {
  const activeSheet = workbook.activeSheet();
  if (!activeSheet) return false;

  const hasKundHeader = findKundHeaders(activeSheet).length > 0;
  const hasTemplateColumns = findTemplateHeaderRow(activeSheet, 1, 300) !== null;

  return hasKundHeader && hasTemplateColumns;
};

const isArticleLikeValue = (value) => {
  if (value === undefined || value === null) return false;

  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }

  const text = String(value).trim();
  if (!text) return false;

  const normalized = normalizeCustomerText(text);
  if (!normalized) return false;

  if (normalized === 'blandpall') return true;
  if (/^\d+$/.test(normalized)) return true;

  if (
    normalized.includes('art nr') ||
    normalized.includes('summa') ||
    normalized.includes('totalt') ||
    normalized.includes('streckkod') ||
    normalized.includes('sign') ||
    normalized.includes('kund') ||
    normalized.includes('dfp')
  ) {
    return false;
  }

  return false;
};

const hasArticleDataInRegionColumns = (sheet, startRow, endRow, columns) => {
  for (let row = startRow; row <= endRow; row += 1) {
    for (const col of columns) {
      if (isArticleLikeValue(sheet.cell(row, col).value())) {
        return true;
      }
    }
  }

  return false;
};

const buildGenericTableRegions = (sheet) => {
  const headers = findKundHeaders(sheet).sort((a, b) => a.row - b.row);
  if (headers.length === 0) return [];

  const regions = [];

  headers.forEach((header, index) => {
    const nextHeader = headers[index + 1];
    const tableSearchEnd = nextHeader ? nextHeader.row - 1 : header.row + 500;
    const headerRow = findTemplateHeaderRow(sheet, header.row + 1, tableSearchEnd);

    if (!headerRow) return;

    const dataStartRow = headerRow + 1;
    const dataEndRow = findDataEndRow(sheet, dataStartRow, tableSearchEnd);
    const isFilled = hasArticleDataInRegionColumns(sheet, dataStartRow, dataEndRow, [
      COL.LEFT_ART,
      COL.RIGHT_ART
    ]);
    if (!isFilled) return;

    regions.push({
      key: `kund:${normalizeCustomerText(header.kund || header.raw || `row-${header.row}`)}`,
      startRow: header.row,
      endRow: dataEndRow,
      startCol: COL.LEFT_ART,
      endCol: COL.RIGHT_END
    });
  });

  return regions;
};

const buildSpecialSheetTableRegions = (sheet, sheetName) => {
  const tableNames = getSpecialTableNamesForSheet(sheetName);
  if (tableNames.length === 0) return [];

  const regions = [];

  tableNames.forEach((tableName) => {
    const layout = resolveSpecialTableLayout(sheetName, { kund: '' }, tableName);
    if (!layout) return;

    if (layout.type === 'defaultColumns') {
      const dataStartRow = layout.comboStartRow;
      const maxClearRow = layout.nextComboStartRow
        ? layout.nextComboStartRow - 1
        : findDataEndRow(sheet, dataStartRow);

      const isFilled = hasArticleDataInRegionColumns(sheet, dataStartRow, maxClearRow, [
        COL.LEFT_ART,
        COL.RIGHT_ART
      ]);

      if (!isFilled) return;

      regions.push({
        key: `table:${normalizeCustomerText(layout.tableName)}`,
        startRow: Math.min(layout.dateRow || dataStartRow, dataStartRow),
        endRow: maxClearRow,
        startCol: COL.LEFT_ART,
        endCol: COL.RIGHT_END
      });
      return;
    }

    if (layout.type === 'customComboAndFull') {
      const maxClearRow = layout.clearEndRow || 120;
      const comboCols = [layout.comboColumns.artCol];
      const fullCols = [layout.fullColumns.artCol];

      const isFilled =
        hasArticleDataInRegionColumns(sheet, layout.comboStartRow, maxClearRow, comboCols) ||
        hasArticleDataInRegionColumns(sheet, layout.fullStartRow, maxClearRow, fullCols);

      if (!isFilled) return;

      regions.push({
        key: `table:${normalizeCustomerText(layout.tableName)}`,
        startRow: Math.min(layout.dateRow || layout.comboStartRow, layout.comboStartRow),
        endRow: maxClearRow,
        startCol: Math.min(layout.comboColumns.pallCol, layout.comboColumns.artCol, layout.comboColumns.dfpCol),
        endCol: Math.max(layout.fullColumns.endCol, layout.fullColumns.artCol)
      });
      return;
    }

    if (layout.type === 'helsingborgEnkel') {
      const maxClearRow = layout.clearEndRow || 120;
      const enkelCols = [layout.enkelColumns.artCol];
      const fullCols = [layout.fullColumns.artCol];

      const isFilled =
        hasArticleDataInRegionColumns(sheet, layout.enkelStartRow, maxClearRow, enkelCols) ||
        hasArticleDataInRegionColumns(sheet, layout.fullStartRow, maxClearRow, fullCols);

      if (!isFilled) return;

      regions.push({
        key: `table:${normalizeCustomerText(layout.tableName)}`,
        startRow: Math.min(layout.dateRow || layout.enkelStartRow, layout.enkelStartRow),
        endRow: maxClearRow,
        startCol: Math.min(layout.enkelColumns.artCol, layout.enkelColumns.dfpCol),
        endCol: Math.max(layout.fullColumns.endCol, layout.fullColumns.artCol)
      });
    }
  });

  return regions;
};

const getFilledTableRegionsForSheet = (sheet, sheetName) => {
  const specialRegions = buildSpecialSheetTableRegions(sheet, sheetName);
  if (specialRegions.length > 0) {
    return specialRegions;
  }

  return buildGenericTableRegions(sheet);
};

const copySheetRegionFromExportedFile = (sourceSheet, targetSheet, region) => {
  for (let row = region.startRow; row <= region.endRow; row += 1) {
    for (let col = region.startCol; col <= region.endCol; col += 1) {
      const sourceCell = sourceSheet.cell(row, col);
      const targetCell = targetSheet.cell(row, col);

      const targetFormula = targetCell.formula();
      if (typeof targetFormula === 'string' && targetFormula.trim().length > 0) {
        continue;
      }

      targetCell.value(sourceCell.value());

      const sourceFill = sourceCell.style('fill');
      if (sourceFill !== undefined) {
        targetCell.style('fill', sourceFill);
      }

      const sourceBold = sourceCell.style('bold');
      if (sourceBold !== undefined) {
        targetCell.style('bold', sourceBold);
      }

      const sourceItalic = sourceCell.style('italic');
      if (sourceItalic !== undefined) {
        targetCell.style('italic', sourceItalic);
      }
    }
  }
};

const autoFitRowsForRegions = (sheet, regions) => {
  if (!Array.isArray(regions) || regions.length === 0) return;

  regions.forEach((region) => {
    const startRow = Math.max(1, Number(region.startRow) || 1);
    const endRow = Math.max(startRow, Number(region.endRow) || startRow);

    for (let row = startRow; row <= endRow; row += 1) {
      const targetRow = sheet.row(row);

      if (typeof targetRow?.autoFit === 'function') {
        targetRow.autoFit();
      } else {
        targetRow.height(null);
      }
    }
  });
};

const applySheetSpecificAdjustments = (sheet, sheetName) => {
  const normalizedSheetName = normalizeCustomerText(sheetName);

  if (
    normalizedSheetName === 'dagab jonkoping + hassleholm' ||
    normalizedSheetName === 'hagad jonkoping + hassleholm'
  ) {
    const targetRow = sheet.row(57);
    if (typeof targetRow?.autoFit === 'function') {
      targetRow.autoFit();
      return;
    }

    targetRow.height(null);
  }
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

const saveBlobWithUserChoice = async (blob, fileName) => {
  if (typeof window === 'undefined' || typeof window.showSaveFilePicker !== 'function') {
    triggerBlobDownload(blob, fileName);
    return { saved: true, method: 'download' };
  }

  try {
    const fileHandle = await window.showSaveFilePicker({
      id: 'plocklista-export',
      startIn: 'downloads',
      suggestedName: fileName,
      types: [
        {
          description: 'Excel Workbook',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
          }
        }
      ]
    });

    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return { saved: true, method: 'picker' };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { saved: false, cancelled: true };
    }
    throw error;
  }
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
  uiState,
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

  workbook.activeSheet(sheet);
  sheet.tabSelected(true);

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
    uiState,
    debugInfo
  });

  applySheetSpecificAdjustments(sheet, requestedSheetName);
  setWorkbookTemplateVersionMarker(workbook);

  const fileName = buildExportFileName(orderData);

  const outputBlob = await workbook.outputAsync();
  const saveResult = await saveBlobWithUserChoice(outputBlob, fileName);

  if (!saveResult.saved) {
    return saveResult;
  }

  if (debug && debugInfo) {
    const datePart = parseDateForFilename(orderData?.datum);
    const debugBlob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' });
    triggerBlobDownload(debugBlob, `${sanitizeFilenamePart(orderData?.kund || 'Kund') || 'Kund'}_${datePart}.debug.json`);
    console.info('Export debug info:', debugInfo);
  }

  return saveResult;
};

export const combineExportedFilesIntoTemplate = async ({
  files,
  templateFile,
  templatePath = '/templates/Plocklist-Template.xlsx'
}) => {
  const uploadFiles = Array.isArray(files) ? files : [];
  if (uploadFiles.length === 0) {
    throw new Error('Välj minst en exporterad fil att kombinera.');
  }

  const outputWorkbook = await loadTemplateWorkbook({ templatePath, templateFile });
  const rejectedFiles = [];
  let processedCount = 0;
  let lastAppliedSheetName = '';

  for (const file of uploadFiles) {
    if (!file) continue;

    try {
      const fileBuffer = await file.arrayBuffer();
      const sourceWorkbook = await XlsxPopulate.fromDataAsync(fileBuffer);
      const versionMarker = getWorkbookTemplateVersionMarker(sourceWorkbook);

      if (versionMarker && !isTemplateVersionMarkerValid(versionMarker)) {
        rejectedFiles.push({
          fileName: file.name,
          reason: 'Fel mallversion'
        });
        continue;
      }

      if (!versionMarker && !isLegacyExportWorkbook(sourceWorkbook)) {
        rejectedFiles.push({
          fileName: file.name,
          reason: 'Fel mallversion'
        });
        continue;
      }

      const sourceActiveSheet = sourceWorkbook.activeSheet();
      const sourceActiveSheetName = sourceActiveSheet?.name?.();

      if (!sourceActiveSheet || !sourceActiveSheetName) {
        rejectedFiles.push({
          fileName: file.name,
          reason: 'Kunde inte läsa aktivt blad'
        });
        continue;
      }

      const targetSheet = outputWorkbook.sheet(sourceActiveSheetName);
      if (!targetSheet) {
        rejectedFiles.push({
          fileName: file.name,
          reason: `Blad '${sourceActiveSheetName}' saknas i målmall`
        });
        continue;
      }

      const regions = getFilledTableRegionsForSheet(sourceActiveSheet, sourceActiveSheetName);
      if (regions.length === 0) {
        rejectedFiles.push({
          fileName: file.name,
          reason: 'Kunde inte hitta en ifylld tabell i aktivt blad'
        });
        continue;
      }

      regions.forEach((region) => {
        copySheetRegionFromExportedFile(sourceActiveSheet, targetSheet, region);
      });

      autoFitRowsForRegions(targetSheet, regions);

      applySheetSpecificAdjustments(targetSheet, sourceActiveSheetName);

      processedCount += 1;
      lastAppliedSheetName = sourceActiveSheetName;
    } catch (error) {
      rejectedFiles.push({
        fileName: file.name,
        reason: error?.message || 'Kunde inte läsa filen'
      });
    }
  }

  if (processedCount === 0) {
    const details = rejectedFiles.map((item) => `${item.fileName}: ${item.reason}`).join('\n');
    throw new Error(`Inga giltiga filer kunde kombineras.\n${details}`);
  }

  if (lastAppliedSheetName) {
    const lastSheet = outputWorkbook.sheet(lastAppliedSheetName);
    if (lastSheet) {
      outputWorkbook.activeSheet(lastSheet);
      lastSheet.tabSelected(true);
    }
  }

  setWorkbookTemplateVersionMarker(outputWorkbook);

  const outputBlob = await outputWorkbook.outputAsync();
  const saveResult = await saveBlobWithUserChoice(outputBlob, buildCombinedExportFileName());

  return {
    ...saveResult,
    processedCount,
    rejectedFiles
  };
};
