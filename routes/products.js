const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const { validateProductData } = require('../utils/validation');


// 1. SEARCH API 
// Endpoint: GET /api/products/search

router.get('/search', (req, res, next) => {
  try {
    const {
      q,
      name,
      minPrice,
      maxPrice,
      minQuantity,
      maxQuantity,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    let conditions = ['is_deleted = 0'];
    let params = [];

    // General keyword search on name
    if (q) {
      conditions.push('name LIKE ?');
      params.push(`%${q}%`);
    }

    // Name search
    if (name) {
      conditions.push('name LIKE ?');
      params.push(`%${name}%`);
    }

    // Price range filters
    if (minPrice !== undefined && minPrice !== '') {
      conditions.push('price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      conditions.push('price <= ?');
      params.push(Number(maxPrice));
    }

    // Quantity range filters
    if (minQuantity !== undefined && minQuantity !== '') {
      conditions.push('quantity >= ?');
      params.push(Number(minQuantity));
    }
    if (maxQuantity !== undefined && maxQuantity !== '') {
      conditions.push('quantity <= ?');
      params.push(Number(maxQuantity));
    }

    // Manufactured date filters
    if (startDate) {
      conditions.push('date(manufactured_date) >= date(?)');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('date(manufactured_date) <= date(?)');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching records
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM products ${whereClause}`);
    const { total } = countStmt.get(...params);

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);

    // Query matching records
    const queryStmt = db.prepare(`
      SELECT * FROM products
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `);
    const products = queryStmt.all(...params, limitNum, offset);

    return res.status(200).json({
      success: true,
      message: 'Search completed successfully.',
      data: products,
      pagination: {
        totalRecords: total,
        totalPages: totalPages,
        currentPage: pageNum,
        limit: limitNum
      }
    });
  } catch (err) {
    next(err);
  }
});


// 2. GET SOFT-DELETED PRODUCTS
// Endpoint: GET /api/products/deleted

router.get('/deleted', (req, res, next) => {
  try {
    const products = db.prepare('SELECT * FROM products WHERE is_deleted = 1 ORDER BY updated_at DESC').all();
    return res.status(200).json({
      success: true,
      message: 'Retrieved deleted products for historical reference.',
      data: products
    });
  } catch (err) {
    next(err);
  }
});


// 3. GET ALL PRODUCTS with Pagination & Filtering 
// Endpoint: GET /api/products

router.get('/', (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      minQuantity,
      maxQuantity,
      startDate,
      endDate,
      manufacturedDate,
      name
    } = req.query;

    let conditions = ['is_deleted = 0'];
    let params = [];

    // Filter by name (optional search in main GET)
    if (name) {
      conditions.push('name LIKE ?');
      params.push(`%${name}%`);
    }

    // Filter by Price range
    if (minPrice !== undefined && minPrice !== '') {
      conditions.push('price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== '') {
      conditions.push('price <= ?');
      params.push(Number(maxPrice));
    }

    // Filter by Quantity range
    if (minQuantity !== undefined && minQuantity !== '') {
      conditions.push('quantity >= ?');
      params.push(Number(minQuantity));
    }
    if (maxQuantity !== undefined && maxQuantity !== '') {
      conditions.push('quantity <= ?');
      params.push(Number(maxQuantity));
    }

    // Filter by Manufactured Date
    if (manufacturedDate) {
      conditions.push('date(manufactured_date) = date(?)');
      params.push(manufacturedDate);
    }
    if (startDate) {
      conditions.push('date(manufactured_date) >= date(?)');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('date(manufactured_date) <= date(?)');
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total records count
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM products ${whereClause}`);
    const { total } = countStmt.get(...params);

    // Calculate pagination values
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);

    // Fetch records
    const fetchStmt = db.prepare(`
      SELECT * FROM products
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `);
    const products = fetchStmt.all(...params, limitNum, offset);

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully.',
      data: products,
      pagination: {
        totalRecords: total,
        totalPages: totalPages,
        currentPage: pageNum,
        limit: limitNum
      }
    });
  } catch (err) {
    next(err);
  }
});


// 4. GET SINGLE PRODUCT BY ID
// Endpoint: GET /api/products/:id

router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 0').get(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product retrieved successfully.',
      data: product
    });
  } catch (err) {
    next(err);
  }
});


// 5. CREATE PRODUCT API
// Endpoint: POST /api/products

router.post('/', authenticateToken, (req, res, next) => {
  try {
    const { name, price, quantity, manufactured_date, image_url } = req.body;

    // Validate inputs
    const validation = validateProductData({
      name,
      price,
      quantity,
      manufactured_date
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors
      });
    }

    // Optional image URL directly provided by user
    const finalImageUrl = (image_url && typeof image_url === 'string') ? image_url.trim() : null;

    // Transactional operation: either all commits or rolls back
    const createProductTransaction = db.transaction((productData) => {
      const insertStmt = db.prepare(`
        INSERT INTO products (name, price, quantity, manufactured_date, image_url, is_deleted)
        VALUES (?, ?, ?, ?, ?, 0)
      `);

      const result = insertStmt.run(
        productData.name.trim(),
        Number(productData.price),
        parseInt(productData.quantity, 10),
        productData.manufactured_date,
        productData.image_url
      );

      // Fetch and return the newly inserted product
      return db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    });

    // Execute the transaction
    const newProduct = createProductTransaction({
      name,
      price,
      quantity,
      manufactured_date,
      image_url: finalImageUrl
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: newProduct
    });
  } catch (err) {
    next(err);
  }
});


// 6. UPDATE PRODUCT API
// Endpoint: PUT /api/products/:id


router.put('/:id', authenticateToken, (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product exists and is not soft-deleted
    const existingProduct = db.prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 0').get(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found or has been deleted.`
      });
    }

    const { name, price, quantity, manufactured_date, image_url } = req.body;

    // Validate updated data
    const validation = validateProductData(
      {
        name: name !== undefined ? name : existingProduct.name,
        price: price !== undefined ? price : existingProduct.price,
        quantity: quantity !== undefined ? quantity : existingProduct.quantity,
        manufactured_date: manufactured_date !== undefined ? manufactured_date : existingProduct.manufactured_date
      },
      true
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors
      });
    }

    const updatedName = name !== undefined ? name.trim() : existingProduct.name;
    const updatedPrice = price !== undefined ? Number(price) : existingProduct.price;
    const updatedQuantity = quantity !== undefined ? parseInt(quantity, 10) : existingProduct.quantity;
    const updatedDate = manufactured_date !== undefined ? manufactured_date : existingProduct.manufactured_date;
    
    // Update image_url if provided, else keep existing
    let updatedImageUrl = existingProduct.image_url;
    if (image_url !== undefined) {
      updatedImageUrl = (image_url && typeof image_url === 'string') ? image_url.trim() : null;
    }

    // Transactional operation: update product details
    const updateProductTransaction = db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE products
        SET name = ?,
            price = ?,
            quantity = ?,
            manufactured_date = ?,
            image_url = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_deleted = 0
      `);

      updateStmt.run(
        updatedName,
        updatedPrice,
        updatedQuantity,
        updatedDate,
        updatedImageUrl,
        id
      );

      // Return the updated product record
      return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    });

    const updatedProduct = updateProductTransaction();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: updatedProduct
    });
  } catch (err) {
    next(err);
  }
});


// 7. DELETE PRODUCT API - Soft Deletion
// Endpoint: DELETE /api/products/:id

router.delete('/:id', authenticateToken, (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product exists and is active
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 0').get(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found or already deleted.`
      });
    }

    // Transactional operation: soft delete the product
    const softDeleteTransaction = db.transaction(() => {
      const deleteStmt = db.prepare(`
        UPDATE products
        SET is_deleted = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      deleteStmt.run(id);
    });

    softDeleteTransaction();

    return res.status(200).json({
      success: true,
      message: `Product with ID ${id} has been soft deleted successfully. It remains in database for historical reference.`
    });
  } catch (err) {
    next(err);
  }
});


// 8. RESTORE SOFT-DELETED PRODUCT 
// Endpoint: PATCH /api/products/:id/restore

router.patch('/:id/restore', authenticateToken, (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product exists and is currently soft-deleted
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_deleted = 1').get(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Soft-deleted product with ID ${id} not found.`
      });
    }

    // Transactional operation: restore the product
    const restoreTransaction = db.transaction(() => {
      const restoreStmt = db.prepare(`
        UPDATE products
        SET is_deleted = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      restoreStmt.run(id);

      return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    });

    const restoredProduct = restoreTransaction();

    return res.status(200).json({
      success: true,
      message: `Product with ID ${id} restored successfully.`,
      data: restoredProduct
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
