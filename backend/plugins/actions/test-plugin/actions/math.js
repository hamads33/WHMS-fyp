module.exports = async function({ meta }) {
  const { a = 0, b = 0, operation = 'add' } = meta;
  let result;
  
  switch (operation) {
    case 'add': result = a + b; break;
    case 'subtract': result = a - b; break;
    case 'multiply': result = a * b; break;
    case 'divide': result = b !== 0 ? a / b : null; break;
    default: result = null;
  }
  
  return { success: true, result, operation, a, b };
};