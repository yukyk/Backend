const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER , process.env.DB_PASS , {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
  port: parseInt(process.env.DB_PORT) || 3306,
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000,
    evict: 1000,
    handleDisconnects: true
  },
  retry: {
    match: [/SequelizeConnectionAcquireTimeoutError/, /ER_LOCK_WAIT_TIMEOUT/],
    max: 5
  },
  transactionType: 'IMMEDIATE',
  isolationLevel: 'READ COMMITTED'
});

(async()=> { 
  try{
    await sequelize.authenticate();
    console.log('Connection has been established successfully.'); 
  } catch(err){
    console.log(err);
  }
})();

module.exports = sequelize;
