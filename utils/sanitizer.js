/**
 * Utilidades para sanitización de datos y protección contra inyecciones
 */
const validator = require('validator');

/**
 * Sanitiza texto removiendo caracteres peligrosos
 * @param {string} text - Texto a sanitizar
 * @returns {string} - Texto sanitizado
 */
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Escapar HTML para prevenir XSS
  let sanitized = validator.escape(text);
  
  // Trim espacios
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Sanitiza email
 * @param {string} email - Email a sanitizar
 * @returns {string} - Email sanitizado
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  // Normalizar email
  return validator.normalizeEmail(email, {
    all_lowercase: true,
    gmail_remove_dots: false
  }) || '';
};

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - True si es válido
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return validator.isEmail(email);
};

/**
 * Valida formato de username
 * @param {string} username - Username a validar
 * @returns {boolean} - True si es válido
 */
const isValidUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return false;
  }
  
  // Solo alfanuméricos, guiones bajos y guiones medios
  // Longitud entre 3 y 50 caracteres
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
};

/**
 * Valida fortaleza de contraseña
 * @param {string} password - Contraseña a validar
 * @returns {object} - {valid: boolean, message: string}
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Contraseña requerida' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'La contraseña es demasiado larga' };
  }
  
  // Opcional: Verificar que contenga números y letras
  // const hasNumber = /\d/.test(password);
  // const hasLetter = /[a-zA-Z]/.test(password);
  // if (!hasNumber || !hasLetter) {
  //   return { valid: false, message: 'La contraseña debe contener letras y números' };
  // }
  
  return { valid: true, message: 'Contraseña válida' };
};

/**
 * Limita longitud de texto
 * @param {string} text - Texto a limitar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto limitado
 */
const limitLength = (text, maxLength) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text.substring(0, maxLength);
};

/**
 * Remueve caracteres SQL peligrosos adicionales
 * @param {string} text - Texto a limpiar
 * @returns {string} - Texto limpio
 */
const removeSQLPatterns = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // Prevenir patrones comunes de inyección SQL
  const dangerousPatterns = [
    /%27|'|--|%23|#/gi,  // Caracteres SQL básicos
    /(?:%3D|=)[^\n]*(?:%27|'|--|%3B|;)/gi,  // SQL injection
    /\w*(?:%27|')(?:%6F|o|%4F)(?:%72|r|%52)/gi,  // SQL 'or'
    /exec[\s+]+[sx]p\w+/gi,  // Stored procedures
    /UNION.*SELECT/gi,  // UNION attacks
    /INSERT.*INTO/gi,  // INSERT attacks
    /DELETE.*FROM/gi,  // DELETE attacks
    /DROP.*TABLE/gi,  // DROP attacks
    /UPDATE.*SET/gi,  // UPDATE attacks
  ];
  
  let cleaned = text;
  dangerousPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned;
};

module.exports = {
  sanitizeText,
  sanitizeEmail,
  isValidEmail,
  isValidUsername,
  validatePassword,
  limitLength,
  removeSQLPatterns
};
