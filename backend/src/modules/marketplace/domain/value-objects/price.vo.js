// src/modules/marketplace/domain/value-objects/price.vo.js
class Price {
  constructor({ cents = 0, currency = 'USD' } = {}) {
    if (!Number.isInteger(cents) || cents < 0) throw new Error('Price cents must be non-negative integer');
    this.cents = cents;
    this.currency = currency;
  }

  toFloat() {
    return this.cents / 100;
  }

  toString() {
    return `${this.currency} ${this.toFloat().toFixed(2)}`;
  }
}

module.exports = Price;
