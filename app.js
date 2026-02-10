const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./Routes/signupRoutes");
const sequelize = require("./Utils/util");
const Signup = require("./Models/signupModel");
const Expense = require("./Models/expenseModel");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define associations
Signup.hasMany(Expense, { foreignKey: 'userId' });
Expense.belongsTo(Signup, { foreignKey: 'userId' });

app.use("/api/auth", authRoutes);

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


sequelize.sync({ alter: true }).then(() => {
    app.listen(3000, () => {
        console.log("Server running at http://localhost:3000");
    });
});
