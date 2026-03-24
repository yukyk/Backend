const express = require('express');
const router = express.Router();
const forgotPasswordController = require('../Controller/forgotPasswordController');

/* Forgot Password - Request password reset */
router.post('/forgotpassword', forgotPasswordController.forgotPassword);

/* Verify Reset Request - Check if reset link is valid */
router.get('/resetpassword/:id', forgotPasswordController.verifyResetRequest);

/* Reset Password - Submit new password */
router.post('/resetpassword', forgotPasswordController.resetPassword);

/* Resend Reset Email */
router.post('/resendresetemail', forgotPasswordController.resendResetEmail);

module.exports = router;
