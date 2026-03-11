const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('expense_tracker', 'root', 'YusufgitSharp@25321453', {
  host: '127.0.0.1',
  dialect: 'mysql'
});


 (async()=> { try{
    await sequelize.authenticate();
    console.log('Connection has been established successfully.'); 

} catch(err){
    console.log(err);
}})();

module.exports = sequelize;
