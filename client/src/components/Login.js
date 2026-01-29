import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (formData.password !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_URL}/auth/register`, {
          username: formData.username,
          email: formData.email,
          password: formData.password
        });

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin();
      } else {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: formData.email,
          password: formData.password
        });

        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin();
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

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
              <label>Usuario</label>
              <input
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
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="tu@email.com"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
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
              <label>Confirmar Contraseña</label>
              <input
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
            {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Iniciar Sesión'}
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

export default Login;
