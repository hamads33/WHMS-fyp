exports.add = async function (ctx) {
  const { a = 0, b = 0 } = ctx.meta || {};
  return {
    operation: "add",
    result: Number(a) + Number(b)
  };
};
