const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const whatsappService = require('../services/whatsappService');

/**
 * Webhook de verificación (GET)
 * Meta lo usa para verificar tu webhook
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Error verificando webhook');
    res.sendStatus(403);
  }
});

/**
 * Webhook para recibir mensajes (POST)
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Responder inmediatamente a WhatsApp
    res.sendStatus(200);

    // Verificar que sea un mensaje
    if (body.object && body.entry) {
      const entry = body.entry[0];
      const changes = entry.changes[0];
      const value = changes.value;

      // Verificar si es un mensaje
      if (value.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const from = message.from;
        const messageId = message.id;
        const messageType = message.type;

        let messageText = '';
        let mediaUrl = null;
        let mediaId = null;
        let caption = null;

        // Extraer el texto según el tipo
        if (messageType === 'text') {
          messageText = message.text.body;
        } else if (messageType === 'button') {
          messageText = message.button.text;
        } else if (messageType === 'interactive') {
          messageText = message.interactive.button_reply?.title || 
                       message.interactive.list_reply?.title || 
                       'Respuesta interactiva';
        } else if (messageType === 'image') {
          mediaId = message.image.id;
          caption = message.image.caption || '';
          messageText = caption || '📷 Imagen';
        } else if (messageType === 'video') {
          mediaId = message.video.id;
          caption = message.video.caption || '';
          messageText = caption || '🎥 Video';
        } else if (messageType === 'audio') {
          mediaId = message.audio.id;
          messageText = '🎵 Audio';
        } else if (messageType === 'document') {
          mediaId = message.document.id;
          caption = message.document.caption || '';
          messageText = caption || `📄 ${message.document.filename || 'Documento'}`;
        } else if (messageType === 'sticker') {
          mediaId = message.sticker.id;
          messageText = '😊 Sticker';
        } else if (messageType === 'location') {
          messageText = `📍 Ubicación: ${message.location.latitude}, ${message.location.longitude}`;
        } else if (messageType === 'contacts') {
          messageText = '👤 Contacto compartido';
        } else {
          messageText = `Mensaje de tipo: ${messageType}`;
        }

        // Si hay mediaId, obtener la URL
        if (mediaId) {
          const mediaResult = await whatsappService.getMediaUrl(mediaId);
          if (mediaResult.success) {
            mediaUrl = mediaResult.url;
          }
        }

        // Crear objeto de mensaje
        const messageData = {
          from: from,
          to: process.env.WHATSAPP_PHONE_NUMBER_ID,
          message: messageText,
          type: messageType,
          mediaId: mediaId,
          mediaUrl: mediaUrl,
          caption: caption,
          direction: 'inbound',
          whatsappMessageId: messageId,
          status: 'delivered',
          timestamp: new Date()
        };

        // Actualizar o crear conversación con el nuevo mensaje
        await Conversation.findOneAndUpdate(
          { phoneNumber: from },
          {
            phoneNumber: from,
            lastMessage: messageText,
            lastMessageTime: new Date(),
            $inc: { unreadCount: 1 },
            $push: { messages: messageData }
          },
          { upsert: true, new: true }
        );

        // Marcar mensaje como leído
        await whatsappService.markAsRead(messageId);

        // Respuesta automática simple (personaliza según tus necesidades)
        const autoReply = await processIncomingMessage(messageText, from);
        
        if (autoReply) {
          const result = await whatsappService.sendTextMessage(from, autoReply);
          
          if (result.success) {
            // Guardar respuesta enviada en la conversación
            const replyMessageData = {
              from: process.env.WHATSAPP_PHONE_NUMBER_ID,
              to: from,
              message: autoReply,
              type: 'text',
              direction: 'outbound',
              whatsappMessageId: result.messageId,
              status: 'sent',
              timestamp: new Date()
            };

            await Conversation.findOneAndUpdate(
              { phoneNumber: from },
              {
                lastMessage: autoReply,
                lastMessageTime: new Date(),
                $push: { messages: replyMessageData }
              }
            );
          }
        }
      }

      // Verificar si es actualización de estado
      if (value.statuses && value.statuses.length > 0) {
        const status = value.statuses[0];
        const messageId = status.id;
        const newStatus = status.status; // sent, delivered, read

        // Actualizar estado del mensaje en la conversación
        await Conversation.updateOne(
          { 'messages.whatsappMessageId': messageId },
          { $set: { 'messages.$.status': newStatus } }
        );
      }
    }
  } catch (error) {
    console.error('Error procesando webhook:', error);
  }
});

/**
 * Función para procesar mensajes entrantes según el estado del usuario
 */
async function processIncomingMessage(message, from) {
  const lowerMessage = message.toLowerCase().trim();

  // Buscar o crear conversación
  let conversation = await Conversation.findOne({ phoneNumber: from });
  let ticket = null;
  
  // Buscar ticket existente (no cerrado)
  ticket = await Ticket.findOne({ 
    phoneNumber: from,
    estado: { $ne: 'CERRADO' }
  }).sort({ fechaCreacion: -1 });
  
  console.log(`📞 Mensaje de ${from}: "${message.substring(0, 50)}" | Ticket: ${ticket?.numeroTicket || 'Sin ticket'} | Estado conv: ${conversation?.estado}`);
  
  if (!conversation) {
    // Primera vez que escribe - crear conversación en ESPERANDO_PLACA
    conversation = new Conversation({
      phoneNumber: from,
      estado: 'ESPERANDO_PLACA'
    });
    await conversation.save();
    
    return `¡Hola! 👋 ¡Bienvenido!\n\n📝 Para poder ayudarte, necesito que me proporciones algunos datos.\n\nPor favor, ingresa la *PLACA* de tu vehículo\n(Formato: ABC123):`;
  }

  // Manejo de estados
  switch (conversation.estado) {
    case 'ESPERANDO_PLACA':
      // Validar formato colombiano: 3 letras + 3 números (ABC123)
      const placaLimpia = message.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const formatoPlacaColombia = /^[A-Z]{3}[0-9]{3}$/;
      
      if (!formatoPlacaColombia.test(placaLimpia)) {
        return '❌ La placa no es válida.\n\nEl formato debe ser: *3 letras + 3 números*\nEjemplo: ABC123\n\nPor favor, ingresa tu placa correctamente:';
      }
      
      conversation.placa = placaLimpia;
      conversation.estado = 'ESPERANDO_CEDULA';
      await conversation.save();
      
      return `✅ Placa registrada: *${placaLimpia}*\n\nAhora, ingresa tu *número de CÉDULA*:`;

    case 'ESPERANDO_CEDULA':
      // Validar y guardar cédula
      const cedulaLimpia = message.trim().replace(/\D/g, ''); // Solo números
      
      if (cedulaLimpia.length < 6 || cedulaLimpia.length > 10) {
        return '❌ La cédula ingresada no es válida.\n\nDebe tener entre 6 y 10 dígitos.\n\nPor favor, ingresa tu cédula correctamente:';
      }
      
      conversation.cedula = cedulaLimpia;
      conversation.estado = 'EN_COLA';
      conversation.timestampEnCola = new Date();
      
      // Calcular posición en cola
      const posicion = await Conversation.countDocuments({
        estado: { $in: ['EN_COLA', 'ASIGNADO'] },
        timestampEnCola: { $lt: conversation.timestampEnCola }
      }) + 1;
      
      conversation.posicionEnCola = posicion;
      await conversation.save();
      
      // CREAR TICKET AHORA que tenemos placa y cédula
      ticket = new Ticket({
        conversationId: conversation._id,
        phoneNumber: from,
        placa: conversation.placa,
        cedula: cedulaLimpia,
        descripcion: `Solicitud de atención - Placa: ${conversation.placa} - Cédula: ${cedulaLimpia}`,
        prioridad: 'MEDIA',
        estado: 'PENDIENTE'
      });
      await ticket.save();
      
      console.log(`🎫 Ticket creado: ${ticket.numeroTicket} para ${from}`);
      
      return `✅ Datos registrados correctamente:\n\n🎫 *Ticket: ${ticket.numeroTicket}*\n🚗 Placa: *${conversation.placa}*\n🆔 Cédula: *${cedulaLimpia}*\n\n⏳ Estás en la posición *${posicion}* de la cola.\n\nUn agente te atenderá pronto. Gracias por tu paciencia.`;

    case 'EN_COLA':
      // Usuario está en cola esperando
      const posicionActual = await Conversation.countDocuments({
        estado: { $in: ['EN_COLA', 'ASIGNADO'] },
        timestampEnCola: { $lt: conversation.timestampEnCola }
      }) + 1;
      
      conversation.posicionEnCola = posicionActual;
      await conversation.save();
      
      return `⏳ Sigues en cola.\n\n🎫 Ticket: *${ticket?.numeroTicket || 'N/A'}*\nPosición actual: *${posicionActual}*\n\nUn agente te atenderá pronto. Por favor espera.`;

    case 'ASIGNADO':
      // Usuario ya fue asignado a un agente
      const agente = conversation.assignedAgent;
      if (agente) {
        const User = require('../models/User');
        const agenteInfo = await User.findById(agente);
        return `✅ Ya fuiste asignado a un agente.\n\n🎫 Ticket: *${ticket?.numeroTicket || 'N/A'}*\n👤 Agente: *${agenteInfo?.username || 'Agente'}*\n\nTe responderemos en breve.`;
      } else {
        return `✅ Estás siendo atendido.\n\n🎫 Ticket: *${ticket?.numeroTicket || 'N/A'}*\n\nUn agente revisará tu solicitud.`;
      }

    case 'INICIO':
    default:
      // Estado desconocido o INICIO, reiniciar flujo
      conversation.estado = 'ESPERANDO_PLACA';
      await conversation.save();
      return `¡Hola! 👋 ¡Bienvenido!\n\n📝 Para poder ayudarte, necesito que me proporciones algunos datos.\n\nPor favor, ingresa la *PLACA* de tu vehículo\n(Formato: ABC123):`;
  }
}

module.exports = router;
