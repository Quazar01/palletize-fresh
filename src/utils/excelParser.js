import * as XLSX from 'xlsx';

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
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file is empty or has no data'));
          return;
        }

        // Find column indices - exact match with specific column names
        const headers = jsonData[0];
        
        // Try to find Artikelnummer or Lev artikel column (case-insensitive, exact match)
        const artikelnummerIndex = headers.findIndex(h => {
          if (!h) return false;
          const headerStr = h.toString().toLowerCase().trim();
          return headerStr === 'artikelnummer' || 
                 headerStr === 'lev artikel' ||
                 headerStr === 'levartikel';
        });
        
        // Try to find Beställda DFP or Kollin column (case-insensitive, exact match)
        const beställdaDFPIndex = headers.findIndex(h => {
          if (!h) return false;
          const headerStr = h.toString().toLowerCase().trim();
          return headerStr === 'beställda dfp' || 
                 headerStr === 'beställdadfp' ||
                 headerStr === 'kollin';
        });

        if (artikelnummerIndex === -1 || beställdaDFPIndex === -1) {
          // Provide more helpful error message showing what columns were found
          const foundColumns = headers.filter(h => h).map(h => h.toString()).join(', ');
          reject(new Error(`Could not find required columns. Found columns: ${foundColumns}. Need: "Artikelnummer" or "Lev artikel" AND "Beställda DFP" or "Kollin"`));
          return;
        }

        // Extract data
        const orderData = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          if (!row || row.length === 0) continue;
          
          const artikelnummer = row[artikelnummerIndex];
          const beställdaDFP = row[beställdaDFPIndex];
          
          // Skip if either value is missing or invalid
          if (artikelnummer === undefined || artikelnummer === null || 
              beställdaDFP === undefined || beställdaDFP === null) {
            continue;
          }

          // Convert to numbers
          const artNum = parseInt(artikelnummer, 10);
          const boxCount = parseInt(beställdaDFP, 10);
          
          if (isNaN(artNum) || isNaN(boxCount) || boxCount <= 0) {
            continue;
          }

          orderData.push({
            artikelnummer: artNum,
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
