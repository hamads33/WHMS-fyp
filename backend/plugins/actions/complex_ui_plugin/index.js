// Server-side plugin action (runs inside VM2)
// Exports: fetchProfile(meta)
module.exports.fetchProfile = async function(meta, { plugin, ctx }) {
  if (!meta || !meta.name) throw new Error("name is required");
  const name = String(meta.name).trim();

  // call public APIs via safe.http (host must allow the hosts)
  const agify = await safe.http({ url: `https://api.agify.io?name=${encodeURIComponent(name)}` });
  const genderize = await safe.http({ url: `https://api.genderize.io?name=${encodeURIComponent(name)}` });

  return {
    name,
    age: agify && agify.data ? agify.data.age : null,
    count: agify && agify.data ? agify.data.count : null,
    gender: genderize && genderize.data ? genderize.data.gender : null,
    probability: genderize && genderize.data ? genderize.data.probability : null,
    metaInfo: {
      pluginId: plugin.id,
      timestamp: Date.now()
    }
  };
};