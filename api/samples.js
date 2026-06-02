const { authMiddleware, parseJsonBody, sendJson } = require('./_lib/auth');
const { readJSON, writeJSON, appendJSON } = require('./_lib/github');

const DATA_PATH = 'data/samples.json';

function getQuery(req) {
  const url = new URL(req.url, 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

async function getSamples() {
  const list = (await readJSON(DATA_PATH)) || [];
  return list;
}

module.exports = async (req, res) => {
  const method = req.method;
  if (method === 'GET') {
    try {
      const samples = await getSamples();
      return sendJson(res, { samples });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  const user = authMiddleware(req, res);
  if (!user) return;

  if (method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const direction = String(body.direction || '').trim().toLowerCase();
      const name = String(body.name || '').trim();
      const width = Number(body.width || 0);
      if (!direction || !['in', 'out'].includes(direction) || !name || Number.isNaN(width)) {
        return sendJson(res, { error: 'Missing or invalid sample details' }, 400);
      }
      const samples = await getSamples();
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        direction,
        name,
        width,
        timestamp: new Date().toISOString(),
      };
      samples.unshift(record);
      await writeJSON(DATA_PATH, samples, `Add sample ${direction} ${name}`);
      await appendJSON('data/history.json', {
        id: record.id,
        date: record.timestamp,
        action: `Sample ${direction}`,
        details: `Name ${name}, width ${width}`,
      }, `Log sample ${direction} ${name}`);
      return sendJson(res, { sample: record });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  if (method === 'DELETE') {
    try {
      const query = getQuery(req);
      const { id } = query;
      if (!id) return sendJson(res, { error: 'Missing id' }, 400);
      const samples = await getSamples();
      const idx = samples.findIndex((s) => s.id === id);
      if (idx < 0) return sendJson(res, { error: 'Not found' }, 404);
      const removed = samples.splice(idx, 1)[0];
      await writeJSON(DATA_PATH, samples, `Delete sample ${removed.id}`);
      await appendJSON('data/history.json', {
        id: removed.id,
        date: new Date().toISOString(),
        action: `Deleted sample ${removed.direction}`,
        details: `Name ${removed.name}`,
      }, `Log sample deletion ${removed.id}`);
      return sendJson(res, { success: true });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  return sendJson(res, { error: 'Method not allowed' }, 405);
};
