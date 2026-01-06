exports.wait = async function (ctx) {
  const delay = ctx.meta?.delay || 500;

  await new Promise(resolve => setTimeout(resolve, delay));

  return {
    status: "done",
    waitedMs: delay
  };
};
