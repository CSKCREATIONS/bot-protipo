const mongoose = require('mongoose');
const { sequelize, User, Conversation, Message, Ticket } = require('../models');
require('dotenv').config();

// Modelos de MongoDB (los antiguos)
const UserMongo = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
  createdAt: Date
}), 'users');

const ConversationMongo = mongoose.model('Conversation', new mongoose.Schema({
  phoneNumber: String,
  name: String,
  placa: String,
  cedula: String,
  estado: String,
  messages: Array,
  lastMessage: String,
  lastMessageTime: Date,
  unreadCount: Number,
  status: String,
  assignedAgent: mongoose.Schema.Types.ObjectId,
  posicionEnCola: Number,
  timestampEnCola: Date,
  createdAt: Date
}), 'conversations');

const MessageMongo = mongoose.model('Message', new mongoose.Schema({
  conversationId: String,
  from: String,
  to: String,
  message: String,
  type: String,
  direction: String,
  status: String,
  whatsappMessageId: String,
  mediaId: String,
  mediaUrl: String,
  caption: String,
  timestamp: Date
}), 'messages');

const TicketMongo = mongoose.model('Ticket', new mongoose.Schema({
  numeroTicket: String,
  conversationId: mongoose.Schema.Types.ObjectId,
  phoneNumber: String,
  nombreCliente: String,
  placa: String,
  cedula: String,
  descripcion: String,
  contadorTickets: Number,
  estado: String,
  prioridad: String,
  asignadoA: mongoose.Schema.Types.ObjectId,
  lockedBy: mongoose.Schema.Types.ObjectId,
  lockedAt: Date,
  fechaCreacion: Date,
  fechaActualizacion: Date,
  fechaCierre: Date,
  fechaFinalizacion: Date,
  tiempoResolucion: Number,
  cerradoPor: mongoose.Schema.Types.ObjectId,
  notas: Array,
  archivosAdjuntos: Array
}), 'tickets');

async function migrateData() {
  try {
    console.log('🔄 Iniciando migración de MongoDB a MySQL...\n');
    
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado a MongoDB');
    
    // Conectar a MySQL y crear tablas
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL');
    
    await sequelize.sync({ force: true }); // Recrear tablas
    console.log('✅ Tablas MySQL creadas\n');
    
    // Mapa para conversión de ObjectIds
    const userIdMap = new Map();
    const conversationIdMap = new Map();
    
    // 1. Migrar Usuarios
    console.log('📊 Migrando usuarios...');
    const usersMongo = await UserMongo.find();
    for (const userDoc of usersMongo) {
      const userSQL = await User.create({
        username: userDoc.username,
        email: userDoc.email,
        password: userDoc.password, // Ya está hasheado
        role: userDoc.role || 'agent',
        createdAt: userDoc.createdAt
      }, {
        hooks: false // Desactivar hooks para no re-hashear
      });
      userIdMap.set(userDoc._id.toString(), userSQL.id);
    }
    console.log(`✅ ${usersMongo.length} usuarios migrados\n`);
    
    // 2. Migrar Conversaciones
    console.log('📊 Migrando conversaciones...');
    const conversationsMongo = await ConversationMongo.find();
    for (const convDoc of conversationsMongo) {
      const assignedAgentId = convDoc.assignedAgent 
        ? userIdMap.get(convDoc.assignedAgent.toString()) 
        : null;
      
      const convSQL = await Conversation.create({
        phoneNumber: convDoc.phoneNumber,
        name: convDoc.name || '',
        placa: convDoc.placa || '',
        cedula: convDoc.cedula || '',
        estado: convDoc.estado || 'INICIO',
        lastMessage: convDoc.lastMessage || '',
        lastMessageTime: convDoc.lastMessageTime || new Date(),
        unreadCount: convDoc.unreadCount || 0,
        status: convDoc.status || 'active',
        assignedAgentId,
        posicionEnCola: convDoc.posicionEnCola,
        timestampEnCola: convDoc.timestampEnCola,
        createdAt: convDoc.createdAt
      });
      
      conversationIdMap.set(convDoc._id.toString(), convSQL.id);
      
      // Migrar mensajes embebidos en conversation
      if (convDoc.messages && convDoc.messages.length > 0) {
        const messagesToCreate = convDoc.messages.map(msg => ({
          conversationId: convSQL.id,
          from: msg.from,
          to: msg.to,
          message: msg.message,
          type: msg.type || 'text',
          direction: msg.direction,
          status: msg.status || 'sent',
          whatsappMessageId: msg.whatsappMessageId,
          mediaId: msg.mediaId,
          mediaUrl: msg.mediaUrl,
          caption: msg.caption,
          timestamp: msg.timestamp || new Date()
        }));
        
        await Message.bulkCreate(messagesToCreate);
      }
    }
    console.log(`✅ ${conversationsMongo.length} conversaciones migradas\n`);
    
    // 3. Migrar Mensajes (tabla separada)
    console.log('📊 Migrando mensajes (tabla messages)...');
    const messagesMongo = await MessageMongo.find();
    let migratedMessages = 0;
    
    for (const msgDoc of messagesMongo) {
      // conversationId en Message puede ser String del ObjectId
      const conversationId = conversationIdMap.get(msgDoc.conversationId);
      
      if (conversationId) {
        await Message.create({
          conversationId,
          from: msgDoc.from,
          to: msgDoc.to,
          message: msgDoc.message,
          type: msgDoc.type || 'text',
          direction: msgDoc.direction,
          status: msgDoc.status || 'sent',
          whatsappMessageId: msgDoc.whatsappMessageId,
          mediaId: msgDoc.mediaId,
          mediaUrl: msgDoc.mediaUrl,
          caption: msgDoc.caption,
          timestamp: msgDoc.timestamp || new Date()
        });
        migratedMessages++;
      }
    }
    console.log(`✅ ${migratedMessages} mensajes migrados\n`);
    
    // 4. Migrar Tickets
    console.log('📊 Migrando tickets...');
    const ticketsMongo = await TicketMongo.find();
    for (const ticketDoc of ticketsMongo) {
      const conversationId = conversationIdMap.get(ticketDoc.conversationId.toString());
      const asignadoA = ticketDoc.asignadoA 
        ? userIdMap.get(ticketDoc.asignadoA.toString()) 
        : null;
      const lockedBy = ticketDoc.lockedBy 
        ? userIdMap.get(ticketDoc.lockedBy.toString()) 
        : null;
      const cerradoPor = ticketDoc.cerradoPor 
        ? userIdMap.get(ticketDoc.cerradoPor.toString()) 
        : null;
      
      if (conversationId) {
        await Ticket.create({
          numeroTicket: ticketDoc.numeroTicket,
          conversationId,
          phoneNumber: ticketDoc.phoneNumber,
          nombreCliente: ticketDoc.nombreCliente,
          placa: ticketDoc.placa || '',
          cedula: ticketDoc.cedula || '',
          descripcion: ticketDoc.descripcion || 'Solicitud de atención',
          contadorTickets: ticketDoc.contadorTickets || 1,
          estado: ticketDoc.estado || 'PENDIENTE',
          prioridad: ticketDoc.prioridad || 'MEDIA',
          asignadoA,
          lockedBy,
          lockedAt: ticketDoc.lockedAt,
          fechaCierre: ticketDoc.fechaCierre,
          fechaFinalizacion: ticketDoc.fechaFinalizacion,
          tiempoResolucion: ticketDoc.tiempoResolucion,
          cerradoPor,
          notas: JSON.stringify(ticketDoc.notas || []),
          createdAt: ticketDoc.fechaCreacion,
          updatedAt: ticketDoc.fechaActualizacion
        }, {
          hooks: false // Desactivar hooks para preservar datos originales
        });
      }
    }
    console.log(`✅ ${ticketsMongo.length} tickets migrados\n`);
    
    console.log('✅ Migración completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Usuarios: ${usersMongo.length}`);
    console.log(`   - Conversaciones: ${conversationsMongo.length}`);
    console.log(`   - Mensajes: ${migratedMessages}`);
    console.log(`   - Tickets: ${ticketsMongo.length}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    await sequelize.close();
    console.log('\n🔌 Conexiones cerradas');
  }
}

// Ejecutar migración
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('\n✅ Proceso de migración finalizado');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error fatal:', err);
      process.exit(1);
    });
}

module.exports = migrateData;
