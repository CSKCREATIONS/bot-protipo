# 🚀 Inicio Rápido

## 1. Instalar Dependencias

### Backend
```bash
npm install
```

### Frontend
```bash
cd client
npm install
cd ..
```

## 2. Configurar Variables de Entorno

Edita el archivo `.env` con tus credenciales de WhatsApp API y MongoDB.

## 3. Iniciar MongoDB

Si usas MongoDB local:
```bash
mongod
```

Si usas MongoDB Atlas, asegúrate de tener la URL de conexión correcta en `.env`.

## 4. Iniciar el Backend

En una terminal:
```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor corriendo en puerto 5000
✅ Conectado a MongoDB
```

## 5. Iniciar el Frontend

En otra terminal:
```bash
cd client
npm start
```

El navegador se abrirá automáticamente en http://localhost:3000

## 6. Registrar un Usuario

1. Abre http://localhost:3000
2. Haz clic en "Registrarse"
3. Completa el formulario
4. Inicia sesión

---

Para configurar el webhook de WhatsApp y más detalles, consulta [CONFIGURACION.md](CONFIGURACION.md)
