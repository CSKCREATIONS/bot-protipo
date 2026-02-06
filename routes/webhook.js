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

    // Dejar la lógica pesada en una función separada para reducir la complejidad cognitiva de este handler
    await processWebhookPayload(body);
  } catch (error) {
    console.error('Error procesando webhook:', error);
  }
});

async function processWebhookPayload(body) {
  // Verificar que sea un mensaje
  if (!(body.object && body.entry)) return;

  const entry = body.entry[0];
  const changes = entry.changes[0];
  const value = changes.value;

  // Manejar mensajes entrantes
  if (value.messages && value.messages.length > 0) {
    await handleIncomingMessage(value);
  }

  // Manejar actualizaciones de estado
  if (value.statuses && value.statuses.length > 0) {
    await handleStatusUpdate(value.statuses[0]);
  }
}

async function handleIncomingMessage(value) {
  const message = value.messages[0];
  const from = message.from;
  const messageId = message.id;

  // 1) Protección contra edición: si el mensaje referencia otro existente, registrar y notificar
  if (message.context?.id) {
    const referencedMessageId = message.context.id;
    const referencedMessage = await Conversation.findOne({
      'messages.whatsappMessageId': referencedMessageId
    });

    if (referencedMessage) {
      console.log(`🚫 Intento de edición detectado. Mensaje original: ${referencedMessageId}`);

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

      await whatsappService.sendTextMessage(
        message.from,
        '⚠️ *Edición no permitida*\n\nPor políticas de seguridad y trazabilidad, no podemos procesar mensajes editados.\n\nSi necesitas corregir información, envía un nuevo mensaje con los datos correctos.'
      );

      console.log(`📝 Usuario ${message.from} intentó editar mensaje: "${message.text?.body?.substring(0, 50) || 'multimedia'}"`);
      return;
    }
  }

  // 2) Duplicados
  const existingMessage = await Conversation.findOne({
    'messages.whatsappMessageId': messageId
  });

  if (existingMessage) {
    console.log(`🚫 Mensaje duplicado/editado detectado (ID: ${messageId}). Ignorando.`);
    return;
  }

  // 3) Extraer detalles del mensaje (tipo, texto, media, caption)
  const {
    messageType,
    messageText,
    mediaId,
    caption
  } = extractMessageDetails(message);

  // 4) Obtener mediaUrl si aplica
  let mediaUrl = null;
  if (mediaId) {
    mediaUrl = await fetchMediaUrl(mediaId, from);
  }

  // 5) Guardar mensaje en conversación
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

  // 6) Marcar como leído
  await whatsappService.markAsRead(messageId);

  // 7) Procesar lógica de negocio y responder si es necesario
  const autoReply = await processIncomingMessage(messageText, from, messageType, mediaUrl, mediaId, caption);

  if (autoReply) {
    const result = await whatsappService.sendTextMessage(from, autoReply);

    if (result.success) {
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

function extractMessageDetails(message) {
  const messageType = message.type;

  let messageText = '';
  let mediaId = null;
  let caption = null;

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

  return { messageType, messageText, mediaId, caption };
}

async function fetchMediaUrl(mediaId, from) {
  try {
    const mediaResult = await whatsappService.getMediaUrl(mediaId);
    if (mediaResult.success) {
      return mediaResult.url;
    } else if (mediaResult.tokenBlocked) {
      console.log('⚠️ No se puede obtener URL del medio (token bloqueado). Guardando sin URL.');
      await whatsappService.sendTextMessage(
        from,
        '⚠️ *Archivo recibido con advertencia*\n\nHemos registrado tu archivo, pero hay un problema temporal con nuestro sistema.\n\nEl agente será notificado y podrá ver tu mensaje. Si es urgente, puedes describir el contenido del archivo en un mensaje de texto.'
      );
      return null;
    } else {
      console.log('⚠️ Error obteniendo URL del medio. Continuando sin URL.');
      return null;
    }
  } catch (err) {
    console.error('Error obteniendo media URL:', err);
    return null;
  }
}

async function handleStatusUpdate(status) {
  const messageId = status.id;
  const newStatus = status.status; // sent, delivered, read

  await Conversation.updateOne(
    { 'messages.whatsappMessageId': messageId },
    { $set: { 'messages.$.status': newStatus } }
  );
}

/**
 * Función para procesar mensajes entrantes según el estado del usuario
 */
async function processIncomingMessage(message, from, messageType, mediaUrl, mediaId, caption) {

  // Buscar o crear conversación
  let conversation = await Conversation.findOne({ phoneNumber: from });
  let ticket = null;

  // Buscar ticket existente (no cerrado)
  ticket = await Ticket.findOne({
    phoneNumber: from,
    estado: { $ne: 'CERRADO' }
  }).sort({ fechaCreacion: -1 });

  console.log(`📞 Mensaje de ${from}: "${message.substring(0, 50)}" | Tipo: ${messageType} | Ticket: ${ticket?.numeroTicket || 'Sin ticket'} | Estado conv: ${conversation?.estado}`);

  // Si es multimedia (imagen, audio, video, documento), delegado a helper
  if (messageType && ['image', 'audio', 'video', 'document'].includes(messageType)) {
    const mediaReply = await handleMediaMessage({ messageType, ticket, conversation, caption, mediaUrl, mediaId, from });
    if (mediaReply) return mediaReply;
  }

  // Si no existe conversación, crear y pedir nombre
  if (!conversation) {
    return await createConversationAndAskName(from);
  }

  // Reiniciar flujo si corresponde
  if (conversation.estado === 'INICIO' ||
    (conversation.estado === 'EN_COLA' && !ticket) ||
    (conversation.estado === 'ASIGNADO' && !ticket)) {
    return await restartConversationForNewTicket(conversation);
  }

  // Delegar manejo por estado a helpers para reducir complejidad
  switch (conversation.estado) {
    case 'ESPERANDO_NOMBRE':
      return await handleEsperandoNombre(message, conversation);

    case 'ESPERANDO_PLACA':
      return await handleEsperandoPlaca(message, conversation);

    case 'ESPERANDO_CEDULA':
      return await handleEsperandoCedula(message, conversation, from);

    case 'EN_COLA':
      return await handleEnCola(conversation, ticket);

    case 'ASIGNADO':
      return await handleAsignado(conversation, ticket);

    case 'INICIO':
    default:
      return await handleInicioDefault(conversation);
  }
}

// Helper: manejo de multimedia
async function handleMediaMessage({ messageType, ticket, conversation, caption, mediaUrl, mediaId, from }) {
  if (ticket) {
    const mediaEmoji = { 'image': '📷', 'audio': '🎵', 'video': '🎥', 'document': '📄' }[messageType] || '📎';

    const notaTexto = caption ?
      `${mediaEmoji} Archivo adjunto del cliente: ${messageType}\n${caption}\nURL: ${mediaUrl || 'Procesando...'}` :
      `${mediaEmoji} Archivo adjunto del cliente: ${messageType}\nURL: ${mediaUrl || 'Procesando...'}`;

    ticket.notas.push({ texto: notaTexto, fecha: new Date() });

    const yaExiste = ticket.archivosAdjuntos.some(a => a.mediaId === mediaId);
    if (!yaExiste && mediaUrl) {
      ticket.archivosAdjuntos.push({
        tipo: messageType,
        mediaId,
        mediaUrl,
        caption: caption || '',
        fecha: new Date()
      });
    }

    await ticket.save();
    console.log(`${mediaEmoji} Multimedia guardado en ticket ${ticket.numeroTicket}`);

    const captionPart = caption ? '\n💬 "' + caption + '"\n' : '';
    return `✅ ${mediaEmoji} ¡Archivo recibido!\n\n📋 Guardado en tu ticket *${ticket.numeroTicket}*\n${captionPart}\nEl agente podrá verlo cuando atienda tu solicitud.`;
  }

  if (conversation && conversation.estado !== 'INICIO') {
    const mediaEmoji = { 'image': '📷', 'audio': '🎵', 'video': '🎥', 'document': '📄' }[messageType] || '📎';
    const captionPart = caption ? '\n💬 "' + caption + '"\n' : '';
    return `✅ ${mediaEmoji} ¡Archivo recibido!` + '\n' + captionPart + '\nSe adjuntará a tu ticket cuando completemos los datos.\n\n📝 Por favor continúa respondiendo las preguntas.';
  }

  return null;
}

// Helper: crear conversación y pedir nombre
async function createConversationAndAskName(from) {
  const conversation = new Conversation({
    phoneNumber: from,
    estado: 'ESPERANDO_NOMBRE'
  });
  await conversation.save();

  return `¡Hola! 👋 *Bienvenido al Sistema de Soporte*\n\n📝 Para poder ayudarte, necesito que me proporciones algunos datos.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*\n\n_(Ejemplo: Juan Pérez García)_`;
}

// Helper: reiniciar conversación para nuevo ticket
async function restartConversationForNewTicket(conversation) {
  conversation.estado = 'ESPERANDO_NOMBRE';
  conversation.name = '';
  conversation.placa = '';
  conversation.cedula = '';
  await conversation.save();

  return `¡Hola! 👋 *Bienvenido al Sistema de Soporte*\n\n📝 Para poder ayudarte, necesito que me proporciones algunos datos.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*\n\n_(Ejemplo: Juan Pérez García)_`;
}

// Estado: ESPERANDO_NOMBRE
async function handleEsperandoNombre(message, conversation) {
  const nombreLimpio = message.trim();

  if (nombreLimpio.length < 3) {
    return '❌ El nombre debe tener al menos 3 caracteres.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*:';
  }

  if (!/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(nombreLimpio)) {
    return '❌ El nombre debe contener letras.\n\n*Paso 1 de 3:* Por favor, escribe tu *NOMBRE COMPLETO*:';
  }

  conversation.name = nombreLimpio;
  conversation.estado = 'ESPERANDO_PLACA';
  await conversation.save();

  return `✅ Gracias, *${nombreLimpio}*\n\n*Paso 2 de 3:* Ahora, ingresa la *PLACA* de tu vehículo\n(Formato: ABC123):`;
}

// Estado: ESPERANDO_PLACA
async function handleEsperandoPlaca(message, conversation) {
  const placaLimpia = message.trim().toUpperCase().replaceAll(/[^A-Z\d]/g, '');
  const formatoPlacaColombia = /^[A-Z]{3}\d{3}$/;

  if (!formatoPlacaColombia.test(placaLimpia)) {
    return '❌ La placa no es válida.\n\nEl formato debe ser: *3 letras + 3 números*\nEjemplo: ABC123\n\nPor favor, ingresa tu placa correctamente:';
  }

  conversation.placa = placaLimpia;
  conversation.estado = 'ESPERANDO_CEDULA';
  await conversation.save();

  return `✅ Placa registrada: *${placaLimpia}*\n\n*Paso 3 de 3:* Ahora, ingresa tu *número de CÉDULA*:`;
}

// Estado: ESPERANDO_CEDULA
async function handleEsperandoCedula(message, conversation, from) {
  const cedulaLimpia = message.trim().replaceAll(/\D/g, '');

  if (cedulaLimpia.length < 6 || cedulaLimpia.length > 10) {
    return '❌ La cédula ingresada no es válida.\n\nDebe tener entre 6 y 10 dígitos.\n\nPor favor, ingresa tu cédula correctamente:';
  }

  conversation.cedula = cedulaLimpia;
  conversation.estado = 'EN_COLA';
  conversation.timestampEnCola = new Date();

  const posicionCedula = await Conversation.countDocuments({
    estado: { $in: ['EN_COLA', 'ASIGNADO'] },
    timestampEnCola: { $lt: conversation.timestampEnCola }
  }) + 1;

  conversation.posicionEnCola = posicionCedula;
  await conversation.save();

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

  const ticket = new Ticket({
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
}

// Estado: EN_COLA
async function handleEnCola(conversation, ticket) {
  const posicionActual = await Conversation.countDocuments({
    estado: { $in: ['EN_COLA', 'ASIGNADO'] },
    timestampEnCola: { $lt: conversation.timestampEnCola }
  }) + 1;

  conversation.posicionEnCola = posicionActual;
  await conversation.save();

  return `⏳ Sigues en cola.\n\n🎫 Ticket: *${ticket?.numeroTicket || 'N/A'}*\nPosición actual: *${posicionActual}*\n\nUn agente te atenderá pronto. Por favor espera.`;
}

// Estado: ASIGNADO
async function handleAsignado(conversation, ticket) {
  const agente = conversation.assignedAgent;
  if (agente) {
    const User = require('../models/User');
    const agenteInfo = await User.findById(agente);
    return `✅ Ya fuiste asignado a un agente.\n\n🎫 Ticket: *${ticket?.numeroTicket || 'N/A'}*\n👤 Agente: *${agenteInfo?.username || 'Agente'}*\n\nTe responderemos en breve.`;
  } else {
    return `✅ Estás siendo atendido.\n\n🎫 Ticket: *${ticket?.numeroTicket || 'N/A'}*\n\nUn agente revisará tu solicitud.`;
  }
}

// Estado: INICIO o por defecto
async function handleInicioDefault(conversation) {
  conversation.estado = 'ESPERANDO_PLACA';
  await conversation.save();
  return `¡Hola! 👋 ¡Bienvenido!\n\n📝 Para poder ayudarte, necesito que me proporciones algunos datos.\n\nPor favor, ingresa la *PLACA* de tu vehículo\n(Formato: ABC123):`;
}

module.exports = router;
