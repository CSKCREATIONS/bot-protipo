const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  numeroTicket: {
    type: String,
    unique: true,
    sparse: true  // Permite null temporalmente hasta que se genere
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  placa: {
    type: String,
    default: ''
  },
  cedula: {
    type: String,
    default: ''
  },
  descripcion: {
    type: String,
    default: 'Solicitud de atención'
  },
  estado: {
    type: String,
    enum: ['PENDIENTE', 'ASIGNADO', 'CERRADO'],
    default: 'PENDIENTE'
  },
  prioridad: {
    type: String,
    enum: ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'],
    default: 'MEDIA'
  },
  asignadoA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lockedAt: {
    type: Date,
    default: null
  },
  notas: [{
    texto: String,
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fecha: {
      type: Date,
      default: Date.now
    }
  }],
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date,
    default: Date.now
  },
  fechaCierre: {
    type: Date,
    default: null
  }
});

// Generar número de ticket automáticamente
ticketSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.numeroTicket) {
      const count = await mongoose.model('Ticket').countDocuments();
      const fecha = new Date();
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      this.numeroTicket = `TKT-${año}${mes}-${String(count + 1).padStart(5, '0')}`;
      console.log(`✅ Número de ticket generado: ${this.numeroTicket}`);
    }
    this.fechaActualizacion = new Date();
    next();
  } catch (error) {
    console.error('❌ Error generando número de ticket:', error);
    next(error);
  }
});

// Índices para búsquedas eficientes
ticketSchema.index({ estado: 1, fechaCreacion: -1 });
ticketSchema.index({ asignadoA: 1, estado: 1 });
ticketSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
