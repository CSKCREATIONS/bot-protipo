const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const whatsappService = require('../services/whatsappService');
const auth = require('../middleware/auth');

/**
 * Obtener todas las conversaciones
 */
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ status: 'active' })
      .sort({ lastMessageTime: -1 })
      .populate('assignedAgent', 'username email');

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener mensajes de una conversación
 */
router.get('/conversation/:phoneNumber', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const conversation = await Conversation.findOne({ phoneNumber });
    
    if (!conversation) {
      return res.json([]);
    }

    // Marcar mensajes como leídos
    await Conversation.findOneAndUpdate(
      { phoneNumber },
      { unreadCount: 0 }
    );

    // Retornar los mensajes del array (ya están ordenados por timestamp)
    res.json(conversation.messages || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Enviar mensaje
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { to, message, type = 'text', imageUrl, caption } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    let result;

    if (type === 'text') {
      result = await whatsappService.sendTextMessage(to, message);
    } else if (type === 'image') {
      result = await whatsappService.sendImageMessage(to, imageUrl, caption || message);
    }

    if (result.success) {
      // Guardar mensaje en la conversación (no en colección separada)
      const messageData = {
        from: process.env.WHATSAPP_PHONE_NUMBER_ID,
        to: to,
        message: message,
        type: type,
        direction: 'outbound',
        whatsappMessageId: result.messageId,
        status: 'sent',
        timestamp: new Date()
      };

      // Actualizar conversación con el nuevo mensaje
      const conversation = await Conversation.findOneAndUpdate(
        { phoneNumber: to },
        {
          phoneNumber: to,
          lastMessage: message,
          lastMessageTime: new Date(),
          $push: { messages: messageData }
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: 'Mensaje enviado correctamente',
        data: messageData
      });
    } else {
      // Detectar error específico de WhatsApp modo desarrollo
      let errorMessage = result.error;
      if (typeof result.error === 'object' && result.error?.error?.code === 131030) {
        errorMessage = '⚠️ WhatsApp está en modo desarrollo. Este número no está en la lista permitida. Ve a Meta Developer > WhatsApp > Configuración de API y agrega el número en "Números de teléfono de prueba".';
      } else if (typeof result.error === 'object') {
        errorMessage = result.error?.error?.message || JSON.stringify(result.error);
      }
      
      res.status(400).json({
        success: false,
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Error en ruta /messages/send:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Archivar conversación
 */
router.patch('/conversation/:phoneNumber/archive', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber },
      { status: 'archived' },
      { new: true }
    );

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Asignar agente a conversación
 */
router.patch('/conversation/:phoneNumber/assign', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { agentId } = req.body;

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber },
      { assignedAgent: agentId },
      { new: true }
    ).populate('assignedAgent', 'username email');

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
