const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'conversations',
      key: 'id'
    }
  },
  from: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  to: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'document'),
    defaultValue: 'text'
  },
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
    defaultValue: 'sent'
  },
  whatsappMessageId: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true
  },
  mediaId: {
    type: DataTypes.STRING(255)
  },
  mediaUrl: {
    type: DataTypes.TEXT
  },
  caption: {
    type: DataTypes.TEXT
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'messages',
  timestamps: true,
  indexes: [
    {
      fields: ['conversationId', 'timestamp']
    }
  ]
});

module.exports = Message;
