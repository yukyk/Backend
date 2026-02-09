const Expense = require('../Models/expenseModel');


const addExpense = async (req , res) =>{
    try {
    const { amount, description, category } = req.body;
    
    if (!amount || !description || !category) {
  return res.status(400).json({ error: "All fields are required" });
}

    const expense = await Expense.create({
      amount,
      description,
      category
    });

    res.status(201).json(expense);
  } catch (err) {
    console.error("ADD EXPENSE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};



const getExpenses = async (req , res) =>{
    try{
        const expenses = await Expense.findAll();
        res.json(expenses)
    } catch(err){
        res.status(500).json({error: "Error fetching expenses"});
    }
};

const deleteExpense = async (req , res) =>{
    try{
        const {id} = req.params;
        const result = await Expense.destroy({where:{id}});

        if(result === 0){
            return res.status(404).json({message: `Expense with id ${id} not found.`});
            
        }
        return res.status(200).json({ message: `Expense with id ${id} deleted.` });
    } catch(err){
        res.status(500).json({error: "Error deleting expense"});

    }
};



const updateExpense = async (req , res) =>{
    try{
        const {id} = req.params;
        const result = await Expense.update(req.body, {where:{id}});
        if (result[0] === 0) {
      return res.status(404).json({ message: "Expense not found" });
    }
        res.json({message: `Expense with id ${id} successfully updated.`});
    } catch(err){
        res.status(500).json({error: "Error updating expense"});
    }
};


module.exports = {addExpense, getExpenses, deleteExpense, updateExpense};
