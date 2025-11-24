const express = require('express');
const router = express.Router();
const authController = require('../../controllers/driver/auth.controller.js');

router.post('/send-otp-login', authController.sendOtpLogin);
router.post('/verify-otp-login', authController.verifyOtpLogin);

module.exports = router;
