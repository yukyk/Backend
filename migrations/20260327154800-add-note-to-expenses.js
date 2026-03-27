'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     * 
     * Example:
     * await queryInterface.addColumn('users', 'note', { type: Sequelize.STRING });
     */
    await queryInterface.addColumn('expenses', 'note', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     * 
     * Example:
     * await queryInterface.removeColumn('users', 'note');
     */
    await queryInterface.removeColumn('expenses', 'note');
  }
};
