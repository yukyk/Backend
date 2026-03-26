const { DataTypes } = require("sequelize");
const sequelize = require("../Utils/util");

const Income = sequelize.define("Income", {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    amount:{
        type: DataTypes.FLOAT,
        allowNull: false,
        validate:{
            min:1
        }
    },

    description:{
        type: DataTypes.STRING,
        allowNull: false
    },
    category:{
        type: DataTypes.STRING,
        allowNull: false
    },
    status:{
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'completed'
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'signup',
            key: 'id',
            onDelete: 'CASCADE'
        }
    }
}, {
    tableName: "incomes",
    timestamps: true
});

module.exports = Income;
