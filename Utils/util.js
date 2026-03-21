const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('expense_tracker', 'root', 'YusufgitSharp@25321453', {
  host: '127.0.0.1',
  dialect: 'mysql',
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


 (async()=> { try{
    await sequelize.authenticate();
    console.log('Connection has been established successfully.'); 

} catch(err){
    console.log(err);
}})();

module.exports = sequelize;
