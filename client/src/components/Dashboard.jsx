import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';
import Tickets from './Tickets.jsx';
import AdminPanel from './AdminPanel.jsx';
import { useTheme } from '../context/ThemeContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { SkeletonList } from './Skeleton.jsx';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useTheme();
  const { showNotification } = useNotification();

  const getVistaFromPath = () => {
    const path = location.pathname;
    if (path.includes('/tickets')) return 'tickets';
    if (path.includes('/admin')) return 'admin';
    return 'chat';
  };

  const [vistaActual, setVistaActual] = useState(getVistaFromPath());
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token');

  const getProxyUrl = (mediaUrl, mediaId) => {
    if (!mediaUrl && !mediaId) return '';
    const baseUrl = `${API_URL}/tickets/media/download`;
    const params = new URLSearchParams();
    if (mediaId) params.append('mediaId', mediaId);
    if (mediaUrl) params.append('url', encodeURIComponent(mediaUrl));
    params.append('token', token);
    return `${baseUrl}?${params.toString()}`;
  };

  useEffect(() => {
    loadUserRole();
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUserRole = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRole(response.data.user.role);
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Error cargando rol de usuario:', error);
      showNotification('Error al cargar el perfil', 'error');
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.phoneNumber);
      loadTicketInfo(selectedConversation.phoneNumber);
      const interval = setInterval(() => {
        loadMessages(selectedConversation.phoneNumber);
        loadTicketInfo(selectedConversation.phoneNumber);
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setTicketInfo(null);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      showNotification('Error al cargar conversaciones', 'error');
    } finally {
      setLoadingConversations(false);
    }
  };

  const asignarUsuario = async (phoneNumber) => {
    try {
      await axios.post(
        `${API_URL}/cola/asignar/${phoneNumber}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadConversations();
      showNotification('Usuario asignado correctamente', 'success');
    } catch (error) {
      console.error('Error asignando usuario:', error);
      showNotification('Error al asignar usuario', 'error');
    }
  };

  const loadMessages = async (phoneNumber) => {
    try {
      const response = await axios.get(`${API_URL}/messages/conversation/${phoneNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  };

  const loadTicketInfo = async (phoneNumber) => {
    try {
      const response = await axios.get(`${API_URL}/tickets?phoneNumber=${phoneNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.tickets && response.data.tickets.length > 0) {
        const ticketAbierto = response.data.tickets.find(t => t.estado !== 'CERRADO');
        const ticket = ticketAbierto || response.data.tickets[0];
        setTicketInfo(ticket);
        return ticket;
      } else {
        setTicketInfo(null);
        return null;
      }
    } catch (error) {
      console.error('Error cargando ticket:', error);
      setTicketInfo(null);
      return null;
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      const ticketActualizado = await loadTicketInfo(selectedConversation.phoneNumber);
      if (ticketActualizado && ticketActualizado.estado === 'CERRADO') {
        showNotification('Este ticket está cerrado. No puedes enviar mensajes.', 'warning');
        setLoading(false);
        return;
      }

      await axios.post(
        `${API_URL}/messages/send`,
        {
          to: selectedConversation.phoneNumber,
          message: newMessage,
          type: 'text'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewMessage('');
      await loadMessages(selectedConversation.phoneNumber);
      await loadConversations();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Error al enviar mensaje';
      showNotification(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return d.toLocaleDateString('es-ES');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const cambiarVista = (vista) => {
    setVistaActual(vista);
    setMenuAbierto(false);
    if (vista === 'chat') navigate('/');
    else if (vista === 'tickets') navigate('/tickets');
    else if (vista === 'admin') navigate('/admin');
  };

  useEffect(() => {
    const newVista = getVistaFromPath();
    if (newVista !== vistaActual) {
      setVistaActual(newVista);
    }
  }, [location.pathname]);

  return (
    <div className={`dashboard ${vistaActual}-view`}>
      {menuAbierto && (
        <div className="menu-overlay" onClick={() => setMenuAbierto(false)}></div>
      )}

      {/* Menú lateral */}
      <div className={`menu-lateral ${menuAbierto ? 'abierto' : ''}`}>
        <div className="menu-header">
          <h2>💬 WhatsApp Bot</h2>
          <button onClick={toggleDarkMode} className="theme-toggle-btn">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="btn-cerrar-menu" onClick={() => setMenuAbierto(false)}>✖</button>
        </div>
        <nav className="menu-opciones">
          <button 
            className={`menu-opcion ${vistaActual === 'chat' ? 'active' : ''}`}
            onClick={() => cambiarVista('chat')}
          >
            <span className="menu-icon">💬</span>
            <span>Conversaciones</span>
          </button>
          <button 
            className={`menu-opcion ${vistaActual === 'tickets' ? 'active' : ''}`}
            onClick={() => cambiarVista('tickets')}
          >
            <span className="menu-icon">🎫</span>
            <span>Mis Tickets</span>
          </button>
          {userRole === 'admin' && (
            <button 
              className={`menu-opcion ${vistaActual === 'admin' ? 'active' : ''}`}
              onClick={() => cambiarVista('admin')}
            >
              <span className="menu-icon">👑</span>
              <span>Administración</span>
            </button>
          )}
        </nav>
        <div className="menu-footer">
          <button className="btn-logout-menu" onClick={handleLogout}>
            <span>🚪</span> Cerrar Sesión
          </button>
        </div>
      </div>

      {vistaActual === 'chat' && (
        <>
          <div className="sidebar">
            <div className="sidebar-header">
              <button className="btn-menu-hamburguesa-chat" onClick={() => setMenuAbierto(true)}>☰</button>
              <h2>💬 WhatsApp Bot</h2>
              <button onClick={toggleDarkMode} className="theme-toggle-btn">
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button onClick={handleLogout} className="logout-btn">Salir</button>
            </div>
            <div className="nav-tabs">
              <button 
                className={`nav-tab ${vistaActual === 'chat' ? 'active' : ''}`}
                onClick={() => cambiarVista('chat')}
              >
                💬 Chat
              </button>
              <button 
                className={`nav-tab ${vistaActual === 'tickets' ? 'active' : ''}`}
                onClick={() => cambiarVista('tickets')}
              >
                🎫 Tickets
              </button>
              {userRole === 'admin' && (
                <button 
                  className={`nav-tab ${vistaActual === 'admin' ? 'active' : ''}`}
                  onClick={() => cambiarVista('admin')}
                >
                  👑 Admin
                </button>
              )}
            </div>
            <div className="conversations-list">
              {loadingConversations ? (
                <SkeletonList count={6} />
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={`conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''}`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="conversation-avatar">
                      {conv.name ? conv.name.charAt(0).toUpperCase() : '👤'}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <span className="conversation-name">
                          {conv.name || conv.phoneNumber}
                        </span>
                        <span className="conversation-time">
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      </div>
                      <div className="conversation-last-message">
                        {conv.lastMessage.substring(0, 40)}
                        {conv.lastMessage.length > 40 ? '...' : ''}
                      </div>
                      <div className="conversation-details">
                        {conv.placa && <span className="detail-badge">🚗 {conv.placa}</span>}
                        {conv.estado && (
                          <span className={`estado-badge estado-${conv.estado.toLowerCase()}`}>
                            {conv.estado}
                          </span>
                        )}
                        {conv.estado === 'EN_COLA' && conv.posicionEnCola && (
                          <span className="cola-badge">Cola: #{conv.posicionEnCola}</span>
                        )}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="unread-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="chat-area">
            {selectedConversation ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="chat-avatar">
                      {selectedConversation.name 
                        ? selectedConversation.name.charAt(0).toUpperCase() 
                        : '👤'}
                    </div>
                    <div>
                      <h3>{selectedConversation.name || selectedConversation.phoneNumber}</h3>
                      <p className="phone-number">{selectedConversation.phoneNumber}</p>
                      {selectedConversation.placa && (
                        <p className="user-detail">🚗 Placa: {selectedConversation.placa}</p>
                      )}
                      {selectedConversation.cedula && (
                        <p className="user-detail">🆔 Cédula: {selectedConversation.cedula}</p>
                      )}
                      <p className="user-detail">
                        Estado: <span className={`estado-inline estado-${selectedConversation.estado?.toLowerCase()}`}>
                          {selectedConversation.estado || 'INICIO'}
                        </span>
                      </p>
                    </div>
                  </div>
                  {ticketInfo && ticketInfo.asignadoA ? (
                    <div className="ticket-asignado-banner" style={{ 
                      margin: '0 0 0 auto', 
                      maxWidth: '350px',
                      padding: '8px 12px',
                      fontSize: '13px'
                    }}>
                      <div className="banner-icon" style={{ fontSize: '16px' }}>🎫</div>
                      <div className="banner-content" style={{ gap: '4px' }}>
                        <strong style={{ fontSize: '12px' }}>Tomado por:</strong>
                        <span className="agente-nombre" style={{ fontSize: '13px' }}>{ticketInfo.asignadoA.username}</span>
                      </div>
                      <div className="banner-ticket" style={{ fontSize: '12px' }}>
                        <strong>{ticketInfo.numeroTicket}</strong>
                      </div>
                    </div>
                  ) : selectedConversation.estado === 'EN_COLA' && (
                    <button 
                      onClick={() => asignarUsuario(selectedConversation.phoneNumber)} 
                      className="asignar-btn"
                      style={{ 
                        marginLeft: 'auto',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      🎫 Asignar a mí
                    </button>
                  )}
                </div>

                <div className="messages-container">
                  {messages.map((msg, index) => {
                    const showDate = index === 0 || 
                      formatDate(messages[index - 1].timestamp) !== formatDate(msg.timestamp);
                    
                    return (
                      <React.Fragment key={msg._id}>
                        {showDate && (
                          <div className="date-divider">
                            {formatDate(msg.timestamp)}
                          </div>
                        )}
                        <div className={`message ${msg.direction}`}>
                          <div className="message-content">
                            {msg.type === 'image' && msg.mediaUrl && (
                              <img 
                                src={getProxyUrl(msg.mediaUrl, msg.mediaId)} 
                                alt="Imagen" 
                                className="message-image"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2UwZTBlMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQwIj7wn5qrPC90ZXh0Pjwvc3ZnPg==';
                                }}
                              />
                            )}
                            {msg.type === 'video' && msg.mediaUrl && (
                              <video controls className="message-video">
                                <source src={getProxyUrl(msg.mediaUrl, msg.mediaId)} type="video/mp4" />
                              </video>
                            )}
                            {msg.type === 'audio' && msg.mediaUrl && (
                              <audio controls className="message-audio">
                                <source src={getProxyUrl(msg.mediaUrl, msg.mediaId)} type="audio/ogg" />
                              </audio>
                            )}
                            {msg.type === 'document' && msg.mediaUrl && (
                              <a href={getProxyUrl(msg.mediaUrl, msg.mediaId)} target="_blank" rel="noopener noreferrer" className="message-document">
                                📄 {msg.message}
                              </a>
                            )}
                            <div className="message-text">{msg.message}</div>
                            <span className="message-time">
                              {formatTime(msg.timestamp)}
                              {msg.direction === 'outbound' && (
                                <span className="message-status">
                                  {msg.status === 'sent' && ' ✓'}
                                  {msg.status === 'delivered' && ' ✓✓'}
                                  {msg.status === 'read' && ' ✓✓'}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <form className="message-input-container" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    disabled={loading}
                    className="message-input"
                  />
                  <button type="submit" disabled={loading} className="send-button">
                    {loading ? '⏳' : '📤'}
                  </button>
                </form>
              </>
            ) : (
              <div className="no-chat-selected">
                <h2>Selecciona una conversación</h2>
                <p>Elige una conversación de la lista para comenzar a chatear</p>
              </div>
            )}
          </div>
        </>
      )}

      {vistaActual === 'tickets' && <Tickets onNavigate={cambiarVista} />}
      {vistaActual === 'admin' && userRole === 'admin' && <AdminPanel onNavigate={cambiarVista} />}
    </div>
  );
}

export default Dashboard;