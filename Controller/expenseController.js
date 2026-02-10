const Expense = require('../Models/expenseModel');


// Create expense for the authenticated user. Do NOT accept userId from client.
const addExpense = async (req , res) =>{
  try {
    const { amount, description, category } = req.body;

    if (!amount || !description || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // req.user.userId is set by auth middleware
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expense = await Expense.create({
      amount,
      description,
      category,
      userId: userId
    });

    res.status(201).json(expense);
  } catch (err) {
    console.error("ADD EXPENSE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


// Get expenses belonging to authenticated user
const getExpenses = async (req , res) =>{
  try{
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expenses = await Expense.findAll({ where: { userId: userId } });
    res.json(expenses)
  } catch(err){
    res.status(500).json({error: "Error fetching expenses"});
  }
};

// Delete expense only if it belongs to authenticated user
const deleteExpense = async (req , res) =>{
  try{
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expense = await Expense.findOne({ where: { id } });
    if (!expense) return res.status(404).json({ message: `Expense with id ${id} not found.` });

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Expense.destroy({ where: { id } });
    return res.status(200).json({ message: `Expense with id ${id} deleted.` });
  } catch(err){
    res.status(500).json({error: "Error deleting expense"});
  }
};


// Update expense only if it belongs to authenticated user
const updateExpense = async (req , res) =>{
  try{
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expense = await Expense.findOne({ where: { id } });
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await Expense.update(req.body, { where: { id } });
    if (result[0] === 0) {
      return res.status(400).json({ message: "No changes applied" });
    }
    res.json({message: `Expense with id ${id} successfully updated.`});
  } catch(err){
    res.status(500).json({error: "Error updating expense"});
  }
};


module.exports = {addExpense, getExpenses, deleteExpense, updateExpense};
