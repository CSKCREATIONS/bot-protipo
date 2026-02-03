const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  numeroTicket: {
    type: String,
    unique: true
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
  nombreCliente: {
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
  contadorTickets: {
    type: Number,
    default: 1,
    comment: 'Número de ticket del usuario'
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
  archivosAdjuntos: [{
    tipo: {
      type: String,
      enum: ['image', 'audio', 'video', 'document'],
      required: true
    },
    mediaId: String,
    mediaUrl: String,
    caption: String,
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
  },
  fechaFinalizacion: {
    type: Date,
    default: null,
    comment: 'Fecha en que el ticket fue completado/finalizado'
  },
  tiempoResolucion: {
    type: Number,
    default: null,
    comment: 'Tiempo en minutos para resolver el ticket'
  },
  cerradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

// Generar número de ticket automáticamente y calcular tiempo de resolución
ticketSchema.pre('save', async function(next) {
  try {
    // Generar número de ticket para nuevos tickets
    if (this.isNew) {
      if (!this.numeroTicket) {
        const count = await mongoose.model('Ticket').countDocuments();
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        this.numeroTicket = `TKT-${año}${mes}-${String(count + 1).padStart(5, '0')}`;
        console.log(`✅ Número de ticket generado: ${this.numeroTicket}`);
      }
      
      // Contar tickets del usuario (incluir el actual que se está creando)
      if (!this.contadorTickets) {
        const userTickets = await mongoose.model('Ticket').countDocuments({
          phoneNumber: this.phoneNumber
        });
        this.contadorTickets = userTickets + 1;
        console.log(`📊 Este es el ticket #${this.contadorTickets} del usuario ${this.phoneNumber}`);
      }
    }
    
    // Calcular tiempo de resolución cuando se cierra el ticket
    if (this.isModified('estado') && this.estado === 'CERRADO' && !this.tiempoResolucion) {
      this.fechaCierre = new Date();
      this.fechaFinalizacion = new Date();
      const tiempoMs = this.fechaCierre - this.fechaCreacion;
      this.tiempoResolucion = Math.round(tiempoMs / (1000 * 60)); // Convertir a minutos
      console.log(`⏱️ Ticket ${this.numeroTicket} resuelto en ${this.tiempoResolucion} minutos`);
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
