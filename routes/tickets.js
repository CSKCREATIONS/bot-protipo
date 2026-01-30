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

    // PREVENIR ASIGNACIÓN DE TICKETS CERRADOS
    if (ticket.estado === 'CERRADO') {
      return res.status(400).json({ 
        error: 'No se puede asignar un ticket cerrado',
        message: 'Este ticket ya fue cerrado y no puede ser reasignado'
      });
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

    // Verificar que el ticket no esté ya cerrado
    if (ticket.estado === 'CERRADO') {
      return res.status(400).json({ error: 'El ticket ya está cerrado' });
    }

    ticket.estado = 'CERRADO';
    ticket.fechaCierre = new Date();
    ticket.cerradoPor = req.user._id;
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
      .populate('cerradoPor', 'username')
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
    const ticketsCerrados = tickets.filter(t => t.fechaCierre && t.tiempoResolucion);
    let tiempoPromedioResolucion = 0;
    if (ticketsCerrados.length > 0) {
      const tiempoTotal = ticketsCerrados.reduce((sum, ticket) => {
        return sum + (ticket.tiempoResolucion || 0);
      }, 0);
      tiempoPromedioResolucion = Math.round(tiempoTotal / ticketsCerrados.length);
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

/**
 * Estadísticas por agente (tiempo promedio de resolución)
 */
router.get('/stats/agentes', auth, async (req, res) => {
  try {
    const agentes = await User.find({ role: 'agente' }).select('username email');
    
    const estadisticasAgentes = await Promise.all(
      agentes.map(async (agente) => {
        // Tickets asignados al agente
        const ticketsAsignados = await Ticket.find({ asignadoA: agente._id });
        
        // Tickets cerrados por el agente
        const ticketsCerrados = ticketsAsignados.filter(t => 
          t.estado === 'CERRADO' && t.tiempoResolucion
        );
        
        // Calcular tiempo promedio
        let tiempoPromedio = 0;
        if (ticketsCerrados.length > 0) {
          const sumaTiempos = ticketsCerrados.reduce((sum, t) => sum + t.tiempoResolucion, 0);
          tiempoPromedio = Math.round(sumaTiempos / ticketsCerrados.length);
        }
        
        // Formatear tiempo promedio
        const horas = Math.floor(tiempoPromedio / 60);
        const minutos = tiempoPromedio % 60;
        const tiempoFormateado = horas > 0 
          ? `${horas}h ${minutos}min` 
          : `${minutos}min`;
        
        return {
          agente: {
            id: agente._id,
            nombre: agente.username,
            email: agente.email
          },
          totalAsignados: ticketsAsignados.length,
          ticketsPendientes: ticketsAsignados.filter(t => t.estado === 'PENDIENTE').length,
          ticketsEnProceso: ticketsAsignados.filter(t => t.estado === 'ASIGNADO').length,
          ticketsCerrados: ticketsCerrados.length,
          tiempoPromedioMinutos: tiempoPromedio,
          tiempoPromedioFormateado: tiempoFormateado,
          tasaCierre: ticketsAsignados.length > 0 
            ? Math.round((ticketsCerrados.length / ticketsAsignados.length) * 100) 
            : 0
        };
      })
    );
    
    // Ordenar por mejor desempeño (más tickets cerrados y menor tiempo)
    estadisticasAgentes.sort((a, b) => {
      if (b.ticketsCerrados !== a.ticketsCerrados) {
        return b.ticketsCerrados - a.ticketsCerrados;
      }
      return a.tiempoPromedioMinutos - b.tiempoPromedioMinutos;
    });
    
    res.json({
      agentes: estadisticasAgentes,
      resumen: {
        totalAgentes: agentes.length,
        promedioGlobal: Math.round(
          estadisticasAgentes.reduce((sum, a) => sum + a.tiempoPromedioMinutos, 0) / 
          (estadisticasAgentes.length || 1)
        )
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Exportar tickets a CSV mejorado con estadísticas completas
 */
router.get('/exportar/csv', auth, async (req, res) => {
  try {
    const { fechaInicio, fechaFin, estado, prioridad } = req.query;
    
    const filtro = {};
    if (fechaInicio || fechaFin) {
      filtro.fechaCreacion = {};
      if (fechaInicio) filtro.fechaCreacion.$gte = new Date(fechaInicio);
      if (fechaFin) filtro.fechaCreacion.$lte = new Date(fechaFin);
    }
    if (estado) filtro.estado = estado;
    if (prioridad) filtro.prioridad = prioridad;

    const tickets = await Ticket.find(filtro)
      .populate('asignadoA', 'username')
      .populate('cerradoPor', 'username')
      .populate('conversationId', 'phoneNumber')
      .sort({ fechaCreacion: -1 });

    // Crear CSV mejorado con más información
    const csv = [
      // Encabezados
      [
        'Número Ticket',
        'Fecha Creación',
        'Cliente',
        'Teléfono',
        'Placa',
        'Cédula',
        'Ticket # del Cliente',
        'Descripción',
        'Estado',
        'Prioridad',
        'Agente Asignado',
        'Fecha Cierre',
        'Tiempo Resolución',
        'Tiempo (minutos)',
        'Cerrado Por',
        'Total Notas'
      ].join(','),
      // Datos
      ...tickets.map(ticket => {
        // Formatear tiempo de resolución
        let tiempoFormateado = 'N/A';
        if (ticket.tiempoResolucion) {
          const horas = Math.floor(ticket.tiempoResolucion / 60);
          const minutos = ticket.tiempoResolucion % 60;
          tiempoFormateado = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;
        }
        
        return [
          ticket.numeroTicket || '',
          ticket.fechaCreacion ? new Date(ticket.fechaCreacion).toLocaleString('es-ES') : '',
          `"${(ticket.nombreCliente || '').replace(/"/g, '""')}"`,
          ticket.phoneNumber || '',
          ticket.placa || '',
          ticket.cedula || '',
          ticket.contadorTickets || '1',
          `"${(ticket.descripcion || '').replace(/"/g, '""')}"`,
          ticket.estado || '',
          ticket.prioridad || '',
          ticket.asignadoA?.username || 'Sin asignar',
          ticket.fechaCierre ? new Date(ticket.fechaCierre).toLocaleString('es-ES') : '',
          tiempoFormateado,
          ticket.tiempoResolucion || '',
          ticket.cerradoPor?.username || '',
          ticket.notas?.length || '0'
        ].join(',');
      })
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=tickets_export_${Date.now()}.csv`);
    res.send('\uFEFF' + csv); // BOM para Excel
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint proxy para descargar archivos multimedia de WhatsApp
 * Este endpoint descarga el archivo con autenticación y lo sirve al frontend
 * Permite token en query string para uso en tags <img>, <audio>, <video>
 */
router.get('/media/download', async (req, res) => {
  try {
    const { url, mediaId, token } = req.query;
    
    if (!url && !mediaId) {
      console.error('❌ URL o mediaId no proporcionados');
      return res.status(400).json({ error: 'URL o mediaId del archivo requeridos' });
    }

    // Verificar autenticación (token en header o query)
    let authToken = token;
    if (!authToken && req.headers.authorization) {
      authToken = req.headers.authorization.replace('Bearer ', '');
    }

    if (!authToken) {
      console.error('❌ Token no proporcionado');
      return res.status(401).json({ error: 'No hay token, autorización denegada' });
    }

    let mediaUrlToDownload = url;

    // Si se proporciona mediaId, obtener URL fresca de WhatsApp
    if (mediaId) {
      console.log('📥 Obteniendo URL fresca del mediaId:', mediaId);
      const mediaResult = await whatsappService.getMediaUrl(mediaId);
      if (mediaResult.success) {
        mediaUrlToDownload = mediaResult.url;
        console.log('✅ URL fresca obtenida');
      } else {
        console.error('❌ Error obteniendo URL del mediaId:', mediaResult.error);
        return res.status(500).json({ error: 'Error obteniendo URL del archivo' });
      }
    }

    console.log('📥 Descargando archivo multimedia...');

    // Descargar archivo usando el servicio de WhatsApp con autenticación
    const result = await whatsappService.downloadMedia(mediaUrlToDownload);

    if (!result.success) {
      console.error('❌ Error descargando archivo:', result.error);
      // Devolver SVG de error
      const errorSvg = `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="300" fill="#1a1a1a"/>
          <text x="200" y="130" text-anchor="middle" fill="#ff5555" font-size="48">✕</text>
          <text x="200" y="180" text-anchor="middle" fill="#fff" font-size="16">Error cargando archivo</text>
          <text x="200" y="210" text-anchor="middle" fill="#888" font-size="12">El archivo no está disponible</text>
        </svg>
      `;
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(errorSvg);
    }

    // Establecer headers apropiados
    res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Enviar el archivo
    res.send(Buffer.from(result.data));
    
    console.log('✅ Archivo enviado correctamente');
  } catch (error) {
    console.error('❌ Error en endpoint de descarga:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
