# 🎫 Sistema de Tickets - Documentación

## 📋 Descripción General

El sistema de tickets permite gestionar y dar seguimiento a las solicitudes de los usuarios que ingresan a través del chatbot de WhatsApp. Cada usuario que completa el proceso de registro (proporciona placa y cédula) recibe automáticamente un ticket con un número único.

## 🔢 Numeración de Tickets

Los tickets se generan automáticamente con el formato:
```
TKT-YYYYMM-XXXXX
```

**Ejemplo:** `TKT-202501-00001`

- **TKT**: Prefijo del ticket
- **YYYYMM**: Año y mes de creación (202501 = Enero 2025)
- **XXXXX**: Número secuencial con 5 dígitos (00001, 00002, etc.)

## 📊 Estados del Ticket

### 1. ABIERTO 🔴
- **Descripción:** Ticket recién creado, sin asignar
- **Siguiente estado:** EN_PROCESO (cuando se asigna a un agente)

### 2. EN_PROCESO 🔵
- **Descripción:** Ticket asignado a un agente y en atención
- **Siguiente estado:** RESUELTO (cuando se soluciona el problema)

### 3. RESUELTO ✅
- **Descripción:** El problema ha sido solucionado
- **Siguiente estado:** CERRADO (cuando se cierra formalmente)

### 4. CERRADO ⚫
- **Descripción:** Ticket finalizado y archivado
- **Estado final:** No hay más cambios después de cerrado

## 🎯 Niveles de Prioridad

| Prioridad | Color | Descripción |
|-----------|-------|-------------|
| **BAJA** 🟢 | Verde | Consultas generales, no urgentes |
| **MEDIA** 🟡 | Amarillo | Solicitudes estándar |
| **ALTA** 🔴 | Rojo | Requiere atención prioritaria |
| **URGENTE** 🔥 | Rojo intenso | Atención inmediata requerida |

## 🔄 Flujo Automático

### 1. Usuario Inicia Conversación
```
Usuario: "Hola"
Bot: "¡Bienvenido! Por favor proporciona tu número de placa."
```

### 2. Usuario Proporciona Placa
```
Usuario: "ABC123"
Bot: "Placa ABC123 registrada. Ahora proporciona tu cédula."
```

### 3. Usuario Proporciona Cédula y Se Crea el Ticket
```
Usuario: "1234567890"
Bot: "Cédula registrada. Tu número de ticket es TKT-202501-00001. 
      Estás en la posición #3 de la cola."
```

**En este momento:**
- Se crea automáticamente un ticket en la base de datos
- Estado inicial: `ABIERTO`
- Prioridad inicial: `MEDIA`
- Se incluye: phoneNumber, placa, cedula, conversationId
- El usuario recibe su número de ticket por WhatsApp

## 🖥️ Interfaz del Sistema de Tickets

### Panel de Estadísticas
Muestra en tiempo real:
- 📊 **Total de tickets**
- 📥 **Tickets abiertos**
- ⚙️ **Tickets en proceso**
- ✅ **Tickets resueltos**
- 👤 **Mis tickets** (asignados al usuario actual)

### Lista de Tickets
- **Filtros disponibles:**
  - Por estado (Todos, Abierto, En Proceso, Resuelto, Cerrado)
  - Por prioridad (Todas, Baja, Media, Alta, Urgente)
  
- **Información mostrada:**
  - Número de ticket
  - Placa del vehículo
  - Teléfono del usuario
  - Badges de estado y prioridad
  - Fecha de creación

### Detalle del Ticket
- **Información completa:**
  - Teléfono, Placa, Cédula
  - Estado actual y prioridad
  - Agente asignado
  - Descripción
  - Fechas de creación y cierre
  
- **Acciones disponibles:**
  - ✅ **Asignar a mí:** Toma el ticket sin asignar
  - 🔄 **Cambiar estado:** Dropdown para actualizar el estado
  - ❌ **Cerrar ticket:** Finaliza y archiva el ticket
  
- **Sistema de Notas:**
  - Timeline de notas agregadas
  - Autor y fecha de cada nota
  - Agregar nuevas notas al ticket

## 🔌 API Endpoints

### Listar Tickets
```http
GET /api/tickets
```
**Query params opcionales:**
- `estado`: ABIERTO | EN_PROCESO | RESUELTO | CERRADO
- `prioridad`: BAJA | MEDIA | ALTA | URGENTE
- `asignadoA`: ID del usuario
- `page`: Número de página (default: 1)
- `limit`: Tickets por página (default: 10)

### Obtener Ticket Individual
```http
GET /api/tickets/:id
```

### Crear Ticket Manual
```http
POST /api/tickets
Content-Type: application/json

{
  "phoneNumber": "593999999999",
  "placa": "ABC123",
  "cedula": "1234567890",
  "descripcion": "Descripción del problema",
  "prioridad": "MEDIA"
}
```

### Actualizar Ticket
```http
PATCH /api/tickets/:id
Content-Type: application/json

{
  "estado": "EN_PROCESO",
  "prioridad": "ALTA",
  "descripcion": "Nueva descripción"
}
```

### Asignar Ticket
```http
POST /api/tickets/:id/asignar
```
Asigna el ticket al usuario autenticado. Si el estado es ABIERTO, lo cambia a EN_PROCESO.

### Agregar Nota
```http
POST /api/tickets/:id/notas
Content-Type: application/json

{
  "texto": "Nota sobre el ticket"
}
```

### Cerrar Ticket
```http
POST /api/tickets/:id/cerrar
```
Cambia el estado a CERRADO y registra la fecha de cierre.

### Estadísticas
```http
GET /api/tickets/stats/resumen
```

**Respuesta:**
```json
{
  "total": 25,
  "abiertos": 5,
  "enProceso": 8,
  "resueltos": 10,
  "cerrados": 2,
  "misTickets": 3,
  "porPrioridad": {
    "BAJA": 5,
    "MEDIA": 15,
    "ALTA": 4,
    "URGENTE": 1
  }
}
```

## 💾 Modelo de Datos

```javascript
{
  numeroTicket: "TKT-202501-00001",  // Único, auto-generado
  conversationId: ObjectId,           // Ref: Conversation
  phoneNumber: "593999999999",
  placa: "ABC123",
  cedula: "1234567890",
  descripcion: "Descripción del ticket",
  estado: "ABIERTO",                  // ABIERTO | EN_PROCESO | RESUELTO | CERRADO
  prioridad: "MEDIA",                 // BAJA | MEDIA | ALTA | URGENTE
  asignadoA: ObjectId,                // Ref: User (agente)
  notas: [
    {
      texto: "Nota del agente",
      usuario: ObjectId,              // Ref: User
      fecha: Date
    }
  ],
  fechaCreacion: Date,
  fechaActualizacion: Date,
  fechaCierre: Date                   // null hasta que se cierra
}
```

## 🔍 Índices de Base de Datos

Para optimizar las consultas:
```javascript
// Búsqueda por estado y fecha
{ estado: 1, fechaCreacion: -1 }

// Tickets asignados a un agente
{ asignadoA: 1, estado: 1 }

// Búsqueda por número de teléfono
{ phoneNumber: 1 }
```

## 🎨 Uso en el Frontend

### Cambiar a la Vista de Tickets
En el Dashboard, hay dos pestañas:
- 💬 **Chat:** Vista tradicional de conversaciones
- 🎫 **Tickets:** Sistema de gestión de tickets

### Acciones Rápidas
1. **Filtrar tickets** por estado o prioridad usando los dropdowns
2. **Ver detalles** haciendo clic en un ticket de la lista
3. **Asignar ticket** con el botón "Asignar a mí"
4. **Cambiar estado** usando el selector en el header del detalle
5. **Agregar notas** escribiendo en el campo de texto y presionando "Agregar Nota"
6. **Cerrar ticket** con el botón rojo "Cerrar"

## 📱 Actualización Automática

- Los tickets se actualizan cada **10 segundos** automáticamente
- Las estadísticas también se actualizan en tiempo real
- No es necesario recargar la página manualmente

## ✅ Ventajas del Sistema

1. **Trazabilidad:** Cada solicitud tiene un número único de seguimiento
2. **Organización:** Estados claros del ciclo de vida del ticket
3. **Priorización:** Sistema de prioridades para atender urgencias
4. **Comunicación:** Notas permiten documentar el progreso
5. **Métricas:** Estadísticas para evaluar rendimiento del equipo
6. **Automatización:** Creación automática cuando el usuario completa el registro

## 🚀 Próximas Mejoras

- [ ] Notificaciones push cuando se asigna un ticket
- [ ] Historial de cambios de estado
- [ ] Exportar tickets a CSV/Excel
- [ ] Búsqueda avanzada por placa, cédula o teléfono
- [ ] SLA (Service Level Agreement) y tiempos de respuesta
- [ ] Dashboard con gráficos y métricas avanzadas
- [ ] Plantillas de respuestas rápidas
- [ ] Etiquetas personalizadas para categorizar tickets

---

**Documentación actualizada:** Enero 2025  
**Versión:** 1.0
