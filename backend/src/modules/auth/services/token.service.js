const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change_me";
const ACCESS_EXP = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_EXP = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

const TokenService = {
  ////////////////////////////////////////////////////////
  // SIGN TOKENS
  ////////////////////////////////////////////////////////
  signAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_EXP
    });
  },

  signRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: REFRESH_EXP
    });
  },

  ////////////////////////////////////////////////////////
  // VERIFY TOKENS
  ////////////////////////////////////////////////////////
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  },

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  },

  ////////////////////////////////////////////////////////
  // DECODE TOKEN (NO SIGNATURE CHECK)
  ////////////////////////////////////////////////////////
  decode(token) {
    try {
      return jwt.decode(token);
    } catch (err) {
      return null;
    }
  }
};

module.exports = TokenService;
