const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  phoneNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    defaultValue: ''
  },
  placa: {
    type: DataTypes.STRING(50),
    defaultValue: ''
  },
  cedula: {
    type: DataTypes.STRING(50),
    defaultValue: ''
  },
  estado: {
    type: DataTypes.ENUM('INICIO', 'ESPERANDO_NOMBRE', 'ESPERANDO_PLACA', 'ESPERANDO_CEDULA', 'EN_COLA', 'ASIGNADO'),
    defaultValue: 'INICIO'
  },
  lastMessage: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  lastMessageTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  unreadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('active', 'archived', 'blocked'),
    defaultValue: 'active'
  },
  assignedAgentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
<<<<<<< HEAD
    references: {
      model: 'users',
      key: 'id'
    }
=======
    references: { model: 'users', key: 'id' }
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  },
  posicionEnCola: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  timestampEnCola: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'conversations',
<<<<<<< HEAD
  timestamps: true,
  indexes: [
    {
      fields: ['estado', 'timestampEnCola']
    }
  ]
});

module.exports = Conversation;
=======
  timestamps: true
});

module.exports = Conversation;
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
