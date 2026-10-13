const multer = require('multer');

// 404 Route Not Found middleware
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

// Global error handling middleware
function errorHandler(err, req, res, next) {
  console.error('Error occurred:', err.message || err);

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Image size too large. Maximum allowed size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`
    });
  }

  // Handle custom file filter error
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Handle JSON parsing errors in body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload received.'
    });
  }

  // General server error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
