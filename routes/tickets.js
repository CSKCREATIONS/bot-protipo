const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

/**
 * Obtener todos los tickets
 */
router.get('/', auth, async (req, res) => {
  try {
    const { estado, prioridad, asignadoA, phoneNumber, limit = 50, skip = 0 } = req.query;
    
    const filtro = {};
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (asignadoA) filtro.asignadoA = asignadoA;
    if (phoneNumber) filtro.phoneNumber = phoneNumber;

    const tickets = await Ticket.find(filtro)
      .sort({ fechaCreacion: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('conversationId', 'phoneNumber name')
      .populate('asignadoA', 'username email');

    const total = await Ticket.countDocuments(filtro);

    res.json({
      tickets,
      total,
      pagina: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener ticket por ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('conversationId')
      .populate('asignadoA', 'username email')
      .populate('notas.usuario', 'username');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Crear ticket manualmente
 */
router.post('/', auth, async (req, res) => {
  try {
    const { phoneNumber, placa, cedula, descripcion, prioridad } = req.body;

    // Buscar o crear conversación
    let conversation = await Conversation.findOne({ phoneNumber });
    if (!conversation) {
      conversation = new Conversation({ phoneNumber, placa, cedula });
      await conversation.save();
    }

    const ticket = new Ticket({
      conversationId: conversation._id,
      phoneNumber,
      placa: placa || conversation.placa,
      cedula: cedula || conversation.cedula,
      descripcion: descripcion || 'Solicitud de atención',
      prioridad: prioridad || 'MEDIA',
      asignadoA: req.user._id
    });

    await ticket.save();

    res.status(201).json({
      message: 'Ticket creado exitosamente',
      ticket: await ticket.populate('asignadoA', 'username email')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualizar ticket
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const { estado, prioridad, descripcion, asignadoA } = req.body;
    
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Validar que solo el agente asignado o admin pueda cerrar el ticket
    if (estado === 'CERRADO') {
      const esAdmin = req.user.role === 'admin';
      const esAgenteAsignado = ticket.asignadoA && ticket.asignadoA.toString() === req.user.userId;
      
      if (!esAdmin && !esAgenteAsignado) {
        return res.status(403).json({ 
          error: 'Solo el agente asignado a este ticket puede cerrarlo' 
        });
      }
      
      // Guardar fecha de cierre
      if (!ticket.fechaCierre) {
        ticket.fechaCierre = new Date();
      }
    }

    if (estado) ticket.estado = estado;
    if (prioridad) ticket.prioridad = prioridad;
    if (descripcion) ticket.descripcion = descripcion;
    if (asignadoA) ticket.asignadoA = asignadoA;

    await ticket.save();

    res.json({
      message: 'Ticket actualizado',
      ticket: await ticket.populate('asignadoA', 'username email')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Asignar ticket a un agente
 */
router.post('/:id/asignar', auth, async (req, res) => {
  try {
    const { agenteId } = req.body;
    
    const ticket = await Ticket.findById(req.params.id)
      .populate('lockedBy', 'username email');
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // VERIFICAR SI EL TICKET ESTÁ BLOQUEADO POR OTRO AGENTE
    if (ticket.lockedBy && ticket.lockedBy._id.toString() !== req.user._id.toString()) {
      // Verificar si el bloqueo no ha expirado (15 minutos)
      const tiempoBloqueo = new Date() - new Date(ticket.lockedAt);
      const TIEMPO_EXPIRACION = 15 * 60 * 1000; // 15 minutos
      
      if (tiempoBloqueo < TIEMPO_EXPIRACION) {
        return res.status(423).json({ 
          error: 'Ticket bloqueado',
          message: `Este ticket está siendo atendido por ${ticket.lockedBy.username}`,
          lockedBy: ticket.lockedBy
        });
      }
    }

    // Asignar agente (usar el que lo solicita o el especificado)
    const agenteAsignado = agenteId || req.user._id;
    ticket.asignadoA = agenteAsignado;
    ticket.lockedBy = agenteAsignado;
    ticket.lockedAt = new Date();
    
    // Cambiar estado a ASIGNADO
    if (ticket.estado === 'PENDIENTE') {
      ticket.estado = 'ASIGNADO';
    }

    await ticket.save();

    // Obtener información del agente
    const agente = await User.findById(agenteAsignado);
    
    // Actualizar conversación con el agente asignado
    await Conversation.findOneAndUpdate(
      { phoneNumber: ticket.phoneNumber },
      { 
        assignedAgent: agenteAsignado,
        estado: 'ASIGNADO'
      }
    );

    // ENVIAR MENSAJE AUTOMÁTICO AL CLIENTE POR WHATSAPP
    try {
      const mensajeAgente = `✅ *${agente.username}* ha tomado tu ticket.\n\n🎫 Ticket: *${ticket.numeroTicket}*\n\nSerás atendido en breve. Gracias por tu paciencia.`;
      
      const result = await whatsappService.sendTextMessage(ticket.phoneNumber, mensajeAgente);
      
      if (result.success) {
        // Guardar el mensaje en la conversación
        const mensajeData = {
          from: process.env.WHATSAPP_PHONE_NUMBER_ID,
          to: ticket.phoneNumber,
          message: mensajeAgente,
          type: 'text',
          direction: 'outbound',
          whatsappMessageId: result.messageId,
          status: 'sent',
          timestamp: new Date()
        };

        await Conversation.findOneAndUpdate(
          { phoneNumber: ticket.phoneNumber },
          { $push: { messages: mensajeData } }
        );
        
        console.log(`📤 Mensaje de asignación enviado a ${ticket.phoneNumber}: ${agente.username} tomó el ticket ${ticket.numeroTicket}`);
      }
    } catch (whatsappError) {
      console.error('Error enviando mensaje de WhatsApp:', whatsappError);
      // No fallar la asignación si falla el mensaje
    }

    res.json({
      message: 'Ticket asignado correctamente',
      ticket: await ticket.populate('asignadoA', 'username email')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Agregar nota al ticket
 */
router.post('/:id/notas', auth, async (req, res) => {
  try {
    const { texto } = req.body;
    
    if (!texto) {
      return res.status(400).json({ error: 'El texto de la nota es requerido' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.notas.push({
      texto,
      usuario: req.user._id
    });

    await ticket.save();

    res.json({
      message: 'Nota agregada',
      ticket: await ticket.populate('notas.usuario', 'username')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cerrar ticket
 */
router.post('/:id/cerrar', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    ticket.estado = 'CERRADO';
    ticket.fechaCierre = new Date();
    ticket.lockedBy = null;
    ticket.lockedAt = null;
    await ticket.save();

    res.json({
      message: 'Ticket cerrado',
      ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Liberar bloqueo de ticket
 */
router.post('/:id/liberar', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Solo el agente que lo bloqueó o un admin puede liberarlo
    if (ticket.lockedBy && 
        ticket.lockedBy.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para liberar este ticket' });
    }

    ticket.lockedBy = null;
    ticket.lockedAt = null;
    await ticket.save();

    res.json({
      message: 'Ticket liberado',
      ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verificar estado de bloqueo de un ticket
 */
router.get('/:id/bloqueo', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('lockedBy', 'username email');
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const isLocked = ticket.lockedBy !== null;
    const isLockedByCurrentUser = ticket.lockedBy && 
                                   ticket.lockedBy._id.toString() === req.user._id.toString();
    
    let tiempoRestante = null;
    if (isLocked && ticket.lockedAt) {
      const tiempoBloqueo = new Date() - new Date(ticket.lockedAt);
      const TIEMPO_EXPIRACION = 15 * 60 * 1000; // 15 minutos
      tiempoRestante = Math.max(0, TIEMPO_EXPIRACION - tiempoBloqueo);
    }

    res.json({
      isLocked,
      isLockedByCurrentUser,
      lockedBy: ticket.lockedBy,
      lockedAt: ticket.lockedAt,
      tiempoRestante
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Estadísticas de tickets
 */
router.get('/stats/resumen', auth, async (req, res) => {
  try {
    const stats = {
      total: await Ticket.countDocuments(),
      pendientes: await Ticket.countDocuments({ estado: 'PENDIENTE' }),
      asignados: await Ticket.countDocuments({ estado: 'ASIGNADO' }),
      cerrados: await Ticket.countDocuments({ estado: 'CERRADO' }),
      porPrioridad: {
        baja: await Ticket.countDocuments({ prioridad: 'BAJA', estado: { $ne: 'CERRADO' } }),
        media: await Ticket.countDocuments({ prioridad: 'MEDIA', estado: { $ne: 'CERRADO' } }),
        alta: await Ticket.countDocuments({ prioridad: 'ALTA', estado: { $ne: 'CERRADO' } }),
        urgente: await Ticket.countDocuments({ prioridad: 'URGENTE', estado: { $ne: 'CERRADO' } })
      },
      misTickets: await Ticket.countDocuments({ 
        asignadoA: req.user._id, 
        estado: { $in: ['PENDIENTE', 'ASIGNADO'] } 
      })
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener reportes con filtros avanzados
 */
router.get('/stats/reportes', auth, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, prioridad, asignadoA } = req.query;
    
    // Construir filtro
    const filtro = {};
    if (fechaInicio || fechaFin) {
      filtro.fechaCreacion = {};
      if (fechaInicio) filtro.fechaCreacion.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaCreacion.$lte = new Date(fechaFin);
    }
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;
    if (asignadoA) filtro.asignadoA = asignadoA;

    // Obtener tickets filtrados
    const tickets = await Ticket.find(filtro)
      .populate('asignadoA', 'username email')
      .populate('conversationId', 'phoneNumber placa cedula')
      .sort({ fechaCreacion: -1 });

    // Calcular estadísticas del reporte
    const totalTickets = tickets.length;
    const ticketsPorEstado = {
      PENDIENTE: tickets.filter(t => t.estado === 'PENDIENTE').length,
      ASIGNADO: tickets.filter(t => t.estado === 'ASIGNADO').length,
      CERRADO: tickets.filter(t => t.estado === 'CERRADO').length
    };
    const ticketsPorPrioridad = {
      BAJA: tickets.filter(t => t.prioridad === 'BAJA').length,
      MEDIA: tickets.filter(t => t.prioridad === 'MEDIA').length,
      ALTA: tickets.filter(t => t.prioridad === 'ALTA').length,
      URGENTE: tickets.filter(t => t.prioridad === 'URGENTE').length
    };

    // Calcular tiempo promedio de resolución (solo tickets cerrados)
    const ticketsCerrados = tickets.filter(t => t.fechaCierre);
    let tiempoPromedioResolucion = 0;
    if (ticketsCerrados.length > 0) {
      const tiempoTotal = ticketsCerrados.reduce((sum, ticket) => {
        const tiempo = new Date(ticket.fechaCierre) - new Date(ticket.fechaCreacion);
        return sum + tiempo;
      }, 0);
      tiempoPromedioResolucion = Math.round(tiempoTotal / ticketsCerrados.length / 1000 / 60); // en minutos
    }

    // Tickets por agente
    const ticketsPorAgente = {};
    tickets.forEach(ticket => {
      if (ticket.asignadoA) {
        const agenteNombre = ticket.asignadoA.username;
        if (!ticketsPorAgente[agenteNombre]) {
          ticketsPorAgente[agenteNombre] = {
            total: 0,
            pendientes: 0,
            asignados: 0,
            cerrados: 0
          };
        }
        ticketsPorAgente[agenteNombre].total++;
        ticketsPorAgente[agenteNombre][ticket.estado.toLowerCase() + 's'] = 
          (ticketsPorAgente[agenteNombre][ticket.estado.toLowerCase() + 's'] || 0) + 1;
      }
    });

    res.json({
      tickets,
      estadisticas: {
        totalTickets,
        ticketsPorEstado,
        ticketsPorPrioridad,
        tiempoPromedioResolucion,
        ticketsPorAgente
      },
      filtros: { fechaInicio, fechaFin, estado, prioridad, asignadoA }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
