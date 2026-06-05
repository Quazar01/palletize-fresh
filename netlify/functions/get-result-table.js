const { getStore } = require('@netlify/blobs');
const fs = require('fs/promises');
const path = require('path');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const SNAPSHOT_STORE_NAME = 'result-snapshots';
const LOCAL_SNAPSHOT_DIR = path.join(process.cwd(), '.netlify', 'local-snapshots');

const isMissingBlobsEnvironment = (error) => {
  const message = String(error?.message || '');
  return error?.name === 'MissingBlobsEnvironmentError' || message.includes('configured to use Netlify Blobs');
};

const getLocalSnapshotPath = (key) => {
  const safeName = String(key || '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(LOCAL_SNAPSHOT_DIR, `${safeName}.json`);
};

const loadSnapshotRecord = async (key) => {
  try {
    const store = getStore(SNAPSHOT_STORE_NAME);
    return await store.get(key, { type: 'json' });
  } catch (error) {
    if (!isMissingBlobsEnvironment(error)) {
      throw error;
    }

    try {
      const localContent = await fs.readFile(getLocalSnapshotPath(key), 'utf8');
      return JSON.parse(localContent);
    } catch (localError) {
      if (localError?.code === 'ENOENT') {
        return null;
      }
      throw localError;
    }
  }
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    ...CORS_HEADERS,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const rowsToCsv = (rows, explicitHeaders = null) => {
  const safeRows = Array.isArray(rows) ? rows : [];

  let headers = Array.isArray(explicitHeaders) && explicitHeaders.length > 0
    ? explicitHeaders
    : null;

  if (!headers) {
    const headerSet = new Set();
    safeRows.forEach((row) => {
      Object.keys(row || {}).forEach((key) => headerSet.add(key));
    });
    headers = Array.from(headerSet);
  }

  if (headers.length === 0) return '';

  const lines = [headers.map(csvEscape).join(',')];

  safeRows.forEach((row) => {
    const line = headers.map((header) => csvEscape(row?.[header] ?? '')).join(',');
    lines.push(line);
  });

  return lines.join('\n');
};

const getTemplateCsvSchema = (sheetName, tableName) => {
  const baseMeta = ['sheet', 'table', 'kund', 'datum', 'ordersnummer', 'rowType'];
  const rightCols = ['rightArtNr', 'kolli1', 'kolli2', 'kolli3', 'kolli4', 'kolli5', 'kolli6', 'rightTotal'];
  const styleCols = ['isHighlighted', 'isBold', 'isItalic'];

  return [...baseMeta, 'leftArtNr', 'leftDFP', 'leftPall', 'leftHojd', ...rightCols, ...styleCols];
};

const mapRowsToTemplateCsv = ({ rows, sheet, table, orderData }) => {
  const schema = getTemplateCsvSchema(sheet, table);
  const mappedRows = (Array.isArray(rows) ? rows : []).map((row) => {
    const side = normalizeText(row?.side);
    const base = {
      sheet,
      table,
      kund: orderData?.kund || '',
      datum: orderData?.datum || '',
      ordersnummer: orderData?.ordersnummer || '',
      rowType: side || 'unknown',
      leftArtNr: '',
      leftDFP: '',
      leftPall: '',
      leftHojd: '',
      rightArtNr: '',
      kolli1: '',
      kolli2: '',
      kolli3: '',
      kolli4: '',
      kolli5: '',
      kolli6: '',
      rightTotal: '',
      isHighlighted: row?.isHighlighted ? 1 : 0,
      isBold: row?.isBold ? 1 : 0,
      isItalic: row?.isItalic ? 1 : 0
    };

    if (side === 'left') {
      base.leftArtNr = row?.artNr ?? '';
      base.leftDFP = row?.dfp ?? '';
      base.leftPall = row?.pall ?? '';
      base.leftHojd = row?.hojd ?? '';
    }

    if (side === 'right') {
      base.rightArtNr = row?.artNr ?? '';
      base.kolli1 = row?.kolli1 ?? '';
      base.kolli2 = row?.kolli2 ?? '';
      base.kolli3 = row?.kolli3 ?? '';
      base.kolli4 = row?.kolli4 ?? '';
      base.kolli5 = row?.kolli5 ?? '';
      base.kolli6 = row?.kolli6 ?? '';
      base.rightTotal = row?.total ?? '';
    }

    return base;
  });

  return { schema, rows: mappedRows };
};

const pickTableData = (snapshot, sheetQuery, tableQuery) => {
  const normalizedSheet = normalizeText(sheetQuery);
  const normalizedTable = normalizeText(tableQuery);

  const tables = Array.isArray(snapshot.tables) ? snapshot.tables : [];

  if (tables.length > 0) {
    const matching = tables.find((item) => {
      const sheetMatch = !normalizedSheet || normalizeText(item.sheet) === normalizedSheet;
      const tableMatch = !normalizedTable || normalizeText(item.table) === normalizedTable;
      return sheetMatch && tableMatch;
    });

    if (matching) {
      return {
        sheet: matching.sheet || snapshot.sheet || '',
        table: matching.table || snapshot.table || '',
        rows: Array.isArray(matching.rows) ? matching.rows : []
      };
    }
  }

  if (Array.isArray(snapshot.rows) && snapshot.rows.length > 0) {
    const sheetMatch = !normalizedSheet || normalizeText(snapshot.sheet) === normalizedSheet;
    const tableMatch = !normalizedTable || normalizeText(snapshot.table) === normalizedTable;

    if (sheetMatch && tableMatch) {
      return {
        sheet: snapshot.sheet || '',
        table: snapshot.table || '',
        rows: snapshot.rows
      };
    }
  }

  return null;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const params = event.queryStringParameters || {};
    const resultId = String(params.resultId || '').trim();
    const format = normalizeText(params.format || 'json') || 'json';
    const schemaType = normalizeText(params.schema || 'template') || 'template';
    const sheet = String(params.sheet || '').trim();
    const table = String(params.table || '').trim();

    if (!resultId) {
      return jsonResponse(400, { error: 'Missing required query parameter: resultId' });
    }

    if (!['json', 'csv'].includes(format)) {
      return jsonResponse(400, { error: 'Invalid format. Use format=json or format=csv' });
    }

    if (!['template', 'raw'].includes(schemaType)) {
      return jsonResponse(400, { error: 'Invalid schema. Use schema=template or schema=raw' });
    }

    const snapshot = await loadSnapshotRecord(`snapshot:${resultId}`);

    if (!snapshot) {
      return jsonResponse(404, { error: 'Snapshot not found' });
    }

    const selected = pickTableData(snapshot, sheet, table);
    if (!selected) {
      return jsonResponse(404, {
        error: 'No matching table found in snapshot',
        requested: { sheet, table }
      });
    }

    if (format === 'csv') {
      const csvBody = schemaType === 'raw'
        ? rowsToCsv(selected.rows)
        : rowsToCsv(
          mapRowsToTemplateCsv({
            rows: selected.rows,
            sheet: selected.sheet,
            table: selected.table,
            orderData: snapshot.orderData || {}
          }).rows,
          getTemplateCsvSchema(selected.sheet, selected.table)
        );

      return {
        statusCode: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'no-store'
        },
        body: csvBody
      };
    }

    return jsonResponse(200, {
      resultId: snapshot.resultId,
      createdAt: snapshot.createdAt,
      orderData: snapshot.orderData || {},
      metadata: snapshot.metadata || {},
      sheet: selected.sheet,
      table: selected.table,
      rowCount: selected.rows.length,
      rows: selected.rows
    });
  } catch (error) {
    console.error('Error getting result table:', error);
    return jsonResponse(500, {
      error: 'Failed to fetch result table',
      message: error.message
    });
  }
};
