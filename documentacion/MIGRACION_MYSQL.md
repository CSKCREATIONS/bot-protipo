# Guía de Migración de MongoDB a MySQL

## ✅ Cambios Realizados

### 1. Dependencias instaladas
- `sequelize` - ORM para MySQL
- `mysql2` - Driver de MySQL para Node.js

### 2. Archivos nuevos creados
- `config/database.js` - Configuración de conexión a MySQL
- `models/index.js` - Índice de modelos con relaciones y función de sincronización
- `scripts/migrarMongoDB_a_MySQL.js` - Script de migración de datos

### 3. Archivos modificados
- `models/User.js` - Convertido a Sequelize
- `models/Conversation.js` - Convertido a Sequelize
- `models/Message.js` - Convertido a Sequelize
- `models/Ticket.js` - Convertido a Sequelize
- `server.js` - Actualizado para usar Sequelize en lugar de Mongoose

## 📋 Pasos para completar la migración

### Paso 1: Instalar MySQL

Si aún no tienes MySQL instalado:

**Windows:**
1. Descarga MySQL desde https://dev.mysql.com/downloads/installer/
2. Instala MySQL Server y MySQL Workbench
3. Durante la instalación, configura la contraseña root

**Verificar instalación:**
```bash
mysql --version
```

### Paso 2: Crear base de datos

Abre MySQL desde la terminal o MySQL Workbench:

```bash
mysql -u root -p
```

Crea la base de datos:

```sql
CREATE DATABASE whatsapp_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Paso 3: Configurar variables de entorno

Edita tu archivo `.env` y agrega las variables de MySQL:

```env
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=whatsapp_bot
MYSQL_USER=root
MYSQL_PASSWORD=tu_password_mysql
```

### Paso 4: Ejecutar migración de datos

**IMPORTANTE:** Antes de migrar, haz un backup de tu base de datos MongoDB:

```bash
mongodump --db whatsapp-chatbot --out ./backup_mongo
```

Ejecuta el script de migración:

```bash
node scripts/migrarMongoDB_a_MySQL.js
```

Este script:
- Conecta a MongoDB y MySQL
- Crea las tablas en MySQL
- Migra todos los usuarios, conversaciones, mensajes y tickets
- Mantiene las relaciones entre registros
- Muestra el progreso en consola

### Paso 5: Actualizar rutas y controladores

Debes actualizar el código en tus rutas para usar la sintaxis de Sequelize:

**Cambios principales:**

**Antes (Mongoose):**
```javascript
const user = await User.findOne({ email });
const users = await User.find({ role: 'agent' });
const ticket = await Ticket.findById(id).populate('asignadoA');
await ticket.save();
```

**Después (Sequelize):**
```javascript
const user = await User.findOne({ where: { email } });
const users = await User.findAll({ where: { role: 'agent' } });
const ticket = await Ticket.findByPk(id, { include: [{ model: User, as: 'agente' }] });
await ticket.save();
```

### Paso 6: Probar la aplicación

1. Inicia el servidor:
```bash
npm start
```

2. Verifica que veas estos mensajes:
```
✅ Conexión a MySQL establecida correctamente
✅ Tablas sincronizadas (actualizadas)
🚀 Servidor corriendo en puerto 5000
```

3. Prueba los endpoints principales:
   - Login
   - Crear ticket
   - Listar conversaciones
   - Enviar mensajes

### Paso 7: (Opcional) Remover MongoDB

Una vez que verifiques que todo funciona correctamente:

1. Desinstala mongoose:
```bash
npm uninstall mongoose
```

2. Elimina la variable `MONGODB_URI` del `.env`

3. Elimina los backups de MongoDB si no los necesitas

## 🔄 Diferencias clave entre Mongoose y Sequelize

| Operación | Mongoose | Sequelize |
|-----------|----------|-----------|
| Buscar uno | `Model.findOne({ field })` | `Model.findOne({ where: { field } })` |
| Buscar por ID | `Model.findById(id)` | `Model.findByPk(id)` |
| Buscar todos | `Model.find({ field })` | `Model.findAll({ where: { field } })` |
| Crear | `Model.create(data)` | `Model.create(data)` |
| Actualizar | `doc.save()` | `doc.save()` o `Model.update()` |
| Eliminar | `Model.deleteOne()` | `Model.destroy()` |
| Populate | `.populate('field')` | `{ include: [Model] }` |
| Sort | `.sort({ field: -1 })` | `{ order: [['field', 'DESC']] }` |
| Limit | `.limit(10)` | `{ limit: 10 }` |

## 🚨 Consideraciones importantes

1. **IDs**: MongoDB usa ObjectIds (strings), MySQL usa integers autoincrement
2. **Subdocumentos**: En MySQL no hay subdocumentos, debes crear tablas relacionadas
3. **Arrays**: Campos como `notas` se almacenan como JSON/TEXT en MySQL
4. **Índices**: Se definen en el modelo con la opción `indexes`
5. **Timestamps**: Sequelize automáticamente agrega `createdAt` y `updatedAt`

## 📝 Tareas pendientes

Después de la migración básica, debes:

- [ ] Actualizar todas las rutas (`routes/*.js`) para usar sintaxis Sequelize
- [ ] Actualizar el middleware de autenticación (`middleware/auth.js`)
- [ ] Probar todos los endpoints de la API
- [ ] Actualizar `seed.js` si lo usas para datos de prueba
- [ ] Revisar y actualizar cualquier script adicional
- [ ] Actualizar documentación del proyecto

## ❓ Solución de problemas

**Error: ECONNREFUSED MySQL**
- Verifica que MySQL esté corriendo: `sudo service mysql status` (Linux) o busca el servicio en Windows
- Verifica host, puerto y credenciales en `.env`

**Error: SequelizeDatabaseError**
- Verifica que la base de datos exista
- Revisa los permisos del usuario MySQL

**Error al migrar datos**
- Verifica que MongoDB esté corriendo
- Revisa que las credenciales de ambas bases de datos sean correctas
- Revisa los logs para identificar qué registro causa el error

## 🆘 Soporte

Si encuentras algún error:
1. Revisa los logs en consola
2. Verifica que todas las dependencias estén instaladas
3. Asegúrate de que tanto MySQL como tu aplicación puedan conectarse
4. Revisa la documentación de Sequelize: https://sequelize.org/docs/v6/

¡Buena suerte con la migración! 🚀
