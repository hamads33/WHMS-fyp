module.exports.handler = async function({ meta }) {
  return {
    success: true,
    message: 'Hello from test plugin!',
    receivedMeta: meta || {}
  };
};