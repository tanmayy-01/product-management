const express = require('express');
require('dotenv').config();

// Initialize database
require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

// Import error handlers
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Product Management API!',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      products: {
        getAll: 'GET /api/products?page=1&limit=10&minPrice=...&maxPrice=...',
        getById: 'GET /api/products/:id',
        search: 'GET /api/products/search?q=...&name=...&minPrice=...',
        create: 'POST /api/products (Requires JWT Auth, image_url is optional in JSON body)',
        update: 'PUT /api/products/:id (Requires JWT Auth, image_url is optional in JSON body)',
        deleteSoft: 'DELETE /api/products/:id (Requires JWT Auth - Soft Deletion)',
        getDeleted: 'GET /api/products/deleted',
        restore: 'PATCH /api/products/:id/restore (Requires JWT Auth)'
      }
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// 404 Route Not Found handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Start server only if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
