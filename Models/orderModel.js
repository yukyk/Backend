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
        type: DataTypes.STRING,
        defaultValue: 'PENDING'
    },
    premiumTier: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: '1=basic, 2=plus, 3=elite'
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
