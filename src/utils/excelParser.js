import * as XLSX from 'xlsx';

/**
 * Helper function to get cell value, handling merged cells
 * @param {Object} worksheet - The worksheet object
 * @param {number} row - Row index (0-based)
 * @param {number} col - Column index (0-based)
 * @returns {any} - Cell value or null
 */
const getCellValue = (worksheet, row, col) => {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = worksheet[cellAddress];
  
  if (cell && cell.v !== undefined) {
    return cell.v;
  }
  
  // Check if this cell is part of a merged range
  if (worksheet['!merges']) {
    for (const merge of worksheet['!merges']) {
      if (row >= merge.s.r && row <= merge.e.r && 
          col >= merge.s.c && col <= merge.e.c) {
        // This cell is in a merged range, get value from top-left cell
        const mergeAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        const mergeCell = worksheet[mergeAddress];
        return mergeCell ? mergeCell.v : null;
      }
    }
  }
  
  return null;
};

/**
 * Helper function to check if a string matches article number keywords
 * @param {string} str - String to check
 * @returns {boolean}
 */
const isArticleNumberHeader = (str) => {
  if (!str) return false;
  const normalized = str.toString().toLowerCase().trim().replace(/\s+/g, '');
  
  // Exact matches only
  const exactMatches = [
    'artikelnummer',
    'artikelnr',
    'artnr',
    'art.nr',
    'levartikel',
    'levartikelnr',
    'lev.artikel',
    'article',
    'articlenumber',
    'itemnumber',
    'produktnummer',
    'produktnr',
    'varunummer'
  ];
  
  // Check exact matches (normalize by removing dots and spaces)
  return exactMatches.some(match => normalized === match.replace(/[.\s]/g, ''));
};

/**
 * Helper function to check if a string matches quantity keywords
 * @param {string} str - String to check
 * @returns {boolean}
 */
const isQuantityHeader = (str) => {
  if (!str) return false;
  const normalized = str.toString().toLowerCase().trim().replace(/\s+/g, '');
  
  // Exact matches only
  const exactMatches = [
    'beställdadfp',
    'beställda',
    'kollin',
    'antal',
    'quantity',
    'qty',
    'mängd',
    'dfp',
    'kolli',
    'boxes',
    'lådor'
  ];
  
  // Check exact matches (normalize by removing dots and spaces)
  return exactMatches.some(match => normalized === match.replace(/[.\s]/g, ''));
};

/**
 * Parse Excel file and extract order data
 * Expected columns: Artikelnummer, Beställda DFP
 * @param {File} file - The Excel file to parse
 * @returns {Promise<Array>} - Array of { artikelnummer, beställdaDFP }
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Get worksheet range
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const maxSearchRows = Math.min(50, range.e.r + 1);
        const maxSearchCols = Math.min(50, range.e.c + 1);
        
        // Search for header row using direct cell access (handles merged cells)
        let headerRowIndex = -1;
        let artikelnummerIndex = -1;
        let beställdaDFPIndex = -1;
        
        for (let rowIdx = 0; rowIdx < maxSearchRows; rowIdx++) {
          let foundArticle = -1;
          let foundQuantity = -1;
          
          for (let colIdx = 0; colIdx < maxSearchCols; colIdx++) {
            const cellValue = getCellValue(worksheet, rowIdx, colIdx);
            
            if (cellValue && foundArticle === -1 && isArticleNumberHeader(cellValue)) {
              foundArticle = colIdx;
            }
            
            if (cellValue && foundQuantity === -1 && isQuantityHeader(cellValue)) {
              foundQuantity = colIdx;
            }
            
            // If we found both, we're done with this row
            if (foundArticle !== -1 && foundQuantity !== -1) {
              break;
            }
          }
          
          // If we found both columns in this row, it's our header
          if (foundArticle !== -1 && foundQuantity !== -1) {
            headerRowIndex = rowIdx;
            artikelnummerIndex = foundArticle;
            beställdaDFPIndex = foundQuantity;
            break;
          }
        }

        if (headerRowIndex === -1 || artikelnummerIndex === -1 || beställdaDFPIndex === -1) {
          // Provide more helpful error message with actual cell values found
          let foundHeaders = [];
          for (let r = 0; r < Math.min(5, maxSearchRows); r++) {
            let rowHeaders = [];
            for (let c = 0; c < Math.min(10, maxSearchCols); c++) {
              const val = getCellValue(worksheet, r, c);
              if (val) rowHeaders.push(val.toString());
            }
            if (rowHeaders.length > 0) {
              foundHeaders.push(`Row ${r + 1}: ${rowHeaders.join(', ')}`);
            }
          }
          reject(new Error(`Could not find required columns. Found headers:\n${foundHeaders.join('\n')}\n\nNeed columns containing: "Artikelnummer" or "Lev artikel" AND "Beställda DFP" or "Kollin" or "Antal"`));
          return;
        }

        // Extract data starting from row after header
        const orderData = [];
        for (let i = headerRowIndex + 1; i <= range.e.r; i++) {
          const artikelnummer = getCellValue(worksheet, i, artikelnummerIndex);
          const beställdaDFP = getCellValue(worksheet, i, beställdaDFPIndex);
          
          // Skip if either value is missing or invalid
          if (artikelnummer === undefined || artikelnummer === null || 
              beställdaDFP === undefined || beställdaDFP === null) {
            continue;
          }

          // Convert to numbers
          const artNum = parseInt(artikelnummer, 10);
          const boxCount = parseInt(beställdaDFP, 10);
          
          // Skip only if box count is invalid (but keep invalid artikelnummer for error reporting)
          if (isNaN(boxCount) || boxCount <= 0) {
            continue;
          }

          // If artikelnummer is invalid (NaN), keep the original value as string for error reporting
          orderData.push({
            artikelnummer: isNaN(artNum) ? String(artikelnummer) : artNum,
            beställdaDFP: boxCount,
          });
        }

        if (orderData.length === 0) {
          reject(new Error('No valid data found in Excel file'));
          return;
        }

        resolve(orderData);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validate Excel file format
 * @param {File} file - The file to validate
 * @returns {boolean}
 */
export const validateExcelFile = (file) => {
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
  ];
  
  const validExtensions = ['.xlsx', '.xls', '.xlsm'];
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  return validTypes.includes(file.type) || validExtensions.includes(fileExtension);
};
