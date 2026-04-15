const { Sequelize } = require('sequelize');
console.log("FINAL CONFIG:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  passLength: process.env.DB_PASS?.length
});
console.log("PASSWORD:", JSON.stringify(process.env.DB_PASS));
console.log("USER:", JSON.stringify(process.env.DB_USER));

const sequelize = new Sequelize(
  "expense_tracker",
  "admin",
  "yyuussuuff",
  {
    host: "database-1.cfec2oooihzf.ap-south-1.rds.amazonaws.com",
    dialect: "mysql",
    port: 3306
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
  } catch (err) {
    console.log('❌ DB error:', err.message);
  }
})();

module.exports = sequelize;