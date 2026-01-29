# 🎯 Sistema de Cola y Estados

## 📋 Flujo de Conversación

El chatbot ahora maneja un flujo estructurado con estados:

### Estados del Usuario

1. **INICIO** 
   - Usuario nuevo o reiniciado
   - El bot saluda y pide la placa

2. **ESPERANDO_PLACA**
   - Bot espera que el usuario ingrese su placa
   - Valida que tenga al menos 5 caracteres
   - Guarda la placa en mayúsculas

3. **ESPERANDO_CEDULA**
   - Bot pide la cédula después de recibir la placa
   - Valida que tenga al menos 6 dígitos
   - Guarda solo números

4. **EN_COLA**
   - Usuario completó sus datos y está esperando
   - Se le asigna una posición en la cola
   - Timestamp de entrada a la cola

5. **ASIGNADO**
   - Usuario fue asignado a un agente
   - Ya puede ser atendido directamente

## 💬 Ejemplo de Conversación

```
Usuario: Hola
Bot: ¡Bienvenido! 🚗

Para ayudarte, necesito algunos datos.

Por favor, ingresa tu PLACA:

---

Usuario: ABC123
Bot: ✅ Placa registrada: ABC123

Ahora, ingresa tu CÉDULA:

---

Usuario: 12345678
Bot: ✅ Datos registrados correctamente:

🚗 Placa: ABC123
🆔 Cédula: 12345678

⏳ Estás en la posición 3 de la cola.

Un agente te atenderá pronto. Gracias por tu paciencia.
```

## 🗄️ Base de Datos

### Modelo Conversation (Actualizado)

```javascript
{
  phoneNumber: String,      // Número de WhatsApp
  name: String,             // Nombre (opcional)
  placa: String,            // Placa del vehículo
  cedula: String,           // Cédula de identidad
  estado: String,           // Estado actual del flujo
  lastMessage: String,      // Último mensaje
  lastMessageTime: Date,    // Timestamp del último mensaje
  unreadCount: Number,      // Mensajes sin leer
  status: String,           // active, archived, blocked
  assignedAgent: ObjectId,  // Agente asignado
  posicionEnCola: Number,   // Posición en la cola
  timestampEnCola: Date,    // Cuando entró a la cola
  createdAt: Date          // Fecha de creación
}
```

## 🔌 API de Cola

### Listar usuarios en cola
```bash
GET /api/cola
Authorization: Bearer {token}
```

**Respuesta:**
```json
[
  {
    "phoneNumber": "521234567890",
    "placa": "ABC123",
    "cedula": "12345678",
    "estado": "EN_COLA",
    "posicionEnCola": 1,
    "timestampEnCola": "2026-01-27T10:30:00.000Z"
  }
]
```

### Obtener siguiente en cola
```bash
GET /api/cola/siguiente
Authorization: Bearer {token}
```

### Asignar usuario a agente
```bash
POST /api/cola/asignar/{phoneNumber}
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "message": "Usuario asignado correctamente",
  "conversation": { ... }
}
```

### Reiniciar conversación
```bash
POST /api/cola/reiniciar/{phoneNumber}
Authorization: Bearer {token}
```

### Estadísticas de cola
```bash
GET /api/cola/estadisticas
Authorization: Bearer {token}
```

**Respuesta:**
```json
{
  "enCola": 5,
  "asignados": 3,
  "esperandoPlaca": 2,
  "esperandoCedula": 1,
  "total": 15,
  "tiempoPromedioEnCola": 12
}
```

## 🎨 Frontend Actualizado

### Nuevas Funcionalidades

1. **Vista de datos del usuario**
   - Muestra placa y cédula en el header del chat
   - Muestra estado actual del usuario
   - Muestra posición en cola si aplica

2. **Badges de estado**
   - Colores diferentes según el estado
   - INICIO: Verde
   - ESPERANDO_PLACA/CEDULA: Naranja
   - EN_COLA: Rosa
   - ASIGNADO: Azul

3. **Botón de asignación**
   - Aparece solo si el usuario está EN_COLA
   - Permite asignar el usuario al agente actual
   - Actualiza automáticamente la lista

4. **Lista de conversaciones mejorada**
   - Muestra placa y estado en cada conversación
   - Muestra posición en cola si está esperando

## 🔧 Personalización

### Modificar validaciones

Edita `routes/webhook.js`:

```javascript
// Validación de placa (línea ~50)
if (placaLimpia.length < 5) {
  return '❌ La placa ingresada no es válida...';
}

// Validación de cédula (línea ~65)
if (cedulaLimpia.length < 6) {
  return '❌ La cédula ingresada no es válida...';
}
```

### Agregar más campos

1. Actualizar modelo en `models/Conversation.js`
2. Agregar nuevo estado en el enum
3. Implementar lógica en `routes/webhook.js`
4. Actualizar frontend para mostrar el nuevo campo

## 📊 Diagrama de Estados

```
INICIO
  ↓ (Usuario envía mensaje)
ESPERANDO_PLACA
  ↓ (Usuario envía placa válida)
ESPERANDO_CEDULA
  ↓ (Usuario envía cédula válida)
EN_COLA
  ↓ (Agente asigna usuario)
ASIGNADO
```

## 🚀 Uso en Producción

### Optimizaciones Recomendadas

1. **Índices de base de datos**
   ```javascript
   conversationSchema.index({ estado: 1, timestampEnCola: 1 });
   ```

2. **Cache de posiciones**
   - Usar Redis para cachear posiciones en cola
   - Evitar consultas frecuentes a MongoDB

3. **Notificaciones push**
   - Notificar a agentes cuando hay usuarios en cola
   - Enviar mensaje al usuario cuando sea asignado

4. **Timeouts**
   - Remover usuarios de la cola después de X tiempo
   - Enviar recordatorio si no responde

## 💡 Mejoras Futuras

- [ ] Sistema de prioridad en cola
- [ ] Notificaciones cuando un usuario llegue a posición 1
- [ ] Dashboard con métricas en tiempo real
- [ ] Exportar reportes de atención
- [ ] Integración con sistema de tickets
- [ ] Chat en vivo entre agente y usuario
- [ ] Respuestas rápidas predefinidas
- [ ] Templates de mensajes

## 🐛 Solución de Problemas

### Usuario no avanza de estado
- Verificar validaciones en `webhook.js`
- Revisar logs del servidor
- Verificar que MongoDB esté guardando correctamente

### Posiciones en cola incorrectas
- Ejecutar `actualizarPosicionesEnCola()` manualmente
- Verificar índices en MongoDB
- Revisar consulta de conteo

### Estados desincronizados
- Usar endpoint `/api/cola/reiniciar/{phoneNumber}`
- Verificar que no haya múltiples instancias del servidor
- Implementar sistema de locks para escrituras concurrentes

---

¡El sistema de cola está completamente funcional! 🎉
