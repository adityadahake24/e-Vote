'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("options", "questionId", {
      type: Sequelize.DataTypes.INTEGER,
      onDelete: "CASCADE",
    });

    await queryInterface.addConstraint("options", {
      fields: ["questionId"],
      type: "foreign key",
      onDelete: "CASCADE",
      references: {
        table: "questions",
        field: "id",
      },
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("options", "questionId");
  }
};
