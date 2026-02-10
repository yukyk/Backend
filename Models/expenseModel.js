const { DataTypes } = require("sequelize");
const sequelize = require("../Utils/util");

const Expense = sequelize.define("Expense", {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount:{
        type: DataTypes.FLOAT,
        allowNull: false
    },
    description:{
        type: DataTypes.STRING,
        allowNull: false
    },
    category:{
        type: DataTypes.STRING,
        allowNull: false
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'signup',
            key: 'id'
        }
    }
}, {
    tableName: "expenses",
    timestamps: true
});

module.exports = Expense;