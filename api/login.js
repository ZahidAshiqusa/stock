const { signToken, parseJsonBody, sendJson } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return sendJson(res, { error: 'Method not allowed' }, 405);
  }
  try {
    const body = await parseJsonBody(req);
    const password = String(body.password || '');
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return sendJson(res, { error: 'Invalid admin password' }, 401);
    }
    const token = signToken({ role: 'admin' }, 4 * 3600);
    return sendJson(res, { token });
  } catch (error) {
    return sendJson(res, { error: 'Unable to parse request body' }, 400);
  }
};
