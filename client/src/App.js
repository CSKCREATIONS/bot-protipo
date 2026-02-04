import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token guardado
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {isAuthenticated ? (
          <Dashboard />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </div>
    </Router>
  );
}

export default App;
