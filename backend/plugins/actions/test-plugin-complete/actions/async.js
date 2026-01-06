module.exports = async function({ meta }) {
  const delay = meta.delay || 100;
  await new Promise(resolve => setTimeout(resolve, delay));
  return { success: true, delayed: delay };
};