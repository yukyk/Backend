const express = require("express");
const router = express.Router();
const paymentController = require("../Controller/paymentController");
const authJwt = require('../Middleware/authJwt');

// Unprotected diagnostic endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'Payment routes are active' });
});

// Diagnostic endpoint to check token and headers
router.post('/test-auth', (req, res) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    console.log('🔍 DIAGNOSTIC - Authorization header:', authHeader);
    
    if (!authHeader) {
        return res.status(400).json({ error: 'No authorization header received' });
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(400).json({ error: 'Invalid authorization format' });
    }
    
    res.json({ 
        message: 'Header received correctly',
        headerFormat: 'Bearer [token]',
        tokenLength: parts[1].length
    });
});

// Debug endpoint to check token
router.get('/debug', authJwt, (req, res) => {
    console.log('✅ Debug endpoint - Token verified for userId:', req.user.userId);
    res.json({ message: 'Token is valid', userId: req.user.userId });
});

// Payment routes (protected)
router.post('/create-order', authJwt, paymentController.createPaymentOrder);
router.post('/verify-payment', authJwt, paymentController.verifyPayment);
router.post('/update-status', authJwt, paymentController.updatePaymentStatus);
router.get('/history', authJwt, paymentController.getPaymentHistory);
router.get('/premium-status', authJwt, paymentController.getPremiumStatus);

module.exports = router;
