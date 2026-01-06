module.exports = async function({ meta }) {
  return {
    success: true,
    echo: meta || {},
    timestamp: new Date().toISOString()
  };
};