/**
 * Script de migración para mover mensajes de la colección Message a Conversation
 * Ejecutar una sola vez: node scripts/migrarMensajes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

async function migrarMensajes() {
  try {
    console.log('🔄 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-chatbot');
    console.log('✅ Conectado a MongoDB');

    console.log('📦 Obteniendo todos los mensajes...');
    const messages = await Message.find().sort({ timestamp: 1 });
    console.log(`📊 Total de mensajes encontrados: ${messages.length}`);

    // Agrupar mensajes por conversación
    const messagesByConversation = {};
    messages.forEach(msg => {
      const phoneNumber = msg.conversationId;
      if (!messagesByConversation[phoneNumber]) {
        messagesByConversation[phoneNumber] = [];
      }
      messagesByConversation[phoneNumber].push({
        from: msg.from,
        to: msg.to,
        message: msg.message,
        type: msg.type,
        direction: msg.direction,
        whatsappMessageId: msg.whatsappMessageId,
        status: msg.status,
        timestamp: msg.timestamp
      });
    });

    console.log(`📋 Conversaciones únicas: ${Object.keys(messagesByConversation).length}`);

    // Migrar mensajes a cada conversación
    let migrados = 0;
    for (const [phoneNumber, msgs] of Object.entries(messagesByConversation)) {
      try {
        await Conversation.findOneAndUpdate(
          { phoneNumber },
          { 
            $set: { messages: msgs },
            $setOnInsert: { phoneNumber }
          },
          { upsert: true }
        );
        migrados++;
        console.log(`✅ Migrados ${msgs.length} mensajes para ${phoneNumber}`);
      } catch (error) {
        console.error(`❌ Error migrando conversación ${phoneNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Migración completada: ${migrados} conversaciones actualizadas`);
    console.log(`📊 Total de mensajes migrados: ${messages.length}`);
    
    console.log('\n⚠️  IMPORTANTE:');
    console.log('Los mensajes ahora están en las conversaciones.');
    console.log('Si todo funciona correctamente, puedes eliminar la colección Message:');
    console.log('   use whatsapp-chatbot');
    console.log('   db.messages.drop()');

    await mongoose.connection.close();
    console.log('\n🔒 Conexión cerrada');
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrarMensajes();
