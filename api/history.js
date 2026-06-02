const { authMiddleware, parseJsonBody, sendJson } = require('./_lib/auth');
const { readJSON, writeJSON, appendJSON } = require('./_lib/github');
const DATA_PATH = 'data/history.json';

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const history = (await readJSON(DATA_PATH)) || [];
      return sendJson(res, { history });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  if (req.method === 'POST') {
    const user = authMiddleware(req, res);
    if (!user) return;
    try {
      const body = await parseJsonBody(req);
      const action = String(body.action || '').trim();
      const details = String(body.details || '').trim();
      if (!action) {
        return sendJson(res, { error: 'Missing action description' }, 400);
      }
      const history = (await readJSON(DATA_PATH)) || [];
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        action,
        details,
        date: new Date().toISOString(),
      };
      history.unshift(entry);
      await writeJSON(DATA_PATH, history, `Log history event ${action}`);
      return sendJson(res, { entry });
    } catch (error) {
      return sendJson(res, { error: error.message }, 500);
    }
  }

  return sendJson(res, { error: 'Method not allowed' }, 405);
};
