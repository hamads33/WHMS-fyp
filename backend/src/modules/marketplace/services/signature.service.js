/**
 * signature.service.js
 *
 * Verifies digital signatures for uploaded archives using RSA SHA256.
 * Assumes sellers have a publicKey stored in marketplaceSeller.publicKey PEM string.
 *
 * Methods:
 *  - verifyArchiveWithSignature(archivePath, signatureBase64, publicKeyPem)
 *
 * Notes:
 *  - Signature should be produced off-server by seller as: sha256(archive bytes) signed with seller private key.
 *  - Signature can be base64 or hex; this function will accept base64.
 */

const fs = require('fs');
const crypto = require('crypto');

const SignatureService = {
  async computeArchiveHashHex(archivePath) {
    const buf = fs.readFileSync(archivePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  },

  /**
   * Verify RSA signature
   * @param {String} archivePath
   * @param {String} signatureBase64
   * @param {String} publicKeyPem
   * @returns {Boolean}
   */
  async verifyArchiveWithSignature(archivePath, signatureBase64, publicKeyPem) {
    if (!fs.existsSync(archivePath)) return false;
    if (!signatureBase64 || !publicKeyPem) return false;

    const buf = fs.readFileSync(archivePath);
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(buf);
    verifier.end();

    // decode signature: support hex or base64
    let sig;
    try {
      // try base64
      sig = Buffer.from(signatureBase64, 'base64');
      // quick sanity: base64 decoded length > 0
      if (!sig.length) throw new Error('sig empty');
    } catch (e) {
      // fallback: treat input as hex
      try {
        sig = Buffer.from(signatureBase64, 'hex');
      } catch (err) {
        return false;
      }
    }

    try {
      const ok = verifier.verify(publicKeyPem, sig);
      return ok;
    } catch (e) {
      console.error('[SignatureService] verify error', e.message);
      return false;
    }
  }
};

module.exports = SignatureService;
