const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const {
  sanitizeText,
  sanitizeEmail,
  isValidEmail,
  isValidUsername,
  validatePassword,
  limitLength,
  removeSQLPatterns
} = require('../utils/sanitizer');

/**
 * Registro de usuario
 */
router.post('/register', [
  // Validaciones con express-validator
  body('username')
    .trim()
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'),
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6, max: 128 }).withMessage('La contraseña debe tener entre 6 y 128 caracteres')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    let { username, email, password, role } = req.body;

    // Sanitizar inputs
    username = sanitizeText(removeSQLPatterns(limitLength(username, 50)));
    email = sanitizeEmail(removeSQLPatterns(limitLength(email, 255)));
    
    // Validaciones adicionales
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Nombre de usuario inválido' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Sanitizar y validar role si existe
    if (role) {
      role = sanitizeText(role);
      if (!['admin', 'agent'].includes(role)) {
        role = 'agent'; // Valor por defecto seguro
      }
    }

    // Verificar si el usuario ya existe (usando consultas parametrizadas de Sequelize)
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email: email },
          { username: username }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El usuario o email ya existe' });
    }

    // Crear nuevo usuario (Sequelize maneja la sanitización)
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'agent'
    });

    // Generar token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

/**
 * Login de usuario
 */
router.post('/login', [
  // Validaciones con express-validator
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6, max: 128 }).withMessage('Contraseña inválida')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    let { email, password } = req.body;

    // Sanitizar inputs
    email = sanitizeEmail(removeSQLPatterns(limitLength(email, 255)));
    
    // Validaciones adicionales
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    if (!password || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Buscar usuario (usando consultas parametrizadas de Sequelize)
    const user = await User.findOne({ where: { email: email } });

    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * Obtener perfil de usuario autenticado
 */
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener todos los agentes (solo admin)
 */
router.get('/agents', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const agents = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Actualizar usuario (solo admin)
 */
router.patch('/users/:id', [
  auth,
  // Validaciones opcionales
  body('username').optional().trim()
    .isLength({ min: 3, max: 50 }).withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'),
  body('email').optional().trim()
    .isEmail().withMessage('Formato de email inválido')
    .normalizeEmail(),
  body('password').optional()
    .isLength({ min: 6, max: 128 }).withMessage('La contraseña debe tener entre 6 y 128 caracteres'),
  body('role').optional()
    .isIn(['admin', 'agent']).withMessage('Rol inválido')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Sanitizar y validar ID
    const userId = Number.parseInt(removeSQLPatterns(req.params.id), 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Mapa de validadores/actualizadores para reducir complejidad
    const fieldHandlers = {
      username: (value) => {
        const v = sanitizeText(removeSQLPatterns(limitLength(value, 50)));
        if (!isValidUsername(v)) return 'Nombre de usuario inválido';
        user.username = v;
        return null;
      },
      email: (value) => {
        const v = sanitizeEmail(removeSQLPatterns(limitLength(value, 255)));
        if (!isValidEmail(v)) return 'Email inválido';
        user.email = v;
        return null;
      },
      password: (value) => {
        const pv = validatePassword(value);
        if (!pv.valid) return pv.message;
        user.password = value;
        return null;
      },
      role: (value) => {
        const v = sanitizeText(value);
        if (!['admin', 'agent'].includes(v)) return 'Rol inválido';
        user.role = v;
        return null;
      }
    };

    // Iterar campos y aplicar validadores si vienen en la petición
    for (const field of ['username', 'email', 'password', 'role']) {
      if (Object.hasOwn(req.body, field) && req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
        const errMsg = fieldHandlers[field](req.body[field]);
        if (errMsg) {
          return res.status(400).json({ error: errMsg });
        }
      }
    }

    await user.save();

    res.json({
      message: 'Usuario actualizado correctamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

/**
 * Eliminar usuario (solo admin)
 */
router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Sanitizar y validar ID
    const userId = Number.parseInt(removeSQLPatterns(req.params.id), 10);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    // No permitir que el admin se elimine a sí mismo
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.destroy();

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
