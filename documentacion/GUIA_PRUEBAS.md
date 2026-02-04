# 🧪 GUÍA DE PRUEBAS - Mejoras del Sistema

## 🚀 Cómo Probar las Nuevas Funcionalidades

### 1️⃣ PREPARACIÓN

#### Iniciar el servidor backend:
```bash
cd "c:\Users\USER\Desktop\Proyecto BotWhats"
node server.js
```

El servidor debería iniciar en `http://localhost:5000`

#### Iniciar el cliente frontend (en otra terminal):
```bash
cd "c:\Users\USER\Desktop\Proyecto BotWhats\client"
npm start
```

El cliente se abrirá en `http://localhost:3000`

---

### 2️⃣ PROBAR FLUJO DE WHATSAPP (Nombre Obligatorio + Prioridad)

#### Desde WhatsApp:

1. **Enviar "hola"** al número de WhatsApp configurado

2. **Paso 1 - Nombre:**
   ```
   Bot: ¡Hola! 👋 ¡Bienvenido!
   
   📝 Para poder ayudarte, necesito que me proporciones algunos datos.
   
   *Paso 1 de 4:* ¿Cuál es tu *NOMBRE COMPLETO*?
   ```
   
   **Tú:** Juan Pérez García
   
3. **Paso 2 - Placa:**
   ```
   Bot: ✅ Gracias, *Juan Pérez García*
   
   *Paso 2 de 4:* Ahora, ingresa la *PLACA* de tu vehículo
   (Formato: ABC123):
   ```
   
   **Tú:** ABC123
   
4. **Paso 3 - Cédula:**
   ```
   Bot: ✅ Placa registrada: *ABC123*
   
   *Paso 3 de 4:* Ingresa tu *número de CÉDULA*:
   ```
   
   **Tú:** 1234567890
   
5. **Paso 4 - Prioridad:**
   ```
   Bot: ✅ Cédula registrada: *1234567890*
   
   *Paso 4 de 4:* Selecciona la *PRIORIDAD* de tu solicitud:
   
   1️⃣ - BAJA (Consulta general)
   2️⃣ - MEDIA (Asunto normal)
   3️⃣ - ALTA (Requiere pronta atención)
   4️⃣ - URGENTE (Situación crítica)
   
   Responde con el número (1, 2, 3 o 4):
   ```
   
   **Tú:** 3
   
6. **Confirmación:**
   ```
   Bot: ✅ ¡Perfecto! Tus datos han sido registrados:
   
   🎫 *Ticket: TKT-202401-00001*
   👤 Nombre: *Juan Pérez García*
   🚗 Placa: *ABC123*
   🆔 Cédula: *1234567890*
   ⚡ Prioridad: 🟠 ALTA
   📊 Este es tu ticket #1
   
   ⏳ Posición en cola: *1*
   
   Un agente te atenderá según la prioridad. ¡Gracias por tu paciencia! 🙏
   ```

#### ✅ Verificar:
- ✅ El nombre es obligatorio y se valida
- ✅ La prioridad se puede seleccionar (1-4)
- ✅ El contador de tickets se muestra (#1, #2, etc.)
- ✅ Todos los datos se guardan correctamente

---

### 3️⃣ PROBAR INTERFAZ WEB

#### Login:
1. Abrir `http://localhost:3000`
2. Iniciar sesión con un usuario agente o admin

#### Ver Tickets:
1. Ir a la pestaña "🎫 Tickets"
2. **Verificar que se muestre:**
   - ✅ Nombre del cliente en cada tarjeta
   - ✅ Badge con contador (#1, #2, #3...)
   - ✅ Prioridad con colores
   - ✅ Botones "📊 Estadísticas" y "📥 Exportar CSV"

#### Ver Detalle de Ticket:
1. Clic en cualquier ticket
2. **Verificar campos:**
   - ✅ 👤 Nombre Cliente
   - ✅ 📊 Ticket del Cliente: #X
   - ✅ 🔥 Prioridad
   - ✅ ⏱️ Tiempo Resolución (si está cerrado)
   - ✅ ✅ Cerrado por (si está cerrado)

---

### 4️⃣ PROBAR ESTADÍSTICAS DE AGENTES

1. En la sección de Tickets, clic en **"📊 Estadísticas"**

2. **Debería mostrar:**
   ```
   📊 ESTADÍSTICAS DE AGENTES
   
   1. Nombre del Agente
      📧 email@example.com
      📊 Total asignados: X
      ⏳ Pendientes: X
      ⚙️ En proceso: X
      ✅ Cerrados: X
      ⏱️ Tiempo promedio: Xh Xmin
      📈 Tasa de cierre: X%
   
   🌐 Promedio global: Xh Xmin
   ```

#### ✅ Verificar:
- ✅ Muestra todos los agentes
- ✅ Tiempo promedio calculado correctamente
- ✅ Estadísticas actualizadas

---

### 5️⃣ PROBAR EXPORTACIÓN CSV

1. En la sección de Tickets, clic en **"📥 Exportar CSV"**

2. **El archivo debe contener columnas:**
   - Número Ticket
   - Fecha Creación
   - **Cliente** ⭐
   - Teléfono
   - Placa
   - Cédula
   - Descripción
   - Estado
   - Prioridad
   - Agente Asignado
   - **Contador Tickets Cliente** ⭐
   - Fecha Cierre
   - **Tiempo Resolución (min)** ⭐
   - Cerrado Por

3. **Abrir en Excel o LibreOffice**

#### ✅ Verificar:
- ✅ Se descarga correctamente
- ✅ Todas las columnas presentes
- ✅ Compatible con Excel (UTF-8 BOM)
- ✅ Datos completos y correctos

---

### 6️⃣ PROBAR PREVENCIÓN DE ASIGNACIÓN DE TICKETS CERRADOS

#### Cerrar un ticket:
1. Asignar un ticket a tu usuario
2. Abrir el detalle del ticket
3. Clic en "✅ Cerrar Ticket"
4. Confirmar

#### Intentar reasignar:
1. En el backend, intentar asignar ese ticket cerrado vía API
2. **Debería retornar error 400:**
   ```json
   {
     "error": "No se puede asignar un ticket cerrado",
     "message": "Este ticket ya fue cerrado y no puede ser reasignado"
   }
   ```

#### ✅ Verificar:
- ✅ Tickets cerrados no se pueden reasignar
- ✅ Mensaje de error claro
- ✅ Estado protegido

---

### 7️⃣ PROBAR CÁLCULO DE TIEMPO DE RESOLUCIÓN

#### Crear y cerrar un ticket:
1. Crear un nuevo ticket (vía WhatsApp o manual)
2. Asignar a un agente
3. Esperar algunos minutos
4. Cerrar el ticket

#### Verificar tiempo:
1. Ver el detalle del ticket cerrado
2. **Debería mostrar:**
   - ⏱️ Tiempo Resolución: Xh Xmin
   - ✅ Cerrado por: [Nombre del agente]

3. El tiempo debe ser la diferencia entre `fechaCreacion` y `fechaCierre`

#### ✅ Verificar:
- ✅ Tiempo calculado automáticamente
- ✅ Formato legible (horas y minutos)
- ✅ Se guarda el agente que cerró

---

## 🧪 PRUEBAS CON DATOS DE PRUEBA

### Crear múltiples tickets para un cliente:

```bash
# Desde WhatsApp, crear 3 tickets con el mismo teléfono
# pero diferentes nombres (para probar contador)

Ticket 1:
- Nombre: Juan Pérez
- Teléfono: +57300XXXXXXX
- Contador esperado: #1

Ticket 2:
- Nombre: Juan Pérez
- Teléfono: +57300XXXXXXX (mismo número)
- Contador esperado: #2

Ticket 3:
- Nombre: Juan Pérez
- Teléfono: +57300XXXXXXX (mismo número)
- Contador esperado: #3
```

---

## 🔍 VERIFICAR VALIDACIONES

### Nombre inválido:
```
Bot: ¿Cuál es tu NOMBRE COMPLETO?
Tú: ab
Bot: ❌ El nombre debe tener al menos 3 caracteres.
```

### Placa inválida:
```
Bot: Ingresa la PLACA de tu vehículo
Tú: 123ABC
Bot: ❌ La placa no es válida. El formato debe ser: 3 letras + 3 números
```

### Cédula inválida:
```
Bot: Ingresa tu número de CÉDULA
Tú: 123
Bot: ❌ La cédula ingresada no es válida. Debe tener entre 6 y 10 dígitos.
```

### Prioridad inválida:
```
Bot: Selecciona la PRIORIDAD (1, 2, 3 o 4)
Tú: 5
Bot: ❌ Opción no válida. Por favor, responde con un número del 1 al 4
```

---

## ✅ CHECKLIST DE FUNCIONALIDADES

- [ ] Nombre obligatorio solicitado en chat
- [ ] Validación de nombre (mínimo 3 caracteres)
- [ ] Selección de prioridad (4 opciones)
- [ ] Contador de tickets incrementa correctamente
- [ ] Interfaz web muestra nombre del cliente
- [ ] Badge de contador visible
- [ ] Botón de estadísticas funciona
- [ ] Estadísticas muestran tiempo promedio
- [ ] Botón de exportar CSV funciona
- [ ] CSV contiene todas las columnas
- [ ] No se pueden asignar tickets cerrados
- [ ] Tiempo de resolución se calcula automáticamente
- [ ] Campo "Cerrado por" se guarda correctamente

---

## 📞 SOPORTE

Si encuentras algún problema:

1. Verificar que el servidor esté corriendo
2. Verificar que MongoDB esté activo
3. Revisar logs de consola
4. Verificar configuración de WhatsApp Cloud API

---

## 🎉 ¡Listo para Producción!

Si todas las pruebas pasan, el sistema está listo para usar en producción. 🚀
