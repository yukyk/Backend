const { DataTypes } = require("sequelize");
const sequelize = require("../Utils/util");

const Order = sequelize.define("Order", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    orderId: {
        type: DataTypes.STRING,
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
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'SUCCESSFUL', 'FAILED'),
        defaultValue: 'PENDING'
    },
    paymentSessionId: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "orders",
    timestamps: true
});

module.exports = Order;
