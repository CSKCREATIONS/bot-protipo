# Cambios en Sistema de Estados de Tickets

## Fecha: 28 de Enero, 2026

## 🎯 Objetivos Implementados

### 1. Creación de Ticket con Placa y Cédula
- **Antes**: El ticket se creaba inmediatamente cuando un usuario nuevo escribía por primera vez
- **Ahora**: El ticket se crea **solo cuando se han recopilado ambos datos**: placa y cédula

### 2. Nuevos Estados de Ticket
Se simplificaron los estados del sistema a 3 estados principales:

| Estado Anterior | Estado Nuevo | Descripción |
|----------------|--------------|-------------|
| ABIERTO | **PENDIENTE** | Ticket creado, esperando asignación |
| EN_PROCESO | **ASIGNADO** | Ticket asignado a un agente |
| RESUELTO | *Eliminado* | Ya no se usa |
| CERRADO | **CERRADO** | Ticket cerrado y finalizado |

---

## 📝 Cambios por Archivo

### Backend

#### 1. `routes/webhook.js`
**Cambios en el flujo de registro:**

```javascript
// Estado INICIO
- Ya NO crea ticket inmediatamente
- Solo saluda y solicita placa

// Estado ESPERANDO_CEDULA
+ CREA el ticket cuando se valida la cédula
+ Incluye placa y cédula en el ticket
+ Estado inicial: PENDIENTE
```

**Flujo actualizado:**
1. Usuario escribe → Estado `INICIO`
2. Bot solicita placa → Estado `ESPERANDO_PLACA`
3. Usuario da placa válida → Estado `ESPERANDO_CEDULA`
4. Usuario da cédula válida → **Se crea ticket** → Estado `EN_COLA`

#### 2. `models/Ticket.js`
```javascript
estado: {
  enum: ['PENDIENTE', 'ASIGNADO', 'CERRADO'],
  default: 'PENDIENTE'
}
```

#### 3. `routes/tickets.js`

**Endpoint `/tickets/:id/asignar`:**
```javascript
// Cambio de estado al asignar
if (ticket.estado === 'PENDIENTE') {
  ticket.estado = 'ASIGNADO';
}
```

**Endpoint `/tickets/stats/resumen`:**
```javascript
{
  pendientes: await Ticket.countDocuments({ estado: 'PENDIENTE' }),
  asignados: await Ticket.countDocuments({ estado: 'ASIGNADO' }),
  cerrados: await Ticket.countDocuments({ estado: 'CERRADO' }),
  misTickets: await Ticket.countDocuments({ 
    asignadoA: req.user._id, 
    estado: { $in: ['PENDIENTE', 'ASIGNADO'] } 
  })
}
```

### Frontend

#### 4. `client/src/components/Tickets.js`

**Filtros actualizados:**
```javascript
<option value="PENDIENTE">Pendiente</option>
<option value="ASIGNADO">Asignado</option>
<option value="CERRADO">Cerrado</option>
```

**Estadísticas actualizadas:**
```javascript
- Abiertos → Pendientes
- En Proceso → Asignados
- Resueltos → Cerrados
```

**Selector de estado:**
```javascript
<select>
  <option value="PENDIENTE">Pendiente</option>
  <option value="ASIGNADO">Asignado</option>
</select>
```

#### 5. `client/src/components/Tickets.css`

**Nuevos estilos de badges:**
```css
.badge-estado.pendiente {
  background: #fff3e0;
  color: #e65100;
}

.badge-estado.asignado {
  background: #e3f2fd;
  color: #1565c0;
}

.badge-estado.cerrado {
  background: #f5f5f5;
  color: #616161;
}
```

---

## 🔄 Flujo Completo del Sistema

### Flujo de Usuario (WhatsApp)

```
1. Usuario escribe por primera vez
   ↓
2. Sistema: "¡Hola! Proporciona tu PLACA"
   ↓
3. Usuario: "ABC123"
   ↓
4. Sistema: "✅ Placa registrada. Ahora tu CÉDULA"
   ↓
5. Usuario: "1234567890"
   ↓
6. Sistema: "✅ Datos registrados
            🎫 Ticket: TKT-202601-00001
            🚗 Placa: ABC123
            🆔 Cédula: 1234567890
            ⏳ Posición en cola: 1"
   ↓
7. TICKET CREADO con estado PENDIENTE
```

### Flujo de Agente (Dashboard)

```
1. Agente ve ticket con estado PENDIENTE
   ↓
2. Agente hace clic en "Asignar a mí"
   ↓
3. Sistema verifica si está bloqueado
   ↓
4. Si está libre:
   - Estado cambia a ASIGNADO
   - Se bloquea por 15 minutos
   - Cliente recibe mensaje de WhatsApp
   ↓
5. Agente resuelve el caso
   ↓
6. Agente hace clic en "Cerrar Ticket"
   ↓
7. Estado cambia a CERRADO
```

---

## ✅ Ventajas del Nuevo Sistema

1. **Tickets más completos**: Todos los tickets tienen placa y cédula antes de crearse
2. **Estados más claros**: Solo 3 estados fáciles de entender
3. **Mejor flujo**: Los agentes saben exactamente qué tickets pueden tomar
4. **Sin datos incompletos**: No hay tickets sin información básica

---

## 🚀 Para Probar los Cambios

### Backend:
```bash
cd "C:\Users\USER\Desktop\Proyecto BotWhats"
npm start
```

### Frontend:
```bash
cd "C:\Users\USER\Desktop\Proyecto BotWhats\client"
npm start
```

### Prueba en WhatsApp:
1. Escribe un mensaje al número configurado
2. Proporciona placa en formato ABC123
3. Proporciona cédula de 6-10 dígitos
4. Verifica que se crea el ticket con ambos datos

### Prueba en Dashboard:
1. Ve a http://localhost:3000
2. Inicia sesión
3. Ve a sección "Tickets"
4. Verifica que aparezcan estados: Pendiente, Asignado, Cerrado
5. Intenta asignar un ticket

---

## 📊 Base de Datos

**Migración de datos existentes:**

Si tienes tickets antiguos con estados anteriores, ejecuta en MongoDB:

```javascript
// Actualizar estados antiguos
db.tickets.updateMany(
  { estado: "ABIERTO" },
  { $set: { estado: "PENDIENTE" } }
)

db.tickets.updateMany(
  { estado: "EN_PROCESO" },
  { $set: { estado: "ASIGNADO" } }
)

db.tickets.updateMany(
  { estado: "RESUELTO" },
  { $set: { estado: "CERRADO" } }
)
```

---

## ⚠️ Notas Importantes

1. Los tickets existentes pueden necesitar actualización manual de estados
2. El sistema de bloqueo de tickets (15 minutos) sigue activo
3. Los mensajes de WhatsApp se envían automáticamente al asignar tickets
4. La cola sigue funcionando con posiciones automáticas

---

## 🔧 Archivos Modificados

- ✅ `routes/webhook.js` - Flujo de creación de tickets
- ✅ `models/Ticket.js` - Estados del modelo
- ✅ `routes/tickets.js` - Endpoints y estadísticas
- ✅ `client/src/components/Tickets.js` - Componente de tickets
- ✅ `client/src/components/Tickets.css` - Estilos de estados

---

**Implementación completada el 28 de Enero, 2026**
