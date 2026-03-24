const { DataTypes } = require('sequelize');
const sequelize = require('../Utils/util');
const { v4: uuidv4 } = require('uuid');

const ForgotPasswordRequests = sequelize.define('ForgotPasswordRequests', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
    allowNull: false,
    unique: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'signup',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'ForgotPasswordRequests',
  timestamps: true,
  updatedAt: false  // Don't update the record timestamp, only createdAt
});

module.exports = ForgotPasswordRequests;
