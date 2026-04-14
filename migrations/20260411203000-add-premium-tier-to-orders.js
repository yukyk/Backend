'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('orders', 'premiumTier', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      comment: '1=basic, 2=plus, 3=elite'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('orders', 'premiumTier');
  }
};