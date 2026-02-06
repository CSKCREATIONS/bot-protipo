import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import DOMPurify from 'dompurify';
import './Login.css';
import './Login.responsive.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Función para sanitizar inputs y prevenir inyecciones SQL/XSS
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  // Remover espacios al inicio y final
  let sanitized = input.trim();
  
  // Sanitizar HTML/XSS usando DOMPurify
  sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
  
  // Remover patrones peligrosos de SQL
  const dangerousPatterns = [
    /(%27)|(')|(--)|(% 23)|(#)/gi,
    /((%3D)|(=))[^\n]*((%27)|(')|(--)|(% 3B)|(;))/gi,
    /union.*select/gi,
    /insert.*into/gi,
    /delete.*from/gi,
    /drop.*table/gi,
    /update.*set/gi,
    /<script/gi,
    /<iframe/gi
  ];
  
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized;
};

// Validar formato de email
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Validar formato de username
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
};

// Validar fortaleza de contraseña
const isValidPassword = (password) => {
  return password && password.length >= 6 && password.length <= 128;
};

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Sanitizar input en tiempo real
    const sanitizedValue = sanitizeInput(value);
    
    // Limitar longitud según el campo
    let finalValue = sanitizedValue;
    if (name === 'username') {
      finalValue = sanitizedValue.substring(0, 50);
    } else if (name === 'email') {
      finalValue = sanitizedValue.substring(0, 255);
    } else if (name === 'password' || name === 'confirmPassword') {
      finalValue = value.substring(0, 128); // No sanitizar contraseña para mantener caracteres especiales
    }
    
    setFormData({
      ...formData,
      [name]: finalValue
    });
    setError('');
  };

  const validateRegister = (data) => {
    const sanitizedUsername = sanitizeInput(data.username);
    const sanitizedEmail = sanitizeInput(data.email);

    if (!sanitizedUsername || sanitizedUsername.length < 3) {
      return 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (!isValidUsername(sanitizedUsername)) {
      return 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos';
    }

    if (!isValidEmail(sanitizedEmail)) {
      return 'Por favor ingresa un email válido';
    }

    if (!isValidPassword(data.password)) {
      return 'La contraseña debe tener entre 6 y 128 caracteres';
    }

    if (data.password !== data.confirmPassword) {
      return 'Las contraseñas no coinciden';
    }

    return null;
  };

  const validateLogin = (data) => {
    const sanitizedEmail = sanitizeInput(data.email);

    if (!isValidEmail(sanitizedEmail)) {
      return 'Por favor ingresa un email válido';
    }

    if (!isValidPassword(data.password)) {
      return 'Credenciales inválidas';
    }

    return null;
  };

  const saveAuth = (response) => {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    onLogin();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const validationError = validateRegister(formData);
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_URL}/auth/register`, {
          username: sanitizeInput(formData.username),
          email: sanitizeInput(formData.email).toLowerCase(),
          password: formData.password
        });

        saveAuth(response);
      } else {
        const validationError = validateLogin(formData);
        if (validationError) {
          setError(validationError);
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_URL}/auth/login`, {
          email: sanitizeInput(formData.email).toLowerCase(),
          password: formData.password
        });

        saveAuth(response);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  let submitButtonLabel;
  if (loading) {
    submitButtonLabel = 'Procesando...';
  } else if (isRegister) {
    submitButtonLabel = 'Registrarse';
  } else {
    submitButtonLabel = 'Iniciar Sesión';
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>💬 WhatsApp Chatbot</h1>
          <p>{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Nombre de usuario"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              minLength="6"
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                minLength="6"
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-button" disabled={loading}>
            {submitButtonLabel}
          </button>
        </form>

        <div className="toggle-form">
          {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: ''
              });
            }}
            className="toggle-button"
          >
            {isRegister ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </div>
      </div>
    </div>
  );
}

Login.propTypes = {
  onLogin: PropTypes.func.isRequired
};

export default Login;
