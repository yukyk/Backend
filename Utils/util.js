const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME || 'expense_tracker', process.env.DB_USER || 'root', process.env.DB_PASS || 'YusufgitSharp@25321453', {
  host: process.env.DB_HOST || '127.0.0.1',
  dialect: process.env.DB_DIALECT || 'mysql',
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
    max: 3
  }
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
