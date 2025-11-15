// // Simple domain format validation. For stronger checks use 'is-valid-domain' npm package.
// const domainRegex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;

// function validateDomain(domain) {
//   if (!domain || typeof domain !== 'string') return false;
//   return domainRegex.test(domain.trim());
// }

// module.exports = { validateDomain };
const domainRegex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z]{2,})+$/;
function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  return domainRegex.test(domain.trim());
}
module.exports = { validateDomain };

