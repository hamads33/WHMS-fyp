const registry = require('../utils/actionRegistry');

async function testAction(req, res, next) {
  try {
    const { actionId } = req.params;
    const action = registry.getAction(actionId);
    if (!action) return res.status(404).json({ message: 'Action not found' });
    const params = req.body;
    const runResult = action.test ? await action.test(params) : await action.execute({ test: true }, params);
    res.json({ ok: true, runResult });
  } catch (err) { next(err); }
}
module.exports = { testAction };
