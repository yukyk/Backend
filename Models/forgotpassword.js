const { DataTypes } = require('sequelize');
const sequelize = require('../Utils/util');

const ForgotPassword = sequelize.define('ForgotPassword', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'signup',
      key: 'id'
    }
  },
  resetToken: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'forgotpasswords',
  timestamps: true
});

module.exports = ForgotPassword;
