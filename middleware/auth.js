const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'my_simple_secret_key_12345';

// Middleware to protect routes with JWT authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // Format: "Bearer <token>"
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided in Authorization header.'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Malformed authorization header. Format should be: Bearer <token>'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

module.exports = authenticateToken;
