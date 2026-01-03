module.exports = async function({ meta }) {
  return {
    success: true,
    echo: meta || {}
  };
};