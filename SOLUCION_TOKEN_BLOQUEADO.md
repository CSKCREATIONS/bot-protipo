# 🔧 Solución: Token de WhatsApp Bloqueado

## ❌ Error Detectado

```
Error: API access blocked
Type: OAuthException
Code: 200
```

Este error indica que el **token de acceso de WhatsApp Business API** está bloqueado, expirado o no tiene los permisos necesarios.

---

## 🚀 Solución Paso a Paso

### 1️⃣ Generar Nuevo Token

1. Accede a **Meta for Developers**: https://developers.facebook.com/
2. Ve a tu aplicación de WhatsApp Business
3. En el menú lateral, selecciona **WhatsApp** > **API Setup**
4. Busca la sección **"Temporary access token"** o **"Permanent access token"**
5. Copia el nuevo token (debe empezar con `EAAA...`)

### 2️⃣ Actualizar el Token en tu Proyecto

Edita el archivo `.env` en la raíz del proyecto:

```bash
WHATSAPP_TOKEN=TU_NUEVO_TOKEN_AQUI
```

**Importante:** Reemplaza TODO el token anterior con el nuevo.

### 3️⃣ Reiniciar el Servidor

En la terminal donde corre el servidor:

1. Presiona `Ctrl + C` para detener el servidor
2. Ejecuta nuevamente:
   ```bash
   node server.js
   ```

---

## 🔍 Verificar Permisos de la App

Tu aplicación de Meta debe tener estos permisos:

- ✅ `whatsapp_business_messaging`
- ✅ `whatsapp_business_management`

### Cómo verificar:

1. En Meta for Developers, ve a tu app
2. Menú lateral > **App Settings** > **Basic**
3. Baja hasta **"Products"**
4. Verifica que **WhatsApp** esté agregado
5. En **WhatsApp** > **Configuration**, verifica los permisos

---

## 🔄 Crear Token Permanente (Recomendado)

Los tokens temporales expiran cada 24-72 horas. Para producción, usa un **token permanente**:

### Pasos:

1. En Meta for Developers, ve a **Business Settings**
2. Ve a **System Users** (Usuarios del Sistema)
3. Crea o selecciona un System User
4. Genera un token con estos scopes:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. **Guarda este token en lugar seguro** (nunca expira)
6. Actualiza tu `.env` con este token permanente

---

## 🧪 Probar la Conexión

Después de actualizar el token, prueba enviando un mensaje de WhatsApp al bot. Deberías ver en los logs:

```
✅ Conectado a MongoDB
🚀 Servidor corriendo en puerto 5000
📱 Mensaje recibido de +57XXXXXXXXXX
✅ Mensaje procesado correctamente
```

---

## ⚠️ Problemas Comunes

### 1. "Token sigue sin funcionar"
- Verifica que copiaste el token completo (sin espacios)
- Asegúrate de reiniciar el servidor
- Verifica que el archivo `.env` se guardó correctamente

### 2. "No veo la opción de generar token"
- Tu número de WhatsApp Business debe estar verificado
- Tu app debe estar en modo de producción o desarrollo activo

### 3. "El token expira muy rápido"
- Usa un token de System User (permanente)
- No uses tokens temporales para producción

---

## 📞 Estado Actual del Sistema

Con el token bloqueado, el sistema continúa funcionando pero con limitaciones:

✅ **Funciona:**
- Recibir mensajes de texto
- Enviar respuestas automáticas
- Crear tickets
- Gestión de agentes

❌ **No funciona:**
- Descargar imágenes/videos/audios/documentos
- Ver archivos adjuntos en tickets
- Procesar multimedia

**Prioridad:** 🔴 **ALTA** - Debe solucionarse para funcionalidad completa

---

## 📋 Checklist de Solución

- [ ] Generar nuevo token en Meta for Developers
- [ ] Actualizar WHATSAPP_TOKEN en archivo .env
- [ ] Reiniciar el servidor (Ctrl+C y node server.js)
- [ ] Enviar mensaje de prueba al bot
- [ ] Verificar en logs que no hay errores de OAuthException
- [ ] (Opcional) Configurar token permanente para producción

---

## 🆘 Contacto de Soporte

Si después de seguir estos pasos el problema persiste:

1. Verifica que tu cuenta de Meta Business esté activa
2. Confirma que tu número de WhatsApp esté verificado
3. Revisa el **Business Verification Status** en Meta Business Suite
4. Contacta al soporte de Meta for Developers si es necesario

---

**Última actualización:** 2 de febrero de 2026
