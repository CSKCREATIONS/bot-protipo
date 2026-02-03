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
        
        // 🚫 PROTECCIÓN CONTRA EDICIÓN DE MENSAJES
        // Los mensajes editados en WhatsApp pueden tener varios indicadores
        
        // 1. Verificar si el mensaje tiene contexto de edición
        if (message.context && message.context.id) {
          const referencedMessageId = message.context.id;
          
          // Buscar si el mensaje referenciado ya existe en nuestro sistema
          const referencedMessage = await Conversation.findOne({
            'messages.whatsappMessageId': referencedMessageId
          });
          
          if (referencedMessage) {
            console.log(`🚫 Intento de edición detectado. Mensaje original: ${referencedMessageId}`);
            
            // Registrar intento de edición en el ticket si existe
            const ticket = await Ticket.findOne({ 
              phoneNumber: message.from,
              estado: { $ne: 'CERRADO' }
            }).sort({ fechaCreacion: -1 });
            
            if (ticket) {
              ticket.notas.push({
                texto: `⚠️ INTENTO DE EDICIÓN DETECTADO\nEl cliente intentó editar un mensaje anterior.\nMensaje que intentó enviar: "${message.text?.body?.substring(0, 100) || 'multimedia'}"\n\nPor seguridad, la edición fue rechazada y se mantuvo el mensaje original.`,
                fecha: new Date()
              });
              await ticket.save();
              console.log(`📋 Intento de edición registrado en ticket ${ticket.numeroTicket}`);
            }
            
            // Enviar notificación al usuario que no se permiten ediciones
            await whatsappService.sendTextMessage(
              message.from,
              '⚠️ *Edición no permitida*\n\nPor políticas de seguridad y trazabilidad, no podemos procesar mensajes editados.\n\nSi necesitas corregir información, envía un nuevo mensaje con los datos correctos.'
            );
            
            // Registrar el intento en logs pero no guardar el mensaje
            console.log(`📝 Usuario ${message.from} intentó editar mensaje: "${message.text?.body?.substring(0, 50) || 'multimedia'}"`);
            return; // No procesar el mensaje editado
          }
        }
        
        // 2. Verificar si este ID de mensaje ya existe (duplicado/editado)
        const existingMessage = await Conversation.findOne({
          'messages.whatsappMessageId': message.id
        });
        
        if (existingMessage) {
          console.log(`🚫 Mensaje duplicado/editado detectado (ID: ${message.id}). Ignorando.`);
          return; // No procesar mensajes duplicados
        }
        
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
          } else if (mediaResult.tokenBlocked) {
            // Token bloqueado - guardar mensaje pero sin URL
            console.log('⚠️ No se puede obtener URL del medio (token bloqueado). Guardando sin URL.');
            mediaUrl = null;
            
            // Notificar al usuario que se recibió el archivo pero hay problemas técnicos
            await whatsappService.sendTextMessage(
              from,
              '⚠️ *Archivo recibido con advertencia*\n\nHemos registrado tu archivo, pero hay un problema temporal con nuestro sistema.\n\nEl agente será notificado y podrá ver tu mensaje. Si es urgente, puedes describir el contenido del archivo en un mensaje de texto.'
            );
          } else {
            console.log('⚠️ Error obteniendo URL del medio. Continuando sin URL.');
            mediaUrl = null;
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
        const autoReply = await processIncomingMessage(messageText, from, messageType, mediaUrl, mediaId, caption);
        
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
async function processIncomingMessage(message, from, messageType, mediaUrl, mediaId, caption) {
  const lowerMessage = message.toLowerCase().trim();

  // Buscar o crear conversación
  let conversation = await Conversation.findOne({ phoneNumber: from });
  let ticket = null;
  
  // Buscar ticket existente (no cerrado)
  ticket = await Ticket.findOne({ 
    phoneNumber: from,
    estado: { $ne: 'CERRADO' }
  }).sort({ fechaCreacion: -1 });
  
  console.log(`📞 Mensaje de ${from}: "${message.substring(0, 50)}" | Tipo: ${messageType} | Ticket: ${ticket?.numeroTicket || 'Sin ticket'} | Estado conv: ${conversation?.estado}`);
  
  // Si es multimedia (imagen, audio, video, documento), guardar en notas del ticket
  if (messageType && ['image', 'audio', 'video', 'document'].includes(messageType)) {
    if (ticket) {
      const mediaEmoji = {
        'image': '📷',
        'audio': '🎵',
        'video': '🎥',
        'document': '📄'
      }[messageType] || '📎';
      
      const notaTexto = caption ? 
        `${mediaEmoji} Archivo adjunto del cliente: ${messageType}\n${caption}\nURL: ${mediaUrl || 'Procesando...'}` :
        `${mediaEmoji} Archivo adjunto del cliente: ${messageType}\nURL: ${mediaUrl || 'Procesando...'}`;
      
      // Agregar como nota al ticket con la información del archivo
      ticket.notas.push({
        texto: notaTexto,
        fecha: new Date()
      });
      
      // También agregar a archivosAdjuntos si aún no existe
      const yaExiste = ticket.archivosAdjuntos.some(a => a.mediaId === mediaId);
      if (!yaExiste && mediaUrl) {
        ticket.archivosAdjuntos.push({
          tipo: messageType,
          mediaId: mediaId,
          mediaUrl: mediaUrl,
          caption: caption || '',
          fecha: new Date()
        });
      }
      
      await ticket.save();
      
      console.log(`${mediaEmoji} Multimedia guardado en ticket ${ticket.numeroTicket}`);
      
      return `✅ ${mediaEmoji} ¡Archivo recibido!\n\n📋 Guardado en tu ticket *${ticket.numeroTicket}*\n${caption ? `\n💬 "${caption}"\n` : ''}\nEl agente podrá verlo cuando atienda tu solicitud.`;
    } else if (conversation && conversation.estado !== 'INICIO') {
      // Usuario está en proceso de crear ticket, informar que se guardará
      const mediaEmoji = {
        'image': '📷',
        'audio': '🎵',
        'video': '🎥',
        'document': '📄'
      }[messageType] || '📎';
      
      return `✅ ${mediaEmoji} ¡Archivo recibido!\n${caption ? `\n💬 "${caption}"\n` : ''}\nSe adjuntará a tu ticket cuando completemos los datos.\n\n📝 Por favor continúa respondiendo las preguntas.`;
    }
  }
  
  if (!conversation) {
    // Primera vez que escribe - crear conversación en ESPERANDO_NOMBRE
    conversation = new Conversation({
      phoneNumber: from,
      estado: 'ESPERANDO_NOMBRE'
    });
    await conversation.save();
    
    return `¡Hola! 👋 *Bienvenido al Sistema de Soporte*\n\n📝 Para poder ayudarte, necesito que me proporciones algunos datos.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*\n\n_(Ejemplo: Juan Pérez García)_`;
  }

  // Si la conversación está en INICIO o EN_COLA/ASIGNADO sin ticket activo, reiniciar flujo
  if (conversation.estado === 'INICIO' || 
     (conversation.estado === 'EN_COLA' && !ticket) ||
     (conversation.estado === 'ASIGNADO' && !ticket)) {
    // Reiniciar la conversación para nuevo ticket
    conversation.estado = 'ESPERANDO_NOMBRE';
    conversation.name = '';
    conversation.placa = '';
    conversation.cedula = '';
    await conversation.save();
    
    return `¡Hola! 👋 *Bienvenido al Sistema de Soporte*\n\n📝 Para poder ayudarte, necesito que me proporciones algunos datos.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*\n\n_(Ejemplo: Juan Pérez García)_`;
  }

  // Manejo de estados
  switch (conversation.estado) {
    case 'ESPERANDO_NOMBRE':
      // Validar que el nombre tenga al menos 3 caracteres y contenga letras
      const nombreLimpio = message.trim();
      
      if (nombreLimpio.length < 3) {
        return '❌ El nombre debe tener al menos 3 caracteres.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*:';
      }
      
      // Verificar que contenga al menos letras (no solo números)
      if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(nombreLimpio)) {
        return '❌ El nombre debe contener letras.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*:';
      }
      
      conversation.name = nombreLimpio;
      conversation.estado = 'ESPERANDO_PLACA';
      await conversation.save();
      
      return `✅ Gracias, *${nombreLimpio}*\n\n*Paso 2 de 3:* Ahora, ingresa la *PLACA* de tu vehículo\n(Formato: ABC123):`;

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
      
      return `✅ Placa registrada: *${placaLimpia}*\n\n*Paso 3 de 3:* Ahora, ingresa tu *número de CÉDULA*:`;

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
      const posicionCedula = await Conversation.countDocuments({
        estado: { $in: ['EN_COLA', 'ASIGNADO'] },
        timestampEnCola: { $lt: conversation.timestampEnCola }
      }) + 1;
      
      conversation.posicionEnCola = posicionCedula;
      await conversation.save();
      
      // Recopilar archivos multimedia enviados durante el proceso
      const archivosMultimedia = conversation.messages.filter(msg => 
        msg.direction === 'inbound' && 
        ['image', 'audio', 'video', 'document'].includes(msg.type) &&
        msg.mediaUrl
      ).map(msg => ({
        tipo: msg.type,
        mediaId: msg.mediaId,
        mediaUrl: msg.mediaUrl,
        caption: msg.caption || '',
        fecha: msg.timestamp
      }));
      
      // CREAR TICKET con prioridad MEDIA por defecto (el agente la puede cambiar)
      ticket = new Ticket({
        conversationId: conversation._id,
        phoneNumber: from,
        nombreCliente: conversation.name,
        placa: conversation.placa,
        cedula: conversation.cedula,
        descripcion: `Solicitud de atención - Cliente: ${conversation.name} - Placa: ${conversation.placa}`,
        prioridad: 'MEDIA',
        estado: 'PENDIENTE',
        archivosAdjuntos: archivosMultimedia
      });
      await ticket.save();
      
      console.log(`🎫 Ticket creado: ${ticket.numeroTicket} para ${conversation.name} (${from}) - Prioridad: MEDIA - Archivos: ${archivosMultimedia.length}`);
      
      let mensajeArchivos = '';
      if (archivosMultimedia.length > 0) {
        const tiposArchivos = archivosMultimedia.map(a => {
          const emoji = { 'image': '📷', 'audio': '🎵', 'video': '🎥', 'document': '📄' }[a.tipo];
          return emoji;
        }).join(' ');
        mensajeArchivos = `\n${tiposArchivos} Archivos adjuntos: ${archivosMultimedia.length}`;
      }
      
      return `✅ *Datos registrados correctamente:*\n\n🎫 Ticket: *${ticket.numeroTicket}*\n👤 Nombre: *${conversation.name}*\n🚗 Placa: *${conversation.placa}*\n🆔 Cédula: *${conversation.cedula}*\n⚡ Prioridad: 🟡 MEDIA${mensajeArchivos}\n\n⏳ Estás en la posición *${posicionCedula}* de la cola.\n\nUn agente te atenderá pronto. Gracias por tu paciencia.`;

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
