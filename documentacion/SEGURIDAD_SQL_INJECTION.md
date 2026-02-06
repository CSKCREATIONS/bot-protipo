# Medidas de Seguridad contra Inyecciones SQL

Este documento describe todas las medidas de seguridad implementadas para proteger la aplicación contra inyecciones SQL y otras vulnerabilidades relacionadas.

## 📋 Resumen de Cambios

Se han implementado múltiples capas de seguridad en toda la aplicación para prevenir inyecciones SQL, XSS y otros ataques comunes:

### 1. **Dependencias Instaladas**

#### Backend
- `express-validator`: Validación y sanitización de datos de entrada
- `validator`: Utilidades adicionales de validación

#### Frontend
- `dompurify`: Sanitización de HTML para prevenir XSS

### 2. **Nuevos Archivos Creados**

#### `utils/sanitizer.js`
Módulo de utilidades para sanitización y validación de datos con las siguientes funciones:

- **sanitizeText()**: Escapa caracteres HTML y elimina espacios
- **sanitizeEmail()**: Normaliza y sanitiza emails
- **isValidEmail()**: Valida formato de email
- **isValidUsername()**: Valida formato de username (alfanuméricos, guiones, 3-50 caracteres)
- **validatePassword()**: Valida fortaleza de contraseña (6-128 caracteres)
- **limitLength()**: Limita longitud de texto
- **removeSQLPatterns()**: Elimina patrones comunes de inyección SQL

## 🛡️ Capas de Protección

### Capa 1: Frontend (Login.jsx)

**Validaciones del lado del cliente:**

```javascript
// Sanitización en tiempo real de inputs
const sanitizeInput = (input) => {
  // 1. Trim espacios
  // 2. Sanitizar HTML/XSS con DOMPurify
  // 3. Remover patrones SQL peligrosos
  // 4. Return texto limpio
}
```

**Patrones SQL bloqueados:**
- Comillas simples y escapadas: `'`, `%27`
- Comentarios SQL: `--`, `#`, `%23`
- Operadores de igualdad con inyección: `=...;`
- Keywords SQL: `UNION SELECT`, `INSERT INTO`, `DELETE FROM`, `DROP TABLE`, `UPDATE SET`
- Tags peligrosos: `<script>`, `<iframe>`

**Validaciones implementadas:**
- Email: Formato válido usando regex
- Username: Solo alfanuméricos, guiones bajos y guiones medios (3-50 caracteres)
- Password: Longitud entre 6-128 caracteres
- Límites de longitud: Username (50), Email (255), Password (128)

### Capa 2: Backend - Rutas (routes/auth.js)

**express-validator middleware:**

Cada endpoint tiene validaciones middleware que se ejecutan ANTES de procesar la petición:

```javascript
router.post('/register', [
  body('username')
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/),
  body('email')
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .isLength({ min: 6, max: 128 })
], async (req, res) => {
  // Verificar errores de validación
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  
  // Sanitizar inputs adicional
  username = sanitizeText(removeSQLPatterns(limitLength(username, 50)));
  email = sanitizeEmail(removeSQLPatterns(limitLength(email, 255)));
  
  // ... resto del código
});
```

**Endpoints protegidos:**
- ✅ POST `/register` - Registro de usuarios
- ✅ POST `/login` - Inicio de sesión
- ✅ PATCH `/users/:id` - Actualización de usuarios
- ✅ DELETE `/users/:id` - Eliminación de usuarios

**Sanitización de IDs:**
```javascript
const userId = Number.parseInt(removeSQLPatterns(req.params.id), 10);
if (Number.isNaN(userId)) {
  return res.status(400).json({ error: 'ID de usuario inválido' });
}
```

### Capa 3: Modelo de Datos (models/User.js)

**Validaciones a nivel de base de datos:**

```javascript
username: {
  type: DataTypes.STRING(100),
  allowNull: false,
  unique: true,
  validate: {
    notEmpty: { msg: 'El nombre de usuario no puede estar vacío' },
    len: { args: [3, 50], msg: 'Debe tener entre 3 y 50 caracteres' },
    is: { 
      args: /^[a-zA-Z0-9_-]+$/, 
      msg: 'Solo letras, números, guiones y guiones bajos' 
    },
    noSQLInjection(value) {
      // Verificar patrones peligrosos
      // Lanzar error si se detectan
    }
  }
}
```

**Validaciones personalizadas:**
- Detección de patrones SQL peligrosos
- Detección de tags HTML peligrosos
- Validación de formato de email
- Longitud de campos

### Capa 4: ORM - Sequelize

**Protección nativa de Sequelize:**

Sequelize usa **consultas parametrizadas** automáticamente, lo que previene inyecciones SQL a nivel de base de datos:

```javascript
// Esto es SEGURO con Sequelize
const user = await User.findOne({ where: { email: email } });

// Sequelize convierte esto internamente en:
// SELECT * FROM users WHERE email = ? [email]
// Los parámetros se envían separados de la consulta
```

**¿Por qué esto es seguro?**
- Los valores de usuario nunca se concatenan directamente en la consulta SQL
- La base de datos trata los parámetros como datos, no como código SQL
- Imposible inyectar código SQL a través de los valores

## 🔒 Mejores Prácticas Implementadas

### 1. **Defensa en Profundidad (Defense in Depth)**
- Múltiples capas de validación
- Si una capa falla, las otras aún protegen

### 2. **Validación de Lista Blanca (Whitelist)**
- Solo se permiten caracteres específicos
- Mejor que bloquear caracteres malos (blacklist)

### 3. **Principio de Menor Privilegio**
- Roles de usuario (admin/agent)
- Permisos granulares en endpoints

### 4. **Mensajes de Error Genéricos**
```javascript
// ❌ MAL: Da información al atacante
return res.status(400).json({ error: 'Usuario no encontrado' });

// ✅ BIEN: Mensaje genérico
return res.status(400).json({ error: 'Credenciales inválidas' });
```

### 5. **Límites de Longitud**
- Username: 50 caracteres máximo
- Email: 255 caracteres máximo
- Password: 128 caracteres máximo
- Previene ataques de buffer overflow

### 6. **Sanitización en Múltiples Puntos**
- Frontend: Antes de enviar
- Backend: Al recibir
- Modelo: Antes de guardar en DB

## 🧪 Pruebas de Seguridad

### Ejemplos de Ataques Bloqueados:

#### 1. **SQL Injection Básico**
```
Input: admin' OR '1'='1
Resultado: Bloqueado por removeSQLPatterns() y validaciones regex
```

#### 2. **SQL Injection con UNION**
```
Input: admin' UNION SELECT * FROM users --
Resultado: Bloqueado por detección de "UNION SELECT"
```

#### 3. **SQL Injection con DROP**
```
Input: admin'; DROP TABLE users; --
Resultado: Bloqueado por detección de "DROP TABLE"
```

#### 4. **XSS Attack**
```
Input: <script>alert('XSS')</script>
Resultado: Bloqueado por DOMPurify y validaciones
```

#### 5. **Caracteres Especiales SQL**
```
Input: admin%27%20OR%201=1
Resultado: Bloqueado por detección de patrones URL-encoded
```

## 📝 Código de Ejemplo para Desarrolladores

### Cómo usar las utilidades de sanitización:

```javascript
const { 
  sanitizeText, 
  sanitizeEmail, 
  isValidEmail,
  validatePassword 
} = require('../utils/sanitizer');

// Sanitizar texto general
const cleanText = sanitizeText(userInput);

// Sanitizar email
const cleanEmail = sanitizeEmail(emailInput);

// Validar email
if (!isValidEmail(email)) {
  return res.status(400).json({ error: 'Email inválido' });
}

// Validar contraseña
const passwordCheck = validatePassword(password);
if (!passwordCheck.valid) {
  return res.status(400).json({ error: passwordCheck.message });
}
```

### Cómo agregar validaciones a nuevos endpoints:

```javascript
const { body, validationResult } = require('express-validator');

router.post('/nuevo-endpoint', [
  // Agregar validaciones
  body('campo')
    .trim()
    .notEmpty().withMessage('Campo requerido')
    .isLength({ min: 3, max: 50 }),
], async (req, res) => {
  // Verificar errores
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  
  // Sanitizar
  let campo = sanitizeText(req.body.campo);
  
  // Procesar...
});
```

## 🚀 Comandos para Probar

```bash
# Instalar dependencias
cd "c:\Users\Aux Tecnologia 4\Desktop\proyectos\bot-protipo"
npm install

# Instalar dependencias del cliente
cd client
npm install

# Ejecutar servidor
npm run dev

# Ejecutar cliente (en otra terminal)
cd client
npm start
```

## ⚠️ Consideraciones Importantes

1. **Las contraseñas NO se sanitizan**: Deben permitir caracteres especiales para mayor seguridad
2. **Sequelize maneja las consultas**: No construir consultas SQL manualmente
3. **Siempre validar en backend**: Nunca confiar solo en validaciones del frontend
4. **Logging de seguridad**: Los errores se registran en console.error() para debugging
5. **Tokens JWT**: Usar variables de entorno para JWT_SECRET

## 📚 Referencias

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [Express Validator Docs](https://express-validator.github.io/docs/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Sequelize Security](https://sequelize.org/docs/v6/core-concepts/raw-queries/)

---

## ✅ Checklist de Seguridad

- [x] Instaladas dependencias de seguridad
- [x] Creado módulo de sanitización
- [x] Protegido endpoint de registro
- [x] Protegido endpoint de login
- [x] Protegido endpoint de actualización
- [x] Protegido endpoint de eliminación
- [x] Validaciones en modelo User
- [x] Sanitización en frontend
- [x] Validaciones con express-validator
- [x] Consultas parametrizadas con Sequelize
- [x] Sanitización de IDs en rutas
- [x] Límites de longitud implementados
- [x] Mensajes de error genéricos
- [x] Documentación completa

**Estado: ✅ IMPLEMENTADO Y DOCUMENTADO**
