const bcrypt = require("bcrypt");

const Hash = {
  async make(string, rounds = 12) {
    return bcrypt.hash(string, rounds);
  },

  async check(string, hashed) {
    return bcrypt.compare(string, hashed);
  }
};

module.exports = Hash;
