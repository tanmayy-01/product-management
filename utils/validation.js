// Helper functions to validate product input data

function validateProductData(data, isUpdate = false) {
  const errors = [];
  const { name, price, quantity, manufactured_date } = data;

  // 1. Validate Name
  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Product name is required and cannot be empty.');
    }
  }

  // 2. Validate Price
  if (!isUpdate || price !== undefined) {
    const numPrice = Number(price);
    if (price === undefined || price === null || isNaN(numPrice) || numPrice < 0) {
      errors.push('Price must be a valid non-negative number.');
    }
  }

  // 3. Validate Quantity
  if (!isUpdate || quantity !== undefined) {
    const numQty = Number(quantity);
    if (quantity === undefined || quantity === null || !Number.isInteger(numQty) || numQty < 0) {
      errors.push('Quantity must be a valid non-negative whole integer.');
    }
  }

  // 4. Validate Manufactured Date
  if (!isUpdate || manufactured_date !== undefined) {
    if (!manufactured_date || typeof manufactured_date !== 'string') {
      errors.push('Manufactured date is required.');
    } else {
      const parsedDate = new Date(manufactured_date);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Manufactured date must be a valid date format (e.g., YYYY-MM-DD).');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateProductData
};
