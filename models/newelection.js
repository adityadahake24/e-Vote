'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class newelection extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  newelection.init({
    publicurl: DataTypes.STRING,
    electionname: DataTypes.STRING,
    launched: DataTypes.STRING,
    ended: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'newelection',
  });
  return newelection;
};