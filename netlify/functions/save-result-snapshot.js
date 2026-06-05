const { getStore } = require('@netlify/blobs');
const fs = require('fs/promises');
const path = require('path');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const buildResponse = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body)
});

const createResultId = () => {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `r_${ts}_${rand}`;
};

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

const saveSnapshotRecord = async (key, snapshot) => {
  try {
    const store = getStore(SNAPSHOT_STORE_NAME);
    await store.setJSON(key, snapshot);
  } catch (error) {
    if (!isMissingBlobsEnvironment(error)) {
      throw error;
    }

    await fs.mkdir(LOCAL_SNAPSHOT_DIR, { recursive: true });
    await fs.writeFile(getLocalSnapshotPath(key), JSON.stringify(snapshot), 'utf8');
  }
};

const getBaseUrlFromEvent = (event) => {
  const host = event.headers.host;
  const isLocalHost = typeof host === 'string' && (host.includes('localhost') || host.includes('127.0.0.1'));
  const proto = isLocalHost ? 'http' : (event.headers['x-forwarded-proto'] || 'https');
  return `${proto}://${host}`;
};

const normalizeTables = (tables = []) => {
  if (!Array.isArray(tables)) return [];

  return tables
    .filter((table) => table && Array.isArray(table.rows))
    .map((table) => ({
      sheet: String(table.sheet || '').trim(),
      table: String(table.table || '').trim(),
      rows: table.rows,
      meta: table.meta || {}
    }));
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method not allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    const orderData = payload.orderData || {};
    const sheet = String(payload.sheet || payload.selectedSheetName || '').trim();
    const table = String(payload.table || payload.selectedTableName || '').trim();

    const tables = normalizeTables(payload.tables);
    const rows = Array.isArray(payload.rows) ? payload.rows : [];

    if (tables.length === 0 && rows.length === 0) {
      return buildResponse(400, {
        error: 'Snapshot must include either tables[] with rows or rows[]'
      });
    }

    const resultId = createResultId();
    const now = new Date().toISOString();

    const snapshot = {
      resultId,
      version: 1,
      createdAt: now,
      orderData: {
        kund: orderData.kund || '',
        datum: orderData.datum || '',
        ordersnummer: orderData.ordersnummer || ''
      },
      sheet,
      table,
      rows,
      tables,
      metadata: payload.metadata || {}
    };

    await saveSnapshotRecord(`snapshot:${resultId}`, snapshot);

    const baseUrl = getBaseUrlFromEvent(event);
    const query = new URLSearchParams({ resultId });

    if (sheet) query.set('sheet', sheet);
    if (table) query.set('table', table);

    const defaultQuery = query.toString();

    const jsonUrl = `${baseUrl}/.netlify/functions/get-result-table?${defaultQuery}&format=json`;
    const csvUrl = `${baseUrl}/.netlify/functions/get-result-table?${defaultQuery}&format=csv`;

    return buildResponse(201, {
      success: true,
      resultId,
      createdAt: now,
      sheet,
      table,
      links: {
        json: jsonUrl,
        csv: csvUrl
      }
    });
  } catch (error) {
    console.error('Error saving result snapshot:', error);
    return buildResponse(500, {
      error: 'Failed to save result snapshot',
      message: error.message
    });
  }
};
