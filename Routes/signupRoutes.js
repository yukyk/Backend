const express = require("express");
const router = express.Router();
const authController = require("../Controller/signupController");
const expenseController = require('../Controller/expenseController');
const authJwt = require('../Middleware/authJwt');


/* Auth */
router.post("/signup", authController.signup);
router.post("/login", authController.login);

/* Expense routes (protected) */
router.post('/add-expense', authJwt, expenseController.addExpense);
router.get('/get-expenses', authJwt, expenseController.getExpenses);
router.delete('/delete-expense/:id', authJwt, expenseController.deleteExpense);
router.put('/update-expense/:id', authJwt, expenseController.updateExpense);

module.exports = router;
