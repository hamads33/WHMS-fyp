// src/modules/plugins/pluginEngine/verifier.js
const crypto = require("crypto");
const fs = require("fs");

function verifySignature({ filePath, signaturePath, publicKeyPem }) {
  // filePath: path to the file that was signed (zip or manifest)
  // signaturePath: path to signature file (binary or base64)
  // publicKeyPem: string containing public key in PEM format
  if (!fs.existsSync(filePath)) throw new Error("file not found");
  if (!fs.existsSync(signaturePath)) throw new Error("signature not found");

  const fileBuf = fs.readFileSync(filePath);
  const sigBuf = fs.readFileSync(signaturePath);

  // assume signature is base64 text OR raw binary; handle both:
  let signature;
  try {
    signature = Buffer.from(sigBuf.toString().trim(), "base64");
  } catch (e) {
    signature = sigBuf;
  }

  const verifier = crypto.createVerify("sha256");
  verifier.update(fileBuf);
  verifier.end();

  const ok = verifier.verify(publicKeyPem, signature);
  return ok;
}

module.exports = { verifySignature };
