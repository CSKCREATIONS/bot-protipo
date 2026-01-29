# 🔄 Nuevo Flujo del Sistema de Tickets

## 📱 Flujo Completo del Usuario

### 1️⃣ Usuario Envía Primer Mensaje
**Acción:** Usuario escribe "Hola" por WhatsApp

**Respuesta automática del bot:**
```
¡Bienvenido! 🎫

✅ Tu ticket TKT-202601-00001 ha sido creado.

Para ayudarte, necesito algunos datos.

Por favor, ingresa tu PLACA del vehículo
(Formato: ABC123):
```

**Qué sucede internamente:**
- ✅ Se crea un nuevo registro en `Conversation` con estado `INICIO`
- ✅ Se crea un nuevo `Ticket` automáticamente con número único
- ✅ El usuario recibe su número de ticket inmediatamente
- ✅ Estado cambia a `ESPERANDO_PLACA`

---

### 2️⃣ Usuario Envía la Placa
**Acción:** Usuario escribe "ABC123"

**Validación de placa colombiana:**
- ✅ Formato válido: **3 letras + 3 números** (ABC123)
- ❌ Formato inválido: ABC12, ABCD123, 123ABC, etc.

**Respuesta automática del bot:**
```
✅ Placa registrada: ABC123

Ahora, ingresa tu número de CÉDULA:
```

**Qué sucede internamente:**
- ✅ Se valida formato colombiano (3 letras + 3 números)
- ✅ Se guarda la placa en `Conversation`
- ✅ Se actualiza el `Ticket` con la placa
- ✅ Estado cambia a `ESPERANDO_CEDULA`

---

### 3️⃣ Usuario Envía la Cédula
**Acción:** Usuario escribe "1234567890"

**Validación de cédula:**
- ✅ Debe tener entre 6 y 10 dígitos
- ❌ Se rechazan cédulas con menos de 6 o más de 10 dígitos

**Respuesta automática del bot:**
```
✅ Datos registrados correctamente:

🎫 Ticket: TKT-202601-00001
🚗 Placa: ABC123
🆔 Cédula: 1234567890

⏳ Estás en la posición 3 de la cola.

Un agente te atenderá pronto. Gracias por tu paciencia.
```

**Qué sucede internamente:**
- ✅ Se guarda la cédula en `Conversation`
- ✅ Se actualiza el `Ticket` con la cédula
- ✅ Se calcula la posición en cola
- ✅ Estado cambia a `EN_COLA`
- ✅ Se registra `timestampEnCola` para seguimiento

---

### 4️⃣ Usuario en Cola Escribe Nuevamente
**Acción:** Usuario escribe "¿Cuánto falta?"

**Respuesta automática del bot:**
```
⏳ Sigues en cola.

🎫 Ticket: TKT-202601-00001
Posición actual: 2

Un agente te atenderá pronto. Por favor espera.
```

**Qué sucede internamente:**
- ✅ Se recalcula la posición en tiempo real
- ✅ Se muestra el número de ticket
- ✅ Se actualiza `posicionEnCola` en la base de datos

---

### 5️⃣ Agente Toma el Ticket
**Acción:** Un agente hace clic en "Asignar a mí" en el Dashboard

**Mensaje automático enviado al usuario:**
```
✅ Juan Pérez ha tomado tu ticket.

🎫 Ticket: TKT-202601-00001

Serás atendido en breve. Gracias por tu paciencia.
```

**Qué sucede internamente:**
- ✅ Se asigna el agente al `Ticket` y `Conversation`
- ✅ Estado del ticket cambia a `EN_PROCESO`
- ✅ Estado de conversación cambia a `ASIGNADO`
- ✅ **Se envía mensaje automático de WhatsApp con nombre del agente**
- ✅ Se guarda el mensaje en la base de datos
- ✅ Se actualizan las posiciones de los demás usuarios en cola

---

### 6️⃣ Usuario Ya Asignado Escribe
**Acción:** Usuario escribe después de ser asignado

**Respuesta automática del bot:**
```
✅ Ya fuiste asignado a un agente.

🎫 Ticket: TKT-202601-00001
👤 Agente: Juan Pérez

Te responderemos en breve.
```

**Qué sucede internamente:**
- ✅ Se verifica que el usuario está en estado `ASIGNADO`
- ✅ Se muestra el nombre del agente asignado
- ✅ El agente puede ver el mensaje en el Dashboard

---

## 🔐 Validaciones Implementadas

### Placas Colombianas
```javascript
Formato: ABC123
- Exactamente 3 letras (A-Z)
- Exactamente 3 números (0-9)
- Sin espacios ni caracteres especiales

✅ Válidas: ABC123, XYZ789, DEF456
❌ Inválidas: AB123, ABCD123, ABC12, 123ABC, ABC-123
```

### Cédulas
```javascript
- Mínimo: 6 dígitos
- Máximo: 10 dígitos
- Solo números

✅ Válidas: 123456, 1234567890, 98765432
❌ Inválidas: 12345, 12345678901, ABC123456
```

---

## 🎫 Creación Automática de Tickets

| Momento | Estado | Ticket | Datos |
|---------|--------|--------|-------|
| **Primera interacción** | INICIO → ESPERANDO_PLACA | ✅ Creado | numeroTicket |
| **Después de placa** | ESPERANDO_CEDULA | ✅ Actualizado | + placa |
| **Después de cédula** | EN_COLA | ✅ Actualizado | + cédula |
| **Agente asigna** | ASIGNADO | ✅ Actualizado | + asignadoA |

---

## 📤 Mensajes Automáticos

### Momento 1: Primera Interacción
- **Cuándo:** Usuario nuevo escribe por primera vez
- **Qué envía:** Número de ticket + solicitud de placa
- **Quién lo envía:** Bot automático

### Momento 2: Después de Placa
- **Cuándo:** Usuario proporciona placa válida
- **Qué envía:** Confirmación de placa + solicitud de cédula
- **Quién lo envía:** Bot automático

### Momento 3: Después de Cédula
- **Cuándo:** Usuario proporciona cédula válida
- **Qué envía:** Resumen completo (ticket, placa, cédula, posición)
- **Quién lo envía:** Bot automático

### Momento 4: Agente Toma el Ticket ⭐ NUEVO
- **Cuándo:** Agente hace clic en "Asignar a mí"
- **Qué envía:** Nombre del agente + número de ticket
- **Quién lo envía:** Sistema automático
- **Ejemplo:** "✅ Juan Pérez ha tomado tu ticket. 🎫 Ticket: TKT-202601-00001"

---

## 🔄 Estados del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE ESTADOS                         │
└─────────────────────────────────────────────────────────────┘

Usuario nuevo escribe
        │
        ▼
    [INICIO] ────────────────► Ticket creado automáticamente
        │                      Mensaje: "Ticket TKT-XXX creado"
        │
        ▼
[ESPERANDO_PLACA] ───────────► Usuario envía placa
        │                      Validación: ABC123
        │
        ▼
[ESPERANDO_CEDULA] ──────────► Usuario envía cédula
        │                      Validación: 1234567890
        │
        ▼
    [EN_COLA] ───────────────► Esperando agente
        │                      Posición actualizada en tiempo real
        │
        ▼
   [ASIGNADO] ───────────────► Agente toma ticket
                               Mensaje: "Juan Pérez ha tomado tu ticket"
```

---

## 💻 Endpoints Modificados

### POST /api/webhook (Recibir mensajes)
**Cambios:**
- ✅ Crea ticket inmediatamente en primer mensaje
- ✅ Valida placas con formato colombiano (ABC123)
- ✅ Incluye número de ticket en todas las respuestas

### POST /api/tickets/:id/asignar (Asignar ticket)
**Cambios:**
- ✅ Envía mensaje automático de WhatsApp al cliente
- ✅ Incluye nombre del agente en el mensaje
- ✅ Actualiza estado de conversación a ASIGNADO
- ✅ Guarda el mensaje en la base de datos

### POST /api/cola/asignar/:phoneNumber (Asignar desde cola)
**Cambios:**
- ✅ Envía mensaje automático de WhatsApp al cliente
- ✅ Incluye nombre del agente en el mensaje
- ✅ Sincroniza ticket y conversación
- ✅ Actualiza posiciones de otros usuarios en cola

---

## 📊 Ejemplo Completo

### Timeline de un Usuario

| Tiempo | Acción | Estado | Mensaje Enviado |
|--------|--------|--------|-----------------|
| 10:00 | Usuario: "Hola" | INICIO | "Ticket TKT-202601-00001 creado. Ingresa tu PLACA:" |
| 10:01 | Usuario: "ABC123" | ESPERANDO_CEDULA | "Placa ABC123 registrada. Ingresa tu CÉDULA:" |
| 10:02 | Usuario: "1234567890" | EN_COLA | "Datos registrados. Ticket: TKT-202601-00001. Posición: 3" |
| 10:05 | Usuario: "¿Cuánto falta?" | EN_COLA | "Sigues en cola. Posición: 2" |
| 10:10 | Agente: Clic "Asignar" | ASIGNADO | "✅ Juan Pérez ha tomado tu ticket" |
| 10:11 | Usuario: "Gracias" | ASIGNADO | "Ya fuiste asignado a Juan Pérez" |

---

## 🔧 Archivos Modificados

1. **routes/webhook.js**
   - Creación inmediata de tickets
   - Validación de placas colombianas
   - Inclusión de número de ticket en mensajes

2. **routes/tickets.js**
   - Envío automático de mensaje al asignar ticket
   - Integración con WhatsApp service
   - Guardado de mensajes en base de datos

3. **routes/cola.js**
   - Envío automático de mensaje al asignar desde cola
   - Sincronización de ticket y conversación
   - Actualización de posiciones

---

## ✅ Ventajas del Nuevo Flujo

1. **Inmediatez:** Usuario recibe ticket al instante
2. **Transparencia:** Siempre sabe su número de ticket
3. **Validación:** Formato colombiano de placas garantizado
4. **Comunicación:** Notificación automática cuando agente toma el ticket
5. **Trazabilidad:** Todos los mensajes guardados en base de datos
6. **UX Mejorada:** Usuario siempre informado del estado

---

**Última actualización:** Enero 2026  
**Versión:** 2.0
