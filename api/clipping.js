const { authMiddleware, parseJsonBody, sendJson } = require('./_lib/auth');
const { readJSON, writeJSON, appendJSON } = require('./_lib/github');
const DATA_PATH = 'data/clipping.json';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const records = (await readJSON(DATA_PATH)) || [];
      return sendJson(res, { records });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  if (req.method === 'POST') {
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
      const body = await parseJsonBody(req);
      const title = String(body.title || '').trim();
      const category = String(body.category || 'Other').trim();
      const note = String(body.note || '').trim();
      if (!title || !note) {
        return sendJson(res, { error: 'Invalid clipping record' }, 400);
      }
      const records = (await readJSON(DATA_PATH)) || [];
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        title,
        category,
        note,
        date: new Date().toISOString(),
      };
      records.unshift(record);
      await writeJSON(DATA_PATH, records, `Add clipping record ${title}`);
      await appendJSON('data/history.json', {
        id: record.id,
        date: record.date,
        action: `Added clipping record ${title}`,
        details: `${category}`,
      }, `Log clipping record ${title}`);
      return sendJson(res, { record });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  return sendJson(res, { error: 'Method not allowed' }, 405);
};
