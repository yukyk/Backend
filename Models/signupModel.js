const { DataTypes } = require('sequelize');
const sequelize = require('../Utils/util');

const Signup = sequelize.define('Signup', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate :{
            len: [2, 100],
            notEmpty: true
        }
    },
    email: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
  validate: {
    isEmail: true
  },
  set(value) {
    this.setDataValue('email', value.toLowerCase());  // Normalize to lowercase
  }
},
    phone: {
  type: DataTypes.STRING,
  allowNull: false,
  validate: {
    isValidPhone(value) {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        throw new Error('Phone must be 10-15 digits');
      }
    }
  }
},
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPremium: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    totalExpense: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Denormalized field: cached sum of user expenses for fast leaderboard queries'
    }
}, {
    tableName: 'signup',
    timestamps: true
});

module.exports = Signup;
