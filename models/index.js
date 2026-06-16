const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Ticket = require('./Ticket');

// Definir relaciones
Conversation.belongsTo(User, { as: 'assignedAgent', foreignKey: 'assignedAgentId' });
User.hasMany(Conversation, { foreignKey: 'assignedAgentId' });

Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
Conversation.hasMany(Message, { foreignKey: 'conversationId' });

Ticket.belongsTo(Conversation, { foreignKey: 'conversationId' });
Conversation.hasMany(Ticket, { foreignKey: 'conversationId' });

Ticket.belongsTo(User, { as: 'agente', foreignKey: 'asignadoA' });
Ticket.belongsTo(User, { as: 'locked', foreignKey: 'lockedBy' });
Ticket.belongsTo(User, { as: 'cerrador', foreignKey: 'cerradoPor' });

// Función para sincronizar base de datos
const syncDatabase = async (force = false) => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente');
    
    await sequelize.sync({ force, alter: !force });
    console.log(`✅ Tablas sincronizadas ${force ? '(recreadas)' : '(actualizadas)'}`);
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Conversation,
  Message,
  Ticket,
  syncDatabase
};
