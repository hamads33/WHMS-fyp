exports.run = async function (ctx) {
  return {
    message: "Hello from Demo Test Plugin",
    plugin: ctx.pluginId
  };
};
