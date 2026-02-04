# 🚀 Guía Rápida: Configurar MySQL con phpMyAdmin

## Paso 1: Iniciar XAMPP/WAMP

1. Abre el **Panel de Control de XAMPP** (o WAMP)
2. Inicia los servicios:
   - ✅ **Apache** 
   - ✅ **MySQL**

## Paso 2: Acceder a phpMyAdmin

1. Abre tu navegador
2. Ve a: `http://localhost/phpmyadmin`
3. Usuario: `root`
4. Contraseña: (dejar vacío por defecto)

## Paso 3: Importar la base de datos

### Opción A: Importar archivo SQL (Recomendado)

1. En phpMyAdmin, haz clic en la pestaña **"Importar"**
2. Haz clic en **"Seleccionar archivo"**
3. Busca y selecciona: `database_mysql.sql`
4. Haz clic en **"Continuar"** al final de la página
5. ✅ ¡Listo! La base de datos `whatsapp_bot` ha sido creada

### Opción B: Crear manualmente

1. Haz clic en **"Nueva"** en el panel izquierdo
2. Nombre: `whatsapp_bot`
3. Cotejamiento: `utf8mb4_unicode_ci`
4. Haz clic en **"Crear"**
5. Ve a la pestaña **SQL**
6. Copia y pega el contenido de `database_mysql.sql`
7. Haz clic en **"Continuar"**

## Paso 4: Verificar tablas creadas

Debes ver estas tablas en `whatsapp_bot`:
- ✅ `users` (usuarios)
- ✅ `conversations` (conversaciones)
- ✅ `messages` (mensajes)
- ✅ `tickets` (tickets)

## Paso 5: Verificar usuario admin

1. Haz clic en la tabla `users`
2. Verás el usuario admin creado:
   - Username: `admin`
   - Email: `admin@whatsapp.com`
   - Password: `admin123` (hasheado)

## Paso 6: Configurar proyecto

1. **Copia el archivo de configuración:**
   ```bash
   copy .env.mysql .env
   ```

2. **Edita `.env` si es necesario:**
   - Si tu MySQL tiene contraseña, agrégala en `MYSQL_PASSWORD`
   - El puerto por defecto es `3306`
   - Usuario por defecto es `root`

## Paso 7: Migrar datos de MongoDB (Opcional)

Si tienes datos en MongoDB y quieres migrarlos:

```bash
node scripts/migrarMongoDB_a_MySQL.js
```

## Paso 8: Iniciar el servidor

```bash
npm start
```

Deberías ver:
```
✅ Conexión a MySQL establecida correctamente
✅ Tablas sincronizadas (actualizadas)
🚀 Servidor corriendo en puerto 5000
```

## 🧪 Probar la conexión

### Prueba desde el navegador:
```
http://localhost:5000
```

Deberías ver:
```json
{
  "message": "WhatsApp Chatbot API funcionando correctamente"
}
```

### Prueba el login:

**POST** `http://localhost:5000/api/auth/login`

Body (JSON):
```json
{
  "email": "admin@whatsapp.com",
  "password": "admin123"
}
```

Respuesta esperada:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@whatsapp.com",
    "role": "admin"
  }
}
```

## ⚙️ Configuración típica de XAMPP

| Configuración | Valor |
|---------------|-------|
| Host | `localhost` |
| Puerto MySQL | `3306` |
| Usuario | `root` |
| Contraseña | *(vacío)* |
| phpMyAdmin | `http://localhost/phpmyadmin` |

## 🔧 Solución de problemas

### Error: "Cannot connect to MySQL"

1. Verifica que MySQL esté corriendo en XAMPP
2. Revisa que el puerto sea `3306`
3. Verifica usuario y contraseña en `.env`

### Error: "Database does not exist"

1. Importa el archivo `database_mysql.sql` en phpMyAdmin
2. O crea la base de datos manualmente

### Error: "Access denied for user 'root'"

1. Verifica la contraseña de MySQL
2. Si configuraste contraseña, agrégala en `.env`:
   ```
   MYSQL_PASSWORD=tu_contraseña
   ```

### Las tablas no se crean automáticamente

Por defecto, Sequelize creará/actualizará las tablas automáticamente. Si prefieres tener control total, importa primero el archivo SQL.

## 📊 Consultas útiles en phpMyAdmin

### Ver todos los usuarios:
```sql
SELECT id, username, email, role, createdAt FROM users;
```

### Ver tickets pendientes:
```sql
SELECT numeroTicket, nombreCliente, estado, prioridad, createdAt 
FROM tickets 
WHERE estado = 'PENDIENTE' 
ORDER BY createdAt DESC;
```

### Ver conversaciones activas:
```sql
SELECT phoneNumber, name, estado, lastMessage, lastMessageTime 
FROM conversations 
WHERE status = 'active' 
ORDER BY lastMessageTime DESC;
```

### Ver mensajes de una conversación:
```sql
SELECT `from`, `to`, message, direction, timestamp 
FROM messages 
WHERE conversationId = 1 
ORDER BY timestamp DESC;
```

## ✅ ¡Todo listo!

Tu aplicación ahora está usando MySQL en lugar de MongoDB. Puedes:
- Ver y editar datos directamente en phpMyAdmin
- Hacer backups fácilmente (Exportar → SQL)
- Usar las ventajas de las bases de datos relacionales
- Ejecutar consultas SQL directamente

---

**💡 Tip:** Haz un backup de tu base de datos regularmente desde phpMyAdmin → Exportar
