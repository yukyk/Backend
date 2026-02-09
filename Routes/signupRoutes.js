const express = require("express");
const router = express.Router();
const authController = require("../Controller/signupController");
const expenseController = require('../Controller/expenseController');


/* SAME FILE FOR BOTH */
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post('/', expenseController.addExpense);
router.get('/', expenseController.getExpenses);
router.get('/:userId',expenseController.getExpenses)
router.delete('/:id', expenseController.deleteExpense);
router.put('/:id', expenseController.updateExpense);


module.exports = router;
