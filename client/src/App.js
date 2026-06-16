import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import { NotificationProvider } from './context/NotificationContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setIsAuthenticated(true);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            {isAuthenticated ? <Dashboard /> : <Login onLogin={() => setIsAuthenticated(true)} />}
          </div>
        </Router>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;