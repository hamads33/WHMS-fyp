function toPennies(value, fieldName = "amount") {
  if (value === null || value === undefined || value === "") return null;

  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[$,\s]/g, ""));

  if (!Number.isFinite(numeric)) {
    const err = new Error(`${fieldName} must be a valid monetary amount`);
    err.statusCode = 400;
    err.errorCode = "INVALID_MONEY_AMOUNT";
    throw err;
  }

  return Math.round(numeric * 100);
}

function penniesToDollars(pennies) {
  if (pennies === null || pennies === undefined) return null;
  return Number((Number(pennies) / 100).toFixed(2));
}

function penniesToDisplay(pennies, currency = "USD") {
  if (pennies === null || pennies === undefined) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(pennies) / 100);
}

module.exports = {
  penniesToDisplay,
  penniesToDollars,
  toPennies,
};
