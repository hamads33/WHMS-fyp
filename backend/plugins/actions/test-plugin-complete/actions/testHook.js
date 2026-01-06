module.exports = async function({ meta }) {
  console.log('[Test Hook] Event received:', JSON.stringify(meta));
  return { success: true, hookExecuted: true, receivedMeta: meta };
};