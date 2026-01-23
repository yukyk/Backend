const express = require("express");
const router = express.Router();
const authController = require("../Controller/signupController");

/* SAME FILE FOR BOTH */
router.post("/signup", authController.signup);
router.post("/login", authController.login);

module.exports = router;
