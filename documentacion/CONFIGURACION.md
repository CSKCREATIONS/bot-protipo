# 📋 Guía de Configuración del Chatbot de WhatsApp

## Paso 1: Configurar WhatsApp Business API

### 1.1 Crear una cuenta de desarrollador de Meta
1. Ve a https://developers.facebook.com/
2. Crea una cuenta o inicia sesión
3. Ve al panel de aplicaciones

### 1.2 Crear una nueva aplicación
1. Haz clic en "Create App" (Crear aplicación)
2. Selecciona "Business" como tipo
3. Completa los detalles de la aplicación
4. Haz clic en "Create App"

### 1.3 Agregar el producto WhatsApp
1. En el panel de tu aplicación, busca "WhatsApp"
2. Haz clic en "Set Up" (Configurar)
3. Selecciona o crea una cuenta de WhatsApp Business

### 1.4 Obtener las credenciales
1. **Token de acceso temporal:**
   - En la sección de configuración de WhatsApp
   - Copia el "Temporary access token"
   
2. **Phone Number ID:**
   - En la sección "From", encontrarás el "Phone number ID"
   - Copia este ID

3. **WhatsApp Business Account ID:**
   - Lo encontrarás en la parte superior de la configuración

## Paso 2: Configurar el Webhook

### 2.1 Exponer tu servidor localmente (Desarrollo)
```bash
# Instalar ngrok
npm install -g ngrok

# Iniciar ngrok en el puerto 5000
ngrok http 5000
```

Copia la URL HTTPS que te proporciona ngrok (ej: https://abc123.ngrok.io)

### 2.2 Configurar el webhook en Meta
1. Ve a "Configuration" en la sección de WhatsApp
2. Haz clic en "Edit" en la sección Webhook
3. Configura:
   - **Callback URL:** `https://tu-url-ngrok.io/api/webhook`
   - **Verify Token:** Crea un token secreto (ej: "mi_token_secreto_123")
4. Haz clic en "Verify and Save"

### 2.3 Suscribirse a los mensajes
1. En la sección "Webhook fields"
2. Suscríbete a:
   - ✅ messages
   - ✅ message_status (opcional)

## Paso 3: Configurar las Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# MongoDB - Opción 1: Local
MONGODB_URI=mongodb://localhost:27017/whatsapp-chatbot

# MongoDB - Opción 2: MongoDB Atlas (Recomendado)
# MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/whatsapp-chatbot

# JWT Secret (genera uno aleatorio seguro)
JWT_SECRET=tu_clave_secreta_jwt_muy_segura_12345

# WhatsApp API Meta Cloud
WHATSAPP_TOKEN=tu_token_de_acceso_temporal
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_VERIFY_TOKEN=mi_token_secreto_123

# Server
PORT=5000
NODE_ENV=development
```

## Paso 4: Configurar MongoDB

### Opción A: MongoDB Local
```bash
# Windows - Descargar e instalar desde:
https://www.mongodb.com/try/download/community

# Iniciar MongoDB
mongod
```

### Opción B: MongoDB Atlas (Nube - Recomendado)
1. Ve a https://www.mongodb.com/cloud/atlas
2. Crea una cuenta gratuita
3. Crea un cluster gratis
4. En "Database Access", crea un usuario con contraseña
5. En "Network Access", agrega tu IP (o 0.0.0.0/0 para desarrollo)
6. Haz clic en "Connect" → "Connect your application"
7. Copia la cadena de conexión y reemplázala en `.env`

## Paso 5: Instalar Dependencias

```bash
# Backend
npm install

# Frontend
cd client
npm install
cd ..
```

## Paso 6: Iniciar el Proyecto

### Terminal 1 - Backend
```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en puerto 5000
✅ Conectado a MongoDB
```

### Terminal 2 - Frontend
```bash
cd client
npm start
```

El navegador se abrirá automáticamente en http://localhost:3000

## Paso 7: Registrar un Usuario

1. Abre http://localhost:3000
2. Haz clic en "Registrarse"
3. Completa el formulario:
   - Usuario: admin
   - Email: admin@ejemplo.com
   - Contraseña: tu_password
4. Haz clic en "Registrarse"

## Paso 8: Probar el Bot

### 8.1 Agregar un número de prueba
1. En Meta Developers, ve a "API Setup"
2. En "To", agrega un número de teléfono para pruebas
3. Verifica el número con el código que recibirás

### 8.2 Enviar mensaje de prueba
1. Desde tu WhatsApp, envía un mensaje al número de prueba de Meta
2. El mensaje debería aparecer en el panel del chatbot
3. Responde desde el panel
4. Deberías recibir la respuesta en WhatsApp

## 🔧 Solución de Problemas

### El webhook no se verifica
- Verifica que ngrok esté corriendo
- Asegúrate de que el WHATSAPP_VERIFY_TOKEN en `.env` coincida con el configurado en Meta
- Revisa que la URL del webhook termine en `/api/webhook`

### No se conecta a MongoDB
- Verifica que MongoDB esté corriendo (local)
- Revisa la cadena de conexión en `.env`
- Para Atlas, verifica que tu IP esté en la whitelist

### No se reciben mensajes
- Verifica que el webhook esté suscrito a "messages"
- Revisa los logs del servidor
- Asegúrate de que el token de WhatsApp no haya expirado

### Error de autenticación en el frontend
- Verifica que el backend esté corriendo
- Revisa que la URL de la API sea correcta
- Abre la consola del navegador para ver errores

## 📱 Números de Teléfono

### Desarrollo
- Solo puedes enviar mensajes a números que hayas agregado como teléfonos de prueba
- Máximo 5 números de prueba

### Producción
- Para enviar mensajes a cualquier número, necesitas:
  1. Verificar tu cuenta de negocio en Meta
  2. Pasar la revisión de la aplicación
  3. Usar un número de teléfono de negocio verificado

## 🚀 Desplegar en Producción

### Backend (Railway / Render / Heroku)
1. Crea una cuenta en la plataforma
2. Conecta tu repositorio Git
3. Configura las variables de entorno
4. Despliega
5. Actualiza la URL del webhook en Meta con la URL de producción

### Frontend (Vercel / Netlify)
1. Construye el proyecto: `cd client && npm run build`
2. Sube la carpeta `build` a la plataforma
3. Configura la variable `REACT_APP_API_URL` con la URL de tu backend

## 📚 Recursos Adicionales

- [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [MongoDB Atlas Tutorial](https://www.mongodb.com/docs/atlas/getting-started/)
- [Ngrok Documentation](https://ngrok.com/docs)

---

¡Listo! Tu chatbot de WhatsApp debería estar funcionando correctamente. 🎉
