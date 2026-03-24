const express = require('express');
const router = express.Router();
const forgotPasswordController = require('../Controller/forgotPasswordController');

/* Forgot Password */
router.post('/forgotpassword', forgotPasswordController.forgotPassword);

/* Resend Reset Email */
router.post('/resendresetemail', forgotPasswordController.resendResetEmail);

/* Verify Reset Token (GET request for loading the reset page) */
router.get('/verifytoken', forgotPasswordController.verifyResetToken);

/* Reset Password */
router.post('/resetpassword', forgotPasswordController.resetPassword);

module.exports = router;
