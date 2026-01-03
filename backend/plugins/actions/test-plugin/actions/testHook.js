module.exports = async function({ meta }) {
  console.log('[Test Hook] Event received:', meta);
  return { success: true, hookExecuted: true };
};