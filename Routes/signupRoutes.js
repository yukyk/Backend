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
router.get('/leaderboard', authJwt, expenseController.getLeaderboard);
router.get('/suggest-category', expenseController.suggestCategory);  // Public AI
router.get('/insights', authJwt, expenseController.getInsights);  // Premium AI

/* Income routes (protected) */
router.post('/add-income', authJwt, expenseController.addIncome);
router.get('/get-incomes', authJwt, expenseController.getIncomes);
router.delete('/delete-income/:id', authJwt, expenseController.deleteIncome);
router.put('/update-income/:id', authJwt, expenseController.updateIncome);

module.exports = router;
