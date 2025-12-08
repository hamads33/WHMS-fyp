// src/modules/marketplace/domain/rules/submission.rules.js
// Business rules for submissions (FR-M6)
module.exports = {
  // Basic rule: product must belong to submitter (seller) or submitter must be admin/dev
  async canSubmit({ submitterId, product, rolesChecker }) {
    // rolesChecker is a function (userId)=>['admin','developer',...]
    if (!product) throw new Error('Product required');
    // seller can submit new versions
    if (product.sellerId === submitterId) return true;
    // admins or developers allowed by role
    const roles = await rolesChecker(submitterId);
    if (roles && (roles.includes('admin') || roles.includes('developer'))) return true;
    return false;
  },

  // Manifest validation rule placeholder (detailed validators in infra)
  validateManifest(manifestJson) {
    if (!manifestJson || typeof manifestJson !== 'object') {
      throw new Error('Invalid manifest');
    }
    if (!manifestJson.name || !manifestJson.version) {
      throw new Error('Manifest must include name and version');
    }
    return true;
  }
};
