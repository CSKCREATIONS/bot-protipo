import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Tickets.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [stats, setStats] = useState(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [lockedByAgent, setLockedByAgent] = useState(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    cargarTickets();
    cargarEstadisticas();
    const interval = setInterval(() => {
      cargarTickets();
      cargarEstadisticas();
    }, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, [filtroEstado, filtroPrioridad]);

  const cargarTickets = async () => {
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPrioridad) params.prioridad = filtroPrioridad;

      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error cargando tickets:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets/stats/resumen`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const actualizarEstado = async (ticketId, nuevoEstado) => {
    setLoading(true);
    try {
      await axios.patch(
        `${API_URL}/tickets/${ticketId}`,
        { estado: nuevoEstado },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarTickets();
      if (ticketSeleccionado?._id === ticketId) {
        const response = await axios.get(`${API_URL}/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTicketSeleccionado(response.data);
      }
      alert('Estado actualizado correctamente');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const actualizarPrioridad = async (ticketId, nuevaPrioridad) => {
    setLoading(true);
    try {
      await axios.patch(
        `${API_URL}/tickets/${ticketId}`,
        { prioridad: nuevaPrioridad },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarTickets();
      if (ticketSeleccionado?._id === ticketId) {
        const response = await axios.get(`${API_URL}/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTicketSeleccionado(response.data);
      }
      alert('Prioridad actualizada correctamente');
    } catch (error) {
      console.error('Error actualizando prioridad:', error);
      alert('Error al actualizar la prioridad');
    } finally {
      setLoading(false);
    }
  };

  const asignarTicket = async (ticketId) => {
    setLoading(true);
    try {
      // Primero verificar si está bloqueado
      try {
        const bloqueoResponse = await axios.get(`${API_URL}/tickets/${ticketId}/bloqueo`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (bloqueoResponse.data.isLocked && !bloqueoResponse.data.isLockedByCurrentUser) {
          // Mostrar modal de ticket bloqueado
          setLockedByAgent(bloqueoResponse.data.lockedBy);
          setModalMessage(`Este ticket está siendo atendido por ${bloqueoResponse.data.lockedBy.username}`);
          setShowModal(true);
          setLoading(false);
          return;
        }
      } catch (bloqueoError) {
        console.error('Error verificando bloqueo:', bloqueoError);
      }

      // Intentar asignar el ticket
      await axios.post(
        `${API_URL}/tickets/${ticketId}/asignar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarTickets();
      alert('Ticket asignado correctamente');
    } catch (error) {
      console.error('Error asignando ticket:', error);
      if (error.response && error.response.status === 423) {
        // Ticket bloqueado por otro agente
        setLockedByAgent(error.response.data.lockedBy);
        setModalMessage(error.response.data.message);
        setShowModal(true);
      } else {
        alert('Error al asignar ticket');
      }
    } finally {
      setLoading(false);
    }
  };

  const agregarNota = async () => {
    if (!nuevaNota.trim() || !ticketSeleccionado) return;

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/tickets/${ticketSeleccionado._id}/notas`,
        { texto: nuevaNota },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNuevaNota('');
      const response = await axios.get(`${API_URL}/tickets/${ticketSeleccionado._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicketSeleccionado(response.data);
    } catch (error) {
      console.error('Error agregando nota:', error);
      alert('Error al agregar nota');
    } finally {
      setLoading(false);
    }
  };

  const cerrarTicket = async (ticketId) => {
    if (!window.confirm('¿Estás seguro de cerrar este ticket?')) return;

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/tickets/${ticketId}/cerrar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarTickets();
      if (ticketSeleccionado?._id === ticketId) {
        setTicketSeleccionado(null);
      }
      alert('Ticket cerrado correctamente');
    } catch (error) {
      console.error('Error cerrando ticket:', error);
      alert('Error al cerrar ticket');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES');
  };

  return (
    <div className="tickets-container">
      {/* Panel de estadísticas */}
      {stats && (
        <div className="stats-panel">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total</div>
            </div>
          </div>
          <div className="stat-card abiertos">
            <div className="stat-icon">📥</div>
            <div className="stat-info">
              <div className="stat-number">{stats.pendientes || 0}</div>
              <div className="stat-label">Pendientes</div>
            </div>
          </div>
          <div className="stat-card en-proceso">
            <div className="stat-icon">⚙️</div>
            <div className="stat-info">
              <div className="stat-number">{stats.asignados || 0}</div>
              <div className="stat-label">Asignados</div>
            </div>
          </div>
          <div className="stat-card resueltos">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-number">{stats.cerrados || 0}</div>
              <div className="stat-label">Cerrados</div>
            </div>
          </div>
          <div className="stat-card mis-tickets">
            <div className="stat-icon">👤</div>
            <div className="stat-info">
              <div className="stat-number">{stats.misTickets}</div>
              <div className="stat-label">Mis Tickets</div>
            </div>
          </div>
        </div>
      )}

      <div className="tickets-main">
        {/* Lista de tickets */}
        <div className="tickets-list">
          <div className="tickets-header">
            <h2>🎫 Tickets</h2>
            <div className="filtros">
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="ASIGNADO">Asignado</option>
                <option value="CERRADO">Cerrado</option>
              </select>
              <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
                <option value="">Todas las prioridades</option>
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>

          <div className="tickets-items">
            {tickets.map((ticket) => (
              <div
                key={ticket._id}
                className={`ticket-item ${ticketSeleccionado?._id === ticket._id ? 'active' : ''}`}
                onClick={() => setTicketSeleccionado(ticket)}
              >
                <div className="ticket-numero">{ticket.numeroTicket}</div>
                <div className="ticket-info">
                  <div className="ticket-placa">🚗 {ticket.placa || 'Sin placa'}</div>
                  <div className="ticket-phone">📞 {ticket.phoneNumber}</div>
                  <div className="ticket-badges">
                    <span className={`badge-estado ${ticket.estado.toLowerCase()}`}>
                      {ticket.estado}
                    </span>
                    <span className={`badge-prioridad ${ticket.prioridad.toLowerCase()}`}>
                      {ticket.prioridad}
                    </span>
                  </div>
                </div>
                <div className="ticket-fecha">
                  {new Date(ticket.fechaCreacion).toLocaleDateString('es-ES')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle del ticket */}
        {ticketSeleccionado && (
          <div className="ticket-detalle">
            <div className="detalle-header">
              <h2>{ticketSeleccionado.numeroTicket}</h2>
              <div className="detalle-acciones">
                {ticketSeleccionado.estado !== 'CERRADO' && (
                  <>
                    {!ticketSeleccionado.asignadoA && (
                      <button 
                        onClick={() => asignarTicket(ticketSeleccionado._id)} 
                        disabled={loading}
                        className="btn-asignar"
                      >
                        ✋ Asignar a mí
                      </button>
                    )}
                    <button 
                      onClick={() => cerrarTicket(ticketSeleccionado._id)} 
                      className="btn-cerrar-ticket" 
                      disabled={loading}
                    >
                      ✅ Cerrar Ticket
                    </button>
                  </>
                )}
                {ticketSeleccionado.estado === 'CERRADO' && (
                  <span className="ticket-cerrado-badge">🔒 Ticket Cerrado</span>
                )}
              </div>
            </div>

            <div className="detalle-controles">
              <div className="control-group">
                <label>📊 Estado:</label>
                <select
                  value={ticketSeleccionado.estado}
                  onChange={(e) => actualizarEstado(ticketSeleccionado._id, e.target.value)}
                  disabled={loading || ticketSeleccionado.estado === 'CERRADO'}
                  className="select-estado"
                >
                  <option value="PENDIENTE">⏳ Pendiente</option>
                  <option value="ASIGNADO">👤 Asignado</option>
                  <option value="CERRADO">✅ Cerrado</option>
                </select>
              </div>

              <div className="control-group">
                <label>🔥 Prioridad:</label>
                <select
                  value={ticketSeleccionado.prioridad}
                  onChange={(e) => actualizarPrioridad(ticketSeleccionado._id, e.target.value)}
                  disabled={loading || ticketSeleccionado.estado === 'CERRADO'}
                  className="select-prioridad"
                >
                  <option value="BAJA">🟢 Baja</option>
                  <option value="MEDIA">🟡 Media</option>
                  <option value="ALTA">🟠 Alta</option>
                  <option value="URGENTE">🔴 Urgente</option>
                </select>
              </div>
            </div>

            <div className="detalle-info">
              <div className="info-grid">
                <div className="info-item">
                  <label>Teléfono:</label>
                  <span>{ticketSeleccionado.phoneNumber}</span>
                </div>
                <div className="info-item">
                  <label>Placa:</label>
                  <span>{ticketSeleccionado.placa}</span>
                </div>
                <div className="info-item">
                  <label>Cédula:</label>
                  <span>{ticketSeleccionado.cedula}</span>
                </div>
                <div className="info-item">
                  <label>Estado:</label>
                  <span className={`badge-estado ${ticketSeleccionado.estado.toLowerCase()}`}>
                    {ticketSeleccionado.estado}
                  </span>
                </div>
                <div className="info-item">
                  <label>Prioridad:</label>
                  <span className={`badge-prioridad ${ticketSeleccionado.prioridad.toLowerCase()}`}>
                    {ticketSeleccionado.prioridad}
                  </span>
                </div>
                <div className="info-item">
                  <label>Asignado a:</label>
                  <span>{ticketSeleccionado.asignadoA?.username || 'Sin asignar'}</span>
                </div>
                <div className="info-item full-width">
                  <label>Descripción:</label>
                  <span>{ticketSeleccionado.descripcion}</span>
                </div>
                <div className="info-item">
                  <label>Fecha creación:</label>
                  <span>{formatearFecha(ticketSeleccionado.fechaCreacion)}</span>
                </div>
                {ticketSeleccionado.fechaCierre && (
                  <div className="info-item">
                    <label>Fecha cierre:</label>
                    <span>{formatearFecha(ticketSeleccionado.fechaCierre)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="detalle-notas">
              <h3>📝 Notas</h3>
              <div className="notas-lista">
                {ticketSeleccionado.notas?.map((nota, index) => (
                  <div key={index} className="nota-item">
                    <div className="nota-header">
                      <span className="nota-usuario">{nota.usuario?.username || 'Usuario'}</span>
                      <span className="nota-fecha">{formatearFecha(nota.fecha)}</span>
                    </div>
                    <div className="nota-texto">{nota.texto}</div>
                  </div>
                ))}
              </div>
              {ticketSeleccionado.estado !== 'CERRADO' && (
                <div className="nota-nueva">
                  <textarea
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    placeholder="Agregar una nota..."
                    rows="3"
                  />
                  <button onClick={agregarNota} disabled={loading || !nuevaNota.trim()}>
                    Agregar Nota
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de ticket bloqueado */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Ticket en Uso</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>{modalMessage}</p>
              {lockedByAgent && (
                <div className="agent-info">
                  <p><strong>Agente:</strong> {lockedByAgent.username}</p>
                  <p><strong>Email:</strong> {lockedByAgent.email}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowModal(false)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tickets;
