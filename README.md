# WhatsApp Chatbot

Chatbot de WhatsApp construido con Node.js, Express, MongoDB, React y WhatsApp API (Meta Cloud).

## 🚀 Características

- ✅ Recibir y enviar mensajes de WhatsApp
- ✅ Webhook para procesar mensajes entrantes
- ✅ **Sistema de cola con estados**
- ✅ **Captura de placa y cédula**
- ✅ **Gestión automática de posiciones en cola**
- ✅ Respuestas automáticas personalizables
- ✅ Panel de administración con React
- ✅ Autenticación JWT
- ✅ Gestión de conversaciones
- ✅ Múltiples agentes
- ✅ Historial de mensajes
- ✅ Estado de mensajes (enviado, entregado, leído)

## 📋 Requisitos Previos

- Node.js (v14 o superior)
- MongoDB (local o Atlas)
- Cuenta de WhatsApp Business API (Meta Cloud)

## 🔧 Instalación

### 1. Clonar el repositorio y configurar backend

```bash
# Instalar dependencias del backend
npm install

# Copiar archivo de variables de entorno
copy .env.example .env
```

### 2. Configurar variables de entorno

Edita el archivo `.env` con tus credenciales:

```env
MONGODB_URI=tu_conexion_mongodb
JWT_SECRET=tu_clave_secreta_jwt
WHATSAPP_TOKEN=tu_token_whatsapp_api
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_VERIFY_TOKEN=tu_token_verificacion
PORT=5000
```

### 3. Configurar WhatsApp API

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Crea una aplicación
3. Agrega el producto "WhatsApp"
4. Configura el webhook apuntando a: `https://tu-dominio.com/api/webhook`
5. Copia el token de acceso y phone number ID

### 4. Instalar y ejecutar frontend

```bash
npm run install-client
```

### 5. Ejecutar la aplicación

```bash
# Backend (en una terminal)
npm run dev

# Frontend (en otra terminal)
npm run client
```

El backend estará en `http://localhost:5000`  
El frontend estará en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
├── models/              # Modelos de MongoDB
│   ├── User.js
│   ├── Message.js
│   └── Conversation.js
├── routes/              # Rutas de la API
│   ├── auth.js
│   ├── webhook.js
│   ├── messages.js
│   └── cola.js          # NEW: Gestión de cola
├── services/            # Servicios
│   └── whatsappService.js
├── middleware/          # Middlewares
│   └── auth.js
├── client/              # Aplicación React
│   └── src/
├── server.js            # Servidor principal
├── package.json
└── .env.example
```

## 🔐 Endpoints de la API

### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener perfil

### Mensajes

- `GET /api/messages/conversations` - Listar conversaciones
- `GET /api/messages/conversation/:phoneNumber` - Obtener mensajes
- `POST /api/messages/send` - Enviar mensaje
- `PATCH /api/messages/conversation/:phoneNumber/archive` - Archivar conversación

### Cola (NEW)

- `GET /api/cola` - Listar usuarios en cola
- `GET /api/cola/siguiente` - Obtener siguiente en cola
- `POST /api/cola/asignar/:phoneNumber` - Asignar usuario a agente
- `POST /api/cola/reiniciar/:phoneNumber` - Reiniciar conversación
- `GET /api/cola/estadisticas` - Estadísticas de la cola
Sistema de Cola y Estados

El bot ahora maneja un flujo estructurado:

1. **INICIO** → Saluda y pide la placa
2. **ESPERANDO_PLACA** → Valida y guarda la placa
3. **ESPERANDO_CEDULA** → Valida y guarda la cédula
4. **EN_COLA** → Usuario espera turno con posición
5. **ASIGNADO** → Usuario asignado a un agente

Ver documentación completa en [SISTEMA_COLA.md](SISTEMA_COLA.md)

### 
### Webhook

- `GET /api/webhook` - Verificación del webhook
- `POST /api/webhook` - Recibir mensajes de WhatsApp

## 🎨 Personalización

### Respuestas Automáticas

Edita la función `processIncomingMessage` en `routes/webhook.js` para personalizar las respuestas automáticas del bot.

### Interfaz

El frontend está en la carpeta `client/src`. Puedes personalizar los componentes React según tus necesidades.

## 🛠️ Tecnologías Utilizadas

- **Backend:**
  - Node.js
  - Express
  - MongoDB & Mongoose
  - JWT para autenticación
  - Axios para peticiones HTTP
  
- **Frontend:**
  - React
  - Axios
  - React Router
  
- **API:**
  - WhatsApp Business API (Meta Cloud)

## 📝 Notas Importantes

1. El webhook debe ser accesible públicamente (usa ngrok para desarrollo)
2. Meta requiere HTTPS para webhooks en producción
3. Guarda tu WHATSAPP_VERIFY_TOKEN de forma segura
4. El token de WhatsApp expira, genera uno nuevo cuando sea necesario

## 🚀 Deployment

### Backend (Railway, Render, Heroku)

1. Configura las variables de entorno
2. Asegúrate de tener MongoDB Atlas configurado
3. Actualiza la URL del webhook en Meta Developers

### Frontend (Vercel, Netlify)

1. Construye el proyecto: `cd client && npm run build`
2. Despliega la carpeta `build`
3. Configura la URL de la API

## 📄 Licencia

MIT

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request.

---

Desarrollado con ❤️ usando WhatsApp Business API
