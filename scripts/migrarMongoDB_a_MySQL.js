<<<<<<< HEAD
const mongoose = require('mongoose');
const { sequelize, User, Conversation, Message, Ticket } = require('../models');
require('dotenv').config();

// Modelos de MongoDB (los antiguos)
const UserMongo = mongoose.model('User', new mongoose.Schema({
=======
/**
 * Script de migración desde MongoDB a MySQL (Sequelize)
 * Ejecutar: node scripts/migrarMongoDB_a_MySQL.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Sequelize, Op } = require('sequelize');
const {
  sequelize,
  User,
  Conversation,
  Message,
  Ticket,
  syncDatabase
} = require('../models');

// ----------------------------------------------------------------------
// 1. MODELOS DE MONGO (para leer los datos actuales)
// ----------------------------------------------------------------------
const mongoUserSchema = new mongoose.Schema({
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  username: String,
  email: String,
  password: String,
  role: String,
  createdAt: Date
<<<<<<< HEAD
}), 'users');

const ConversationMongo = mongoose.model('Conversation', new mongoose.Schema({
=======
}, { collection: 'users' });

const mongoConversationSchema = new mongoose.Schema({
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  phoneNumber: String,
  name: String,
  placa: String,
  cedula: String,
  estado: String,
<<<<<<< HEAD
  messages: Array,
=======
  messages: Array,       // array de mensajes embebidos
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  lastMessage: String,
  lastMessageTime: Date,
  unreadCount: Number,
  status: String,
  assignedAgent: mongoose.Schema.Types.ObjectId,
  posicionEnCola: Number,
  timestampEnCola: Date,
  createdAt: Date
<<<<<<< HEAD
}), 'conversations');

const MessageMongo = mongoose.model('Message', new mongoose.Schema({
  conversationId: String,
=======
}, { collection: 'conversations' });

const mongoMessageSchema = new mongoose.Schema({
  conversationId: String,   // string con el phoneNumber (NO ObjectId)
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
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
<<<<<<< HEAD
}), 'messages');

const TicketMongo = mongoose.model('Ticket', new mongoose.Schema({
=======
}, { collection: 'messages' });

const mongoTicketSchema = new mongoose.Schema({
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
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
<<<<<<< HEAD
=======
  notas: Array,          // [{ texto, usuario, fecha }]
  archivosAdjuntos: Array,
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  fechaCreacion: Date,
  fechaActualizacion: Date,
  fechaCierre: Date,
  fechaFinalizacion: Date,
  tiempoResolucion: Number,
<<<<<<< HEAD
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
=======
  cerradoPor: mongoose.Schema.Types.ObjectId
}, { collection: 'tickets' });

const MongoUser = mongoose.model('MongoUser', mongoUserSchema);
const MongoConversation = mongoose.model('MongoConversation', mongoConversationSchema);
const MongoMessage = mongoose.model('MongoMessage', mongoMessageSchema);
const MongoTicket = mongoose.model('MongoTicket', mongoTicketSchema);

// ----------------------------------------------------------------------
// 2. FUNCIÓN PRINCIPAL DE MIGRACIÓN
// ----------------------------------------------------------------------
async function migrate() {
  console.log('🚀 Iniciando migración MongoDB → MySQL\n');

  // Conectar a MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-chatbot';
  console.log(`🔗 Conectando a MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('✅ Conectado a MongoDB');

  // Conectar y sincronizar MySQL (crea tablas si no existen)
  console.log('🔗 Sincronizando MySQL...');
  await syncDatabase({ force: true }); // ¡CUIDADO! force:true borra y recrea tablas
  console.log('✅ Tablas MySQL listas');

  // Mapeo de ObjectId de MongoDB -> id numérico de MySQL
  const userIdMap = new Map();      // old ObjectId string -> new User.id
  const conversationIdMap = new Map(); // old ObjectId string -> new Conversation.id

  // --------------------------------------------------------------------
  // 2.1 Migrar Usuarios
  // --------------------------------------------------------------------
  console.log('\n📥 Migrando usuarios...');
  const mongoUsers = await MongoUser.find();
  for (const mUser of mongoUsers) {
    const newUser = await User.create({
      username: mUser.username,
      email: mUser.email,
      password: mUser.password,   // ya viene hasheada de MongoDB
      role: mUser.role || 'agent',
      createdAt: mUser.createdAt,
      updatedAt: mUser.createdAt   // o usar fecha actual
    }, { hooks: false }); // evitar re-hashear la contraseña
    userIdMap.set(mUser._id.toString(), newUser.id);
  }
  console.log(`✅ ${mongoUsers.length} usuarios migrados`);

  // --------------------------------------------------------------------
  // 2.2 Migrar Conversaciones y sus mensajes embebidos
  // --------------------------------------------------------------------
  console.log('\n📥 Migrando conversaciones y mensajes embebidos...');
  const mongoConvs = await MongoConversation.find();
  for (const mConv of mongoConvs) {
    const assignedAgentId = mConv.assignedAgent ? userIdMap.get(mConv.assignedAgent.toString()) : null;

    const newConv = await Conversation.create({
      phoneNumber: mConv.phoneNumber,
      name: mConv.name || '',
      placa: mConv.placa || '',
      cedula: mConv.cedula || '',
      estado: mConv.estado || 'INICIO',
      lastMessage: mConv.lastMessage || '',
      lastMessageTime: mConv.lastMessageTime || new Date(),
      unreadCount: mConv.unreadCount || 0,
      status: mConv.status || 'active',
      assignedAgentId,
      posicionEnCola: mConv.posicionEnCola,
      timestampEnCola: mConv.timestampEnCola,
      createdAt: mConv.createdAt || new Date(),
      updatedAt: mConv.createdAt || new Date()
    });
    conversationIdMap.set(mConv._id.toString(), newConv.id);

    // Migrar mensajes que están embebidos en la conversación (array messages)
    if (mConv.messages && mConv.messages.length) {
      const messagesToInsert = mConv.messages.map(msg => ({
        conversationId: newConv.id,
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
        timestamp: msg.timestamp || new Date(),
        createdAt: msg.timestamp || new Date(),
        updatedAt: msg.timestamp || new Date()
      }));
      await Message.bulkCreate(messagesToInsert);
    }
  }
  console.log(`✅ ${mongoConvs.length} conversaciones migradas`);

  // --------------------------------------------------------------------
  // 2.3 Migrar mensajes sueltos (colección messages independiente)
  // --------------------------------------------------------------------
  console.log('\n📥 Migrando mensajes sueltos (colección messages) ...');
  const mongoMessages = await MongoMessage.find();
  let insertedMessages = 0;
  for (const mMsg of mongoMessages) {
    // El conversationId en mMsg es un string que representa el phoneNumber (no el ObjectId)
    // Buscamos la conversación por phoneNumber en MySQL
    const conversation = await Conversation.findOne({
      where: { phoneNumber: mMsg.conversationId }
    });
    if (conversation) {
      await Message.create({
        conversationId: conversation.id,
        from: mMsg.from,
        to: mMsg.to,
        message: mMsg.message,
        type: mMsg.type || 'text',
        direction: mMsg.direction,
        status: mMsg.status || 'sent',
        whatsappMessageId: mMsg.whatsappMessageId,
        mediaId: mMsg.mediaId,
        mediaUrl: mMsg.mediaUrl,
        caption: mMsg.caption,
        timestamp: mMsg.timestamp || new Date(),
        createdAt: mMsg.timestamp || new Date(),
        updatedAt: mMsg.timestamp || new Date()
      });
      insertedMessages++;
    } else {
      console.warn(`⚠️ Mensaje ${mMsg._id} sin conversación asociada (phoneNumber ${mMsg.conversationId})`);
    }
  }
  console.log(`✅ ${insertedMessages} mensajes sueltos migrados`);

  // --------------------------------------------------------------------
  // 2.4 Migrar Tickets
  // --------------------------------------------------------------------
  console.log('\n📥 Migrando tickets...');
  const mongoTickets = await MongoTicket.find();
  for (const mTicket of mongoTickets) {
    const conversationId = conversationIdMap.get(mTicket.conversationId?.toString());
    if (!conversationId) {
      console.warn(`⚠️ Ticket ${mTicket.numeroTicket} sin conversación asociada, se omite`);
      continue;
    }

    const asignadoA = mTicket.asignadoA ? userIdMap.get(mTicket.asignadoA.toString()) : null;
    const lockedBy = mTicket.lockedBy ? userIdMap.get(mTicket.lockedBy.toString()) : null;
    const cerradoPor = mTicket.cerradoPor ? userIdMap.get(mTicket.cerradoPor.toString()) : null;

    // Convertir arrays a JSON string
    const notasJSON = JSON.stringify(mTicket.notas || []);
    const archivosJSON = JSON.stringify(mTicket.archivosAdjuntos || []);

    await Ticket.create({
      numeroTicket: mTicket.numeroTicket,
      conversationId,
      phoneNumber: mTicket.phoneNumber,
      nombreCliente: mTicket.nombreCliente || 'Cliente',
      placa: mTicket.placa || '',
      cedula: mTicket.cedula || '',
      descripcion: mTicket.descripcion || 'Solicitud de atención',
      contadorTickets: mTicket.contadorTickets || 1,
      estado: mTicket.estado || 'PENDIENTE',
      prioridad: mTicket.prioridad || 'MEDIA',
      asignadoA,
      lockedBy,
      lockedAt: mTicket.lockedAt,
      notas: notasJSON,
      archivosAdjuntos: archivosJSON,
      fechaCreacion: mTicket.fechaCreacion,
      fechaCierre: mTicket.fechaCierre,
      fechaFinalizacion: mTicket.fechaFinalizacion,
      tiempoResolucion: mTicket.tiempoResolucion,
      cerradoPor,
      createdAt: mTicket.fechaCreacion,
      updatedAt: mTicket.fechaActualizacion || mTicket.fechaCreacion
    }, { hooks: false });
  }
  console.log(`✅ ${mongoTickets.length} tickets migrados`);

  // --------------------------------------------------------------------
  // 3. RESUMEN FINAL
  // --------------------------------------------------------------------
  console.log('\n✅ Migración completada exitosamente');
  console.log('📊 Resumen:');
  console.log(`   - Usuarios:      ${mongoUsers.length}`);
  console.log(`   - Conversaciones: ${mongoConvs.length}`);
  console.log(`   - Mensajes:       ${insertedMessages} (sueltos) + mensajes embebidos (dentro de conversaciones)`);
  console.log(`   - Tickets:        ${mongoTickets.length}`);

  await mongoose.disconnect();
  await sequelize.close();
  console.log('\n🔌 Conexiones cerradas. ¡Listo!');
}

// ----------------------------------------------------------------------
// EJECUCIÓN
// ----------------------------------------------------------------------
migrate().catch(err => {
  console.error('❌ Error fatal en la migración:', err);
  process.exit(1);
});
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
