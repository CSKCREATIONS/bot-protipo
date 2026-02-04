const express = require('express');
const router = express.Router();
const { Ticket, Conversation, Message, User } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');

/**
 * Estadísticas de tickets (DEBE IR PRIMERO)
 */
router.get('/stats/resumen', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const stats = {
      total: await Ticket.count(),
      pendientes: await Ticket.count({ where: { estado: 'PENDIENTE' } }),
      asignados: await Ticket.count({ where: { estado: 'ASIGNADO' } }),
      cerrados: await Ticket.count({ where: { estado: 'CERRADO' } }),
      porPrioridad: {
        baja: await Ticket.count({ 
          where: { prioridad: 'BAJA', estado: { [Op.ne]: 'CERRADO' } }
        }),
        media: await Ticket.count({ 
          where: { prioridad: 'MEDIA', estado: { [Op.ne]: 'CERRADO' } }
        }),
        alta: await Ticket.count({ 
          where: { prioridad: 'ALTA', estado: { [Op.ne]: 'CERRADO' } }
        }),
        urgente: await Ticket.count({ 
          where: { prioridad: 'URGENTE', estado: { [Op.ne]: 'CERRADO' } }
        })
      },
      misTickets: await Ticket.count({ 
        where: { 
          asignadoA: req.user.id, 
          estado: { [Op.in]: ['PENDIENTE', 'ASIGNADO'] } 
        }
      })
    };

    res.json(stats);
  } catch (error) {
    console.error('Error en stats/resumen:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Estadísticas por agente
 */
router.get('/stats/agentes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const agentes = await User.findAll({ 
      where: { role: 'agent' },
      attributes: ['id', 'username', 'email']
    });
    
    const estadisticasAgentes = await Promise.all(
      agentes.map(async (agente) => {
        const ticketsAsignados = await Ticket.findAll({ 
          where: { asignadoA: agente.id }
        });
        
        const ticketsCerrados = ticketsAsignados.filter(t => 
          t.estado === 'CERRADO' && t.tiempoResolucion
        );
        
        let tiempoPromedio = 0;
        if (ticketsCerrados.length > 0) {
          const sumaTiempos = ticketsCerrados.reduce((sum, t) => sum + t.tiempoResolucion, 0);
          tiempoPromedio = Math.round(sumaTiempos / ticketsCerrados.length);
        }
        
        const horas = Math.floor(tiempoPromedio / 60);
        const minutos = tiempoPromedio % 60;
        const tiempoFormateado = horas > 0 
          ? `${horas}h ${minutos}min` 
          : `${minutos}min`;
        
        return {
          agente: {
            id: agente.id,
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
    console.error('Error en stats/agentes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener todos los tickets
 */
router.get('/', auth, async (req, res) => {
  try {
    const { estado, prioridad, asignadoA, phoneNumber, limit = 50, skip = 0 } = req.query;
    
    const where = {};
    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (asignadoA) where.asignadoA = asignadoA;
    if (phoneNumber) where.phoneNumber = phoneNumber;

    const tickets = await Ticket.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(skip),
      include: [
        {
          model: Conversation,
          attributes: ['phoneNumber', 'name']
        },
        {
          model: User,
          as: 'agente',
          attributes: ['username', 'email']
        }
      ]
    });

    const total = await Ticket.count({ where });

    res.json({
      tickets,
      total,
      pagina: Math.floor(parseInt(skip) / parseInt(limit)) + 1,
      totalPaginas: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error obteniendo tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener ticket por ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: Conversation },
        { model: User, as: 'agente', attributes: ['username', 'email'] }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error obteniendo ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualizar ticket
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const { estado, prioridad, descripcion, asignadoA } = req.body;
    
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (estado === 'CERRADO') {
      const esAdmin = req.user.role === 'admin';
      const esAgenteAsignado = ticket.asignadoA && ticket.asignadoA === req.user.id;
      
      if (!esAdmin && !esAgenteAsignado) {
        return res.status(403).json({ 
          error: 'Solo el agente asignado a este ticket puede cerrarlo' 
        });
      }
      
      if (!ticket.fechaCierre) {
        ticket.fechaCierre = new Date();
      }
    }

    if (estado) ticket.estado = estado;
    if (prioridad) ticket.prioridad = prioridad;
    if (descripcion) ticket.descripcion = descripcion;
    if (asignadoA) ticket.asignadoA = asignadoA;

    await ticket.save();

    const ticketActualizado = await Ticket.findByPk(ticket.id, {
      include: [{ model: User, as: 'agente', attributes: ['username', 'email'] }]
    });

    res.json({
      message: 'Ticket actualizado',
      ticket: ticketActualizado
    });
  } catch (error) {
    console.error('Error actualizando ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Asignar ticket a un agente
 */
router.post('/:id/asignar', auth, async (req, res) => {
  try {
    const { agenteId } = req.body;
    
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{ model: User, as: 'locked', attributes: ['username', 'email'] }]
    });
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (ticket.estado === 'CERRADO') {
      return res.status(400).json({ 
        error: 'No se puede asignar un ticket cerrado'
      });
    }

    if (ticket.lockedBy && ticket.lockedBy !== req.user.id) {
      const tiempoBloqueo = new Date() - new Date(ticket.lockedAt);
      const TIEMPO_EXPIRACION = 15 * 60 * 1000;
      
      if (tiempoBloqueo < TIEMPO_EXPIRACION) {
        const userLocked = await User.findByPk(ticket.lockedBy);
        return res.status(423).json({ 
          error: 'Ticket bloqueado',
          message: `Este ticket está siendo atendido por ${userLocked?.username}`,
          lockedBy: userLocked
        });
      }
    }

    const agenteAsignado = agenteId || req.user.id;
    ticket.asignadoA = agenteAsignado;
    ticket.lockedBy = agenteAsignado;
    ticket.lockedAt = new Date();
    
    if (ticket.estado === 'PENDIENTE') {
      ticket.estado = 'ASIGNADO';
    }

    await ticket.save();

    const agente = await User.findByPk(agenteAsignado);
    
    await Conversation.update(
      { 
        assignedAgentId: agenteAsignado,
        estado: 'ASIGNADO'
      },
      { where: { phoneNumber: ticket.phoneNumber } }
    );

    res.json({
      message: 'Ticket asignado correctamente',
      ticket: await Ticket.findByPk(ticket.id, {
        include: [{ model: User, as: 'agente', attributes: ['username', 'email'] }]
      })
    });
  } catch (error) {
    console.error('Error asignando ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cerrar ticket
 */
router.post('/:id/cerrar', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    if (ticket.estado === 'CERRADO') {
      return res.status(400).json({ error: 'El ticket ya está cerrado' });
    }

    ticket.estado = 'CERRADO';
    ticket.fechaCierre = new Date();
    ticket.cerradoPor = req.user.id;
    ticket.lockedBy = null;
    ticket.lockedAt = null;
    await ticket.save();

    res.json({
      message: 'Ticket cerrado',
      ticket
    });
  } catch (error) {
    console.error('Error cerrando ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
