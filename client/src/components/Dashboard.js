import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Dashboard.css';
import Tickets from './Tickets';
import AdminPanel from './AdminPanel';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Dashboard() {
  const [vistaActual, setVistaActual] = useState('chat'); // 'chat', 'tickets', 'admin'
  const [userRole, setUserRole] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [ticketInfo, setTicketInfo] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadUserRole();
    loadConversations();
    // Recargar conversaciones cada 5 segundos
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadUserRole = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRole(response.data.user.role);
    } catch (error) {
      console.error('Error cargando rol de usuario:', error);
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.phoneNumber);
      loadTicketInfo(selectedConversation.phoneNumber);
      // Recargar mensajes y ticket cada 3 segundos
      const interval = setInterval(() => {
        loadMessages(selectedConversation.phoneNumber);
        loadTicketInfo(selectedConversation.phoneNumber);
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setTicketInfo(null);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
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
      alert('Usuario asignado correctamente');
    } catch (error) {
      console.error('Error asignando usuario:', error);
      alert('Error al asignar usuario');
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
        // Obtener el ticket más reciente
        const ticket = response.data.tickets[0];
        setTicketInfo(ticket);
      } else {
        setTicketInfo(null);
      }
    } catch (error) {
      console.error('Error cargando ticket:', error);
      setTicketInfo(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    try {
      // Verificar si el ticket está asignado al usuario actual
      if (ticketInfo && ticketInfo.asignadoA) {
        const meResponse = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentUserId = meResponse.data.user._id;
        
        // Comparar IDs correctamente (puede ser objeto o string)
        const ticketAsignadoId = typeof ticketInfo.asignadoA === 'object' 
          ? ticketInfo.asignadoA._id 
          : ticketInfo.asignadoA;
        
        if (ticketAsignadoId !== currentUserId) {
          const agenteNombre = typeof ticketInfo.asignadoA === 'object'
            ? ticketInfo.asignadoA.username
            : 'otro agente';
          alert(`Este ticket está asignado a ${agenteNombre}. No puedes enviar mensajes.`);
          setLoading(false);
          return;
        }
      }

      await axios.post(
        `${API_URL}/messages/send`,
        {
          to: selectedConversation.phoneNumber,
          message: newMessage,
          type: 'text'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setNewMessage('');
      await loadMessages(selectedConversation.phoneNumber);
      await loadConversations();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Error al enviar mensaje';
      alert(errorMsg);
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

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>💬 WhatsApp Bot</h2>
          <button onClick={handleLogout} className="logout-btn">Salir</button>
        </div>
        
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${vistaActual === 'chat' ? 'active' : ''}`}
            onClick={() => setVistaActual('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={`nav-tab ${vistaActual === 'tickets' ? 'active' : ''}`}
            onClick={() => setVistaActual('tickets')}
          >
            🎫 Tickets
          </button>
          {userRole === 'admin' && (
            <button 
              className={`nav-tab ${vistaActual === 'admin' ? 'active' : ''}`}
              onClick={() => setVistaActual('admin')}
            >
              👑 Admin
            </button>
          )}
        </div>

        {vistaActual === 'chat' && (
          <div className="conversations-list">
            {conversations.map((conv) => (
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
          ))}
        </div>
        )}
      </div>

      {vistaActual === 'chat' ? (
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
              {selectedConversation.estado === 'EN_COLA' && (
                <button onClick={() => asignarUsuario(selectedConversation.phoneNumber)} className="asignar-btn">
                  Asignar a mí
                </button>
              )}
            </div>

            {/* Banner de ticket asignado */}
            {ticketInfo && ticketInfo.asignadoA && (
              <div className="ticket-asignado-banner">
                <div className="banner-icon">🎫</div>
                <div className="banner-content">
                  <strong>El ticket de este chat ha sido tomado por:</strong>
                  <span className="agente-nombre">{ticketInfo.asignadoA.username}</span>
                </div>
                <div className="banner-ticket">
                  Ticket: <strong>{ticketInfo.numeroTicket}</strong>
                </div>
              </div>
            )}

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
                          <img src={msg.mediaUrl} alt="Imagen" className="message-image" />
                        )}
                        {msg.type === 'video' && msg.mediaUrl && (
                          <video controls className="message-video">
                            <source src={msg.mediaUrl} type="video/mp4" />
                          </video>
                        )}
                        {msg.type === 'audio' && msg.mediaUrl && (
                          <audio controls className="message-audio">
                            <source src={msg.mediaUrl} type="audio/ogg" />
                          </audio>
                        )}
                        {msg.type === 'document' && msg.mediaUrl && (
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="message-document">
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
      ) : vistaActual === 'tickets' ? (
        <Tickets />
      ) : vistaActual === 'admin' && userRole === 'admin' ? (
        <AdminPanel />
      ) : null}
    </div>
  );
}

export default Dashboard;
