const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document'],
    default: 'text'
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  whatsappMessageId: {
    type: String,
    sparse: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Índice compuesto para búsquedas eficientes
messageSchema.index({ conversationId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
