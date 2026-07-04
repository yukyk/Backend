const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const forgotPasswordRequestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Signup',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('ForgotPasswordRequests', forgotPasswordRequestSchema);