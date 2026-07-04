const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const signupSchema = new Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 100,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        const digitsOnly = value.replace(/\D/g, '');
        return digitsOnly.length >= 10 && digitsOnly.length <= 15;
      },
      message: 'Phone must be 10-15 digits'
    }
  },
  password: {
    type: String,
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumTier: {
    type: Number,
    default: 0
    // 0=free, 1=basic, 2=plus, 3=elite
  },
  totalExpense: {
    type: Number,
    default: 0
    // Denormalized field: cached sum of user expenses for fast leaderboard queries
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Signup', signupSchema);