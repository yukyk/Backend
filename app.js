require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./Routes/signupRoutes");
const paymentRoutes = require("./Routes/paymentRoutes");
const passwordRoutes = require("./Routes/passwordRoutes");
const sequelize = require("./Utils/util");
const Signup = require("./Models/signupModel");
const Expense = require("./Models/expenseModel");
const Order = require("./Models/orderModel");
const ForgotPasswordRequests = require("./Models/forgotPasswordRequests");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define associations
Signup.hasMany(Expense, { foreignKey: 'userId' });
Expense.belongsTo(Signup, { foreignKey: 'userId' });

Signup.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(Signup, { foreignKey: 'userId' });

Signup.hasMany(ForgotPasswordRequests, { foreignKey: 'userId' });
ForgotPasswordRequests.belongsTo(Signup, { foreignKey: 'userId' });

app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/password", passwordRoutes);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "View")));

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "signup.html"));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "login.html"));
});
app.get("/expense", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "expense.html"));
});

app.get("/payment-options", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "payment-options.html"));
});

app.get("/reset-password", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "reset-password.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "login.html"));
});

// Password reset page with UUID in path
app.get("/password/resetpassword/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "reset-password.html"));
});

sequelize.sync({ alter: true }).then(async () => {
    console.log('Database synced successfully');
    
    app.listen(3000, () => {
        console.log("Server running at http://localhost:3000");
    });
}).catch(err => {
    console.error('Database sync failed:', err);
    process.exit(1);
});
