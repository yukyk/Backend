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
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isPremium: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'signup',
    timestamps: true
});

module.exports = Signup;
