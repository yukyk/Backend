require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./Routes/signupRoutes");
const paymentRoutes = require("./Routes/paymentRoutes");
const passwordRoutes = require("./Routes/passwordRoutes");
const { connectDB } = require("./Utils/util");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/password", passwordRoutes);

// Page Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "login.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "login.html"));
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "signup.html"));
});

app.get("/password/resetpassword/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "reset-password.html"));
});

app.get("/expense", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "expense.html"));
});

app.get("/payment",(req,res)=>{
    res.sendFile(path.join(__dirname, "View", "payment.html"));
});

app.get("/payment-options", (req, res) => {
    res.sendFile(path.join(__dirname, "View", "payment-options.html"));
});

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "View")));

// Database connection
connectDB()
    .then(() => {
        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.error("Failed to start server:", err.message);
    });