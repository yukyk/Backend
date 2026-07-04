const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const expenseSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    default: 'pending'
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Signup',
    required: true
  },
  note: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);