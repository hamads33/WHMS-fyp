const bcrypt = require("bcrypt");

const PasswordStrategy = {
  /**
   * Compare plain password with hashed password
   */
  async validate(password, hashedPassword) {
    if (!password || !hashedPassword) return false;
    return bcrypt.compare(password, hashedPassword);
  },

  /**
   * Hash a password (used in register/reset flows)
   */
  async hash(password, saltRounds = 12) {
    return bcrypt.hash(password, saltRounds);
  }
};

module.exports = PasswordStrategy;
