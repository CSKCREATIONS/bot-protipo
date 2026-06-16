const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  numeroTicket: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
<<<<<<< HEAD
    references: {
      model: 'conversations',
      key: 'id'
    }
=======
    references: { model: 'conversations', key: 'id' }
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  },
  phoneNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  nombreCliente: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  placa: {
    type: DataTypes.STRING(50),
    defaultValue: ''
  },
  cedula: {
    type: DataTypes.STRING(50),
    defaultValue: ''
  },
  descripcion: {
    type: DataTypes.TEXT,
    defaultValue: 'Solicitud de atención'
  },
  contadorTickets: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'ASIGNADO', 'CERRADO'),
    defaultValue: 'PENDIENTE'
  },
  prioridad: {
    type: DataTypes.ENUM('BAJA', 'MEDIA', 'ALTA', 'URGENTE'),
    defaultValue: 'MEDIA'
  },
  asignadoA: {
    type: DataTypes.INTEGER,
    allowNull: true,
<<<<<<< HEAD
    references: {
      model: 'users',
      key: 'id'
    }
=======
    references: { model: 'users', key: 'id' }
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  },
  lockedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
<<<<<<< HEAD
    references: {
      model: 'users',
      key: 'id'
    }
=======
    references: { model: 'users', key: 'id' }
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  },
  lockedAt: {
    type: DataTypes.DATE,
    allowNull: true
<<<<<<< HEAD
  },
  fechaAsignacion: {
    type: DataTypes.DATE,
    allowNull: true
=======
  },
  notas: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  archivosAdjuntos: {
    type: DataTypes.TEXT, // almacenar JSON string
    defaultValue: '[]'
  },
  fechaCreacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  },
  fechaCierre: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fechaFinalizacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tiempoResolucion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Tiempo en minutos'
  },
  cerradoPor: {
    type: DataTypes.INTEGER,
    allowNull: true,
<<<<<<< HEAD
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notas: {
    type: DataTypes.TEXT,
    defaultValue: ''
=======
    references: { model: 'users', key: 'id' }
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
  }
}, {
  tableName: 'tickets',
  timestamps: true,
<<<<<<< HEAD
  indexes: [
    {
      fields: ['estado', 'createdAt']
    },
    {
      fields: ['asignadoA', 'estado']
    },
    {
      fields: ['phoneNumber']
    }
  ],
  hooks: {
    beforeCreate: async (ticket) => {
      // Generar número de ticket
=======
  hooks: {
    beforeCreate: async (ticket) => {
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
      if (!ticket.numeroTicket) {
        const count = await Ticket.count();
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        ticket.numeroTicket = `TKT-${año}${mes}-${String(count + 1).padStart(5, '0')}`;
      }
<<<<<<< HEAD
      
      // Contar tickets del usuario
      if (!ticket.contadorTickets) {
        const userTickets = await Ticket.count({
          where: { phoneNumber: ticket.phoneNumber }
        });
=======
      if (!ticket.contadorTickets) {
        const userTickets = await Ticket.count({ where: { phoneNumber: ticket.phoneNumber } });
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
        ticket.contadorTickets = userTickets + 1;
      }
    },
    beforeUpdate: async (ticket) => {
<<<<<<< HEAD
      // Calcular tiempo de resolución al cerrar
=======
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
      if (ticket.changed('estado') && ticket.estado === 'CERRADO' && !ticket.tiempoResolucion) {
        ticket.fechaCierre = new Date();
        ticket.fechaFinalizacion = new Date();
        const tiempoMs = ticket.fechaCierre - ticket.createdAt;
        ticket.tiempoResolucion = Math.round(tiempoMs / (1000 * 60));
      }
    }
  }
});

<<<<<<< HEAD
module.exports = Ticket;
=======
module.exports = Ticket;
>>>>>>> a3d84ffc394df9cdb36df3aae0849c92dcd8cac3
