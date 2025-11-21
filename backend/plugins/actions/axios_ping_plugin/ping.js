module.exports.run = async function(meta) {
  const axiosModule = axios || require("axios");

  const res = await axiosModule.get(meta.url);

  return {
    ok: true,
    status: res.status,
    data: res.data
  };
};
