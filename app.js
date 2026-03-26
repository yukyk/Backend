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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define associations
Signup.hasMany(Expense, { foreignKey: 'userId' });
Expense.belongsTo(Signup, { foreignKey: 'userId' });

Signup.hasMany(Income, { foreignKey: 'userId' });
Income.belongsTo(Signup, { foreignKey: 'userId' });

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

// Helper function to clean up excess indexes
async function cleanupExcessIndexes() {
    try {
        const [results] = await sequelize.query(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'signup' 
            AND INDEX_NAME != 'PRIMARY'
            AND SEQ_IN_INDEX > 4
        `);
        
        for (const idx of results) {
            try {
                await sequelize.query(`DROP INDEX \`${idx.INDEX_NAME}\` ON \`signup\``);
                console.log(`Dropped excess index: ${idx.INDEX_NAME}`);
            } catch (dropErr) {
                console.log(`Could not drop index ${idx.INDEX_NAME}:`, dropErr.message);
            }
        }
    } catch (err) {
        console.log('Index cleanup skipped:', err.message);
    }
}

// Sync database with error handling for index limits
sequelize.sync({ alter: true }).then(async () => {
    console.log('Database synced successfully');
    
    // Clean up any excess indexes that might cause issues
    await cleanupExcessIndexes();
    
    app.listen(3000, () => {
        console.log("Server running at http://localhost:3000");
    });
}).catch(async (err) => {
    // If sync fails due to too many keys, try without alter
    if (err.code === 'ER_TOO_MANY_KEYS' || err.parent?.code === 'ER_TOO_MANY_KEYS') {
        console.log('Detected too many indexes. Retrying sync without alter...');
        try {
            await sequelize.sync({ alter: false });
            console.log('Database synced successfully (without alter)');
            
            // Clean up excess indexes
            await cleanupExcessIndexes();
            
            app.listen(3000, () => {
                console.log("Server running at http://localhost:3000");
            });
        } catch (retryErr) {
            console.error('Database sync retry failed:', retryErr);
            process.exit(1);
        }
    } else {
        console.error('Database sync failed:', err);
        process.exit(1);
    }
});
