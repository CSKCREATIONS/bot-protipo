const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    default: ''
  },
  placa: {
    type: String,
    default: ''
  },
  cedula: {
    type: String,
    default: ''
  },
  estado: {
    type: String,
    enum: ['INICIO', 'ESPERANDO_NOMBRE', 'ESPERANDO_PLACA', 'ESPERANDO_CEDULA', 'EN_COLA', 'ASIGNADO'],
    default: 'INICIO'
  },
  messages: [{
    from: String,
    to: String,
    message: String,
    type: {
      type: String,
      default: 'text'
    },
    mediaId: String,
    mediaUrl: String,
    caption: String,
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    whatsappMessageId: String,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  posicionEnCola: {
    type: Number,
    default: null
  },
  timestampEnCola: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Índice para optimizar búsquedas en cola
conversationSchema.index({ estado: 1, timestampEnCola: 1 });

// Limitar mensajes a los últimos 100 (mantener historial reciente)
conversationSchema.pre('save', function(next) {
  if (this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
