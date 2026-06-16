const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'whatsapp_bot',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '',
  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    logging: false,
<<<<<<< HEAD
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
=======
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

module.exports = sequelize;
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
