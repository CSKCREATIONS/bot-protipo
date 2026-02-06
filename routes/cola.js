const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Ticket = require('../models/Ticket');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

/**
 * Obtener todos los usuarios en cola
 */
router.get('/', auth, async (req, res) => {
  try {
    const usuariosEnCola = await Conversation.find({
      estado: 'EN_COLA'
    })
      .sort({ timestampEnCola: 1 })
      .select('phoneNumber placa cedula estado posicionEnCola timestampEnCola');

    // Actualizar posiciones
    usuariosEnCola.forEach((usuario, index) => {
      usuario.posicionEnCola = index + 1;
    });

    res.json(usuariosEnCola);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener siguiente usuario en cola
 */
router.get('/siguiente', auth, async (req, res) => {
  try {
    const siguiente = await Conversation.findOne({
      estado: 'EN_COLA'
    })
      .sort({ timestampEnCola: 1 })
      .select('phoneNumber placa cedula estado posicionEnCola timestampEnCola');

    if (!siguiente) {
      return res.json({ message: 'No hay usuarios en cola' });
    }

    res.json(siguiente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Asignar usuario a agente (sacar de cola)
 */
router.post('/asignar/:phoneNumber', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const conversation = await Conversation.findOne({ phoneNumber });

    if (!conversation) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (conversation.estado !== 'EN_COLA') {
      return res.status(400).json({ error: 'El usuario no está en cola' });
    }

    // Buscar el ticket asociado
    const ticket = await Ticket.findOne({ phoneNumber })
      .sort({ fechaCreacion: -1 })
      .populate('lockedBy', 'username email');
    
    // VERIFICAR SI EL TICKET ESTÁ BLOQUEADO POR OTRO AGENTE
    const lockedById = ticket?.lockedBy?._id?.toString();
    if (lockedById && lockedById !== req.user._id.toString()) {
      // Verificar si el bloqueo no ha expirado (15 minutos)
      const tiempoBloqueo = Date.now() - new Date(ticket.lockedAt).getTime();
      const TIEMPO_EXPIRACION = 15 * 60 * 1000; // 15 minutos
      
      if (tiempoBloqueo < TIEMPO_EXPIRACION) {
        return res.status(423).json({ 
          error: 'Ticket bloqueado',
          message: `Este ticket está siendo atendido por ${ticket.lockedBy.username}`,
          lockedBy: ticket.lockedBy
        });
      }
    }

    // Asignar al agente actual
    conversation.estado = 'ASIGNADO';
    conversation.assignedAgent = req.user._id;
    conversation.posicionEnCola = null;
    await conversation.save();

    // Asignar y bloquear ticket
    if (ticket) {
      ticket.asignadoA = req.user._id;
      ticket.lockedBy = req.user._id;
      ticket.lockedAt = new Date();
      if (ticket.estado === 'PENDIENTE') {
        ticket.estado = 'ASIGNADO';
      }
      await ticket.save();
    }

    // Actualizar posiciones de los demás en cola
    await actualizarPosicionesEnCola();

    // ENVIAR MENSAJE AUTOMÁTICO AL CLIENTE POR WHATSAPP
    try {
      const agente = await User.findById(req.user._id);
      const mensajeAgente = `✅ *${agente.username}* ha tomado tu ticket.\n\n🎫 Ticket: *${ticket?.numeroTicket || 'N/A'}*\n\nSerás atendido en breve. Gracias por tu paciencia.`;
      
      const result = await whatsappService.sendTextMessage(phoneNumber, mensajeAgente);
      
      if (result.success) {
        // Guardar el mensaje en la conversación
        const mensajeData = {
          from: process.env.WHATSAPP_PHONE_NUMBER_ID,
          to: phoneNumber,
          message: mensajeAgente,
          type: 'text',
          direction: 'outbound',
          whatsappMessageId: result.messageId,
          status: 'sent',
          timestamp: new Date()
        };

        await Conversation.findOneAndUpdate(
          { phoneNumber },
          { $push: { messages: mensajeData } }
        );
        
        console.log(`📤 Mensaje de asignación enviado a ${phoneNumber}: ${agente.username} tomó el ticket`);
      }
    } catch (whatsappError) {
      console.error('Error enviando mensaje de WhatsApp:', whatsappError);
      // No fallar la asignación si falla el mensaje
    }

    res.json({
      message: 'Usuario asignado correctamente',
      conversation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reiniciar conversación de un usuario
 */
router.post('/reiniciar/:phoneNumber', auth, async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const conversation = await Conversation.findOne({ phoneNumber });

    if (!conversation) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Reiniciar estado
    conversation.estado = 'INICIO';
    conversation.placa = '';
    conversation.cedula = '';
    conversation.posicionEnCola = null;
    conversation.timestampEnCola = null;
    conversation.assignedAgent = null;
    await conversation.save();

    res.json({
      message: 'Conversación reiniciada',
      conversation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener estadísticas de la cola
 */
router.get('/estadisticas', auth, async (req, res) => {
  try {
    const stats = {
      enCola: await Conversation.countDocuments({ estado: 'EN_COLA' }),
      asignados: await Conversation.countDocuments({ estado: 'ASIGNADO' }),
      esperandoPlaca: await Conversation.countDocuments({ estado: 'ESPERANDO_PLACA' }),
      esperandoCedula: await Conversation.countDocuments({ estado: 'ESPERANDO_CEDULA' }),
      total: await Conversation.countDocuments(),
      tiempoPromedioEnCola: await calcularTiempoPromedioEnCola()
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Función auxiliar para actualizar posiciones en cola
 */
async function actualizarPosicionesEnCola() {
  const usuariosEnCola = await Conversation.find({
    estado: 'EN_COLA'
  }).sort({ timestampEnCola: 1 });

  for (let i = 0; i < usuariosEnCola.length; i++) {
    usuariosEnCola[i].posicionEnCola = i + 1;
    await usuariosEnCola[i].save();
  }
}

/**
 * Función auxiliar para calcular tiempo promedio en cola
 */
async function calcularTiempoPromedioEnCola() {
  const usuariosAsignados = await Conversation.find({
    estado: 'ASIGNADO',
    timestampEnCola: { $exists: true, $ne: null }
  });

  if (usuariosAsignados.length === 0) return 0;

  const tiempoTotal = usuariosAsignados.reduce((sum, usuario) => {
    const tiempoEnCola = Date.now() - new Date(usuario.timestampEnCola).getTime();
    return sum + tiempoEnCola;
  }, 0);

  // Retornar en minutos
  return Math.round(tiempoTotal / usuariosAsignados.length / 1000 / 60);
}

module.exports = router;
