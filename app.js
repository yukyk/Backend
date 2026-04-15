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
const Income = require("./Models/incomeModel");
const Order = require("./Models/orderModel");
const ForgotPasswordRequests = require("./Models/forgotPasswordRequests");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Associations
Signup.hasMany(Expense, { foreignKey: "userId" });
Expense.belongsTo(Signup, { foreignKey: "userId" });

Signup.hasMany(Income, { foreignKey: "userId" });
Income.belongsTo(Signup, { foreignKey: "userId" });

Signup.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(Signup, { foreignKey: "userId" });

Signup.hasMany(ForgotPasswordRequests, { foreignKey: "userId" });
ForgotPasswordRequests.belongsTo(Signup, { foreignKey: "userId" });

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/password", passwordRoutes);

// Page Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "signup.html"));
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "signup.html"));
});

app.get("/login", (req, res) => {
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

app.get("/password/resetpassword/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "reset-password.html"));
});

app.get("/tracker", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dist", "index.html"));
});

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/tracker", express.static(path.join(__dirname, "public", "dist")));
app.use(express.static(path.join(__dirname, "View")));

// Database sync
sequelize
    .sync({ alter: true })
    .then(() => {
        console.log("Database synced successfully");

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.error("Database sync failed:", err.message);
    });