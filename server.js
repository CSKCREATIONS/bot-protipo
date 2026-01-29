const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error al conectar MongoDB:', err));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/cola', require('./routes/cola'));
app.use('/api/tickets', require('./routes/tickets'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp Chatbot API funcionando correctamente' });
});

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
