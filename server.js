const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { syncDatabase } = require('./models');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/webhook', require('./routes/webhook'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/cola', require('./routes/cola'));
app.use('/api/tickets', require('./routes/tickets'));

app.get('/', (req, res) => {
  res.json({ message: 'WhatsApp Chatbot API funcionando correctamente' });
});

const PORT = process.env.PORT || 5000;

syncDatabase().then(() => {
  app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
}).catch(err => {
  console.error('❌ Error al iniciar servidor:', err);
  process.exit(1);
});