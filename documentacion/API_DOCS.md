# 📡 Documentación de la API

Base URL: `http://localhost:5000/api`

## 🔐 Autenticación

### Registro de Usuario
```bash
POST /auth/register
Content-Type: application/json

{
  "username": "usuario123",
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "role": "agent"  // opcional: "agent" o "admin"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "usuario123",
    "email": "usuario@ejemplo.com",
    "role": "agent"
  }
}
```

### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "usuario123",
    "email": "usuario@ejemplo.com",
    "role": "agent"
  }
}
```

### Obtener Perfil
```bash
GET /auth/me
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "usuario123",
    "email": "usuario@ejemplo.com",
    "role": "agent"
  }
}
```

### Listar Agentes (Solo Admin)
```bash
GET /auth/agents
Authorization: Bearer {token}
```

## 💬 Mensajes

### Listar Conversaciones
```bash
GET /messages/conversations
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "phoneNumber": "521234567890",
    "name": "",
    "lastMessage": "Hola, necesito ayuda",
    "lastMessageTime": "2026-01-27T10:30:00.000Z",
    "unreadCount": 2,
    "status": "active",
    "assignedAgent": null,
    "createdAt": "2026-01-27T09:00:00.000Z"
  }
]
```

### Obtener Mensajes de una Conversación
```bash
GET /messages/conversation/{phoneNumber}?limit=50&skip=0
Authorization: Bearer {token}
```

**Parámetros de Query:**
- `limit`: Número máximo de mensajes (default: 50)
- `skip`: Número de mensajes a omitir (paginación)

**Respuesta:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "conversationId": "521234567890",
    "from": "521234567890",
    "to": "52111111111",
    "message": "Hola, necesito ayuda",
    "type": "text",
    "direction": "inbound",
    "status": "delivered",
    "whatsappMessageId": "wamid.ABC123...",
    "timestamp": "2026-01-27T10:30:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "conversationId": "521234567890",
    "from": "52111111111",
    "to": "521234567890",
    "message": "Hola, ¿en qué puedo ayudarte?",
    "type": "text",
    "direction": "outbound",
    "status": "read",
    "whatsappMessageId": "wamid.XYZ789...",
    "timestamp": "2026-01-27T10:31:00.000Z"
  }
]
```

### Enviar Mensaje de Texto
```bash
POST /messages/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "521234567890",
  "message": "Hola, gracias por contactarnos",
  "type": "text"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Mensaje enviado correctamente",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "conversationId": "521234567890",
    "from": "52111111111",
    "to": "521234567890",
    "message": "Hola, gracias por contactarnos",
    "type": "text",
    "direction": "outbound",
    "status": "sent",
    "whatsappMessageId": "wamid.ABC456...",
    "timestamp": "2026-01-27T10:32:00.000Z"
  }
}
```

### Enviar Mensaje con Imagen
```bash
POST /messages/send
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "521234567890",
  "message": "Aquí está tu imagen",
  "type": "image",
  "imageUrl": "https://ejemplo.com/imagen.jpg",
  "caption": "Descripción de la imagen"
}
```

### Archivar Conversación
```bash
PATCH /messages/conversation/{phoneNumber}/archive
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "phoneNumber": "521234567890",
  "status": "archived",
  ...
}
```

### Asignar Agente a Conversación
```bash
PATCH /messages/conversation/{phoneNumber}/assign
Authorization: Bearer {token}
Content-Type: application/json

{
  "agentId": "507f1f77bcf86cd799439014"
}
```

## 🔗 Webhook

### Verificación del Webhook (GET)
```bash
GET /webhook?hub.mode=subscribe&hub.verify_token={tu_verify_token}&hub.challenge={challenge}
```

Este endpoint es llamado por Meta para verificar tu webhook.

### Recibir Mensajes (POST)
```bash
POST /webhook
Content-Type: application/json

# Este endpoint recibe automáticamente los mensajes de WhatsApp
# No necesitas llamarlo manualmente
```

**Ejemplo de payload de WhatsApp:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "1234567890",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "messages": [{
          "from": "521234567890",
          "id": "wamid.ABC123...",
          "timestamp": "1674825600",
          "type": "text",
          "text": {
            "body": "Hola"
          }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

## 🧪 Ejemplos con cURL

### Registro
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@ejemplo.com",
    "password": "password123",
    "role": "admin"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ejemplo.com",
    "password": "password123"
  }'
```

### Listar Conversaciones
```bash
curl -X GET http://localhost:5000/api/messages/conversations \
  -H "Authorization: Bearer {tu_token}"
```

### Enviar Mensaje
```bash
curl -X POST http://localhost:5000/api/messages/send \
  -H "Authorization: Bearer {tu_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "521234567890",
    "message": "Hola desde la API",
    "type": "text"
  }'
```

## 📝 Notas

- Todos los endpoints excepto `/auth/register`, `/auth/login` y `/webhook` requieren autenticación
- El token JWT expira en 7 días
- Los números de teléfono deben estar en formato internacional sin símbolos (ej: 521234567890)
- El webhook debe estar configurado en Meta Developers para recibir mensajes

## ⚠️ Códigos de Error

- `400` - Petición incorrecta (faltan campos o datos inválidos)
- `401` - No autenticado (token inválido o ausente)
- `403` - No autorizado (sin permisos)
- `404` - Recurso no encontrado
- `500` - Error del servidor

## 🔒 Seguridad

- Guarda tu token JWT de forma segura
- No compartas tus credenciales de WhatsApp API
- Usa HTTPS en producción
- Rota tu JWT_SECRET regularmente
