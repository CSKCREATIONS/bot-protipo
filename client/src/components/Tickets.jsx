import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './Tickets.css';
import './Tickets.responsive.css';
import { useNotification } from '../context/NotificationContext';
import { SkeletonList } from './Skeleton';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function Tickets({ onNavigate }) {
  const { showNotification } = useNotification();
  const [tickets, setTickets] = useState([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [stats, setStats] = useState(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [lockedByAgent, setLockedByAgent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [agentesStats, setAgentesStats] = useState([]);
  const [showTicketModal, setShowTicketModal] = useState(false);

  const token = localStorage.getItem('token');

  const [ticketsMenuOpen, setTicketsMenuOpen] = useState(false);
  const ticketsMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ticketsMenuRef.current && !ticketsMenuRef.current.contains(e.target)) {
        setTicketsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    cargarUsuarioActual();
  }, []);

  useEffect(() => {
    cargarTickets();
    cargarEstadisticas();
    const interval = setInterval(() => {
      cargarTickets();
      cargarEstadisticas();
    }, 10000);
    return () => clearInterval(interval);
  }, [currentUser, filtroEstado, filtroPrioridad]);

  const ticketsToShow = tickets.filter((ticket) => {
    if (filtroEstado && String((ticket.estado || '').toUpperCase()) !== String(filtroEstado).toUpperCase()) return false;
    if (filtroPrioridad && String((ticket.prioridad || '').toUpperCase()) !== String(filtroPrioridad).toUpperCase()) return false;
    if (!currentUser) return false;
    const creatorId = ticket.creadoPor?._id || ticket.creador?._id || ticket.createdBy?._id || ticket.usuario?._id || ticket.user?._id || ticket.autor?._id || ticket.creatorId || ticket.userId;
    const assignedId = ticket.asignadoA?._id;
    if (creatorId && String(creatorId) === String(currentUser._id)) return true;
    if (assignedId && String(assignedId) === String(currentUser._id)) return true;
    return false;
  });

  const cargarUsuarioActual = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data.user);
    } catch (error) {
      console.error('Error cargando usuario actual:', error);
      showNotification('Error al cargar el perfil', 'error');
    }
  };

  const cargarTickets = async () => {
    setLoadingTickets(true);
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPrioridad) params.prioridad = filtroPrioridad;
      if (currentUser?._id) {
        params.createdBy = currentUser._id;
        params.creatorId = currentUser._id;
        params.userId = currentUser._id;
      }
      const response = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error cargando tickets:', error);
      showNotification('Error al cargar tickets', 'error');
    } finally {
      setLoadingTickets(false);
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
      showNotification('Estado actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error actualizando estado:', error);
      showNotification('Error al actualizar el estado', 'error');
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
      showNotification('Prioridad actualizada correctamente', 'success');
    } catch (error) {
      console.error('Error actualizando prioridad:', error);
      showNotification('Error al actualizar la prioridad', 'error');
    } finally {
      setLoading(false);
    }
  };

  const asignarTicket = async (ticketId) => {
    setLoading(true);
    try {
      try {
        const bloqueoResponse = await axios.get(`${API_URL}/tickets/${ticketId}/bloqueo`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (bloqueoResponse.data.isLocked && !bloqueoResponse.data.isLockedByCurrentUser) {
          setLockedByAgent(bloqueoResponse.data.lockedBy);
          setModalMessage(`Este ticket está siendo atendido por ${bloqueoResponse.data.lockedBy.username}`);
          setShowModal(true);
          setLoading(false);
          return;
        }
      } catch (bloqueoError) {
        console.error('Error verificando bloqueo:', bloqueoError);
      }

      await axios.post(
        `${API_URL}/tickets/${ticketId}/asignar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await cargarTickets();
      showNotification('Ticket asignado correctamente', 'success');
    } catch (error) {
      console.error('Error asignando ticket:', error);
      if (error.response?.status === 423) {
        setLockedByAgent(error.response?.data?.lockedBy);
        setModalMessage(error.response?.data?.message);
        setShowModal(true);
      } else {
        showNotification('Error al asignar ticket', 'error');
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
      showNotification('Nota agregada correctamente', 'success');
    } catch (error) {
      console.error('Error agregando nota:', error);
      showNotification('Error al agregar nota', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cerrarTicket = async (ticketId) => {
    if (typeof window !== 'undefined' && !window.confirm('¿Estás seguro de cerrar este ticket?')) return;
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
        setShowTicketModal(false);
      }
      showNotification('Ticket cerrado correctamente', 'success');
    } catch (error) {
      console.error('Error cerrando ticket:', error);
      showNotification('Error al cerrar ticket', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-ES');
  };

  const puedeEditarTicket = (ticket) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (ticket.asignadoA && ticket.asignadoA._id === currentUser._id) return true;
    return false;
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const generarCSVdeAgentes = (agentesArray) => {
    if (!agentesArray || agentesArray.length === 0) return '';
    const headers = ['Agente','Email','TotalAsignados','Pendientes','EnProceso','Cerrados','TiempoPromedio(seg)','TiempoPromedio(formato)','TasaCierre'];
    const rows = agentesArray.map(s => {
      const agente = s.agente || {};
      const totalAsignados = s.totalAsignados ?? s.totalAsignadosCount ?? 0;
      const pendientes = s.ticketsPendientes ?? 0;
      const enProceso = s.ticketsEnProceso ?? 0;
      const cerrados = s.ticketsCerrados ?? 0;
      const tiempoPromedio = s.tiempoPromedio ?? s.promedioSegundos ?? '';
      const tasa = s.tasaCierre ?? s.tasa ?? '';
      return [
        `"${agente.nombre || agente.username || agente.email || 'N/A'}"`,
        `"${agente.email || ''}"`,
        totalAsignados,
        pendientes,
        enProceso,
        cerrados,
        tiempoPromedio,
        `"${formatTime(tiempoPromedio)}"`,
        tasa
      ].join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  };

  const descargarBlob = (content, filename, type = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type });
    const url = (window.URL || URL).createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    (window.URL || URL).revokeObjectURL(url);
  };

  const descargarEstadisticasAgentesCSV = () => {
    const agentesArray = agentesStats?.agentes || [];
    const csv = generarCSVdeAgentes(agentesArray);
    if (!csv) { showNotification('No hay estadísticas para descargar', 'warning'); return; }
    descargarBlob(csv, `estadisticas_agentes_${Date.now()}.csv`);
  };

  const descargarEstadisticasAgentesJSON = () => {
    const json = JSON.stringify(agentesStats || {}, null, 2);
    descargarBlob(json, `estadisticas_agentes_${Date.now()}.json`, 'application/json;charset=utf-8;');
  };

  const descargarEstadisticaAgenteCSV = (stat) => {
    const csv = generarCSVdeAgentes([stat]);
    if (!csv) { showNotification('No hay datos para este agente', 'warning'); return; }
    const nombre = stat?.agente?.nombre || stat?.agente?.username || stat?.agente?.email || 'agente';
    descargarBlob(csv, `estadisticas_agente_${nombre.replaceAll(/\s+/g,'_')}_${Date.now()}.csv`);
  };

  const descargarEstadisticaAgenteJSON = (stat) => {
    const json = JSON.stringify(stat || {}, null, 2);
    const nombre = stat?.agente?.nombre || stat?.agente?.username || stat?.agente?.email || 'agente';
    descargarBlob(json, `estadisticas_agente_${nombre.replaceAll(/\s+/g,'_')}_${Date.now()}.json`, 'application/json;charset=utf-8;');
  };

  const descargarConversacion = async (ticketId) => {
    try {
      const url = `${API_URL}/tickets/${ticketId}/conversacion/descargar`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al descargar conversación');
      const blob = await response.blob();
      const downloadUrl = (window.URL || URL).createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `conversacion_ticket_${ticketId}_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      (window.URL || URL).revokeObjectURL(downloadUrl);
      showNotification('Conversación descargada correctamente', 'success');
    } catch (error) {
      console.error('Error descargando conversación:', error);
      showNotification('Error al descargar la conversación', 'error');
    }
  };

  const verArchivo = (archivo) => {
    setSelectedMedia(archivo);
    setShowMediaModal(true);
  };

  const getProxyUrl = (mediaUrl, mediaId) => {
    const authToken = localStorage.getItem('token');
    if (!authToken) return null;
    if (mediaId) {
      return `${API_URL}/tickets/media/download?mediaId=${mediaId}&token=${authToken}`;
    }
    if (mediaUrl) {
      const encodedUrl = encodeURIComponent(mediaUrl);
      return `${API_URL}/tickets/media/download?url=${encodedUrl}&token=${authToken}`;
    }
    return null;
  };

  return (
    <div className="tickets-container">
      <div className="tickets-header" ref={ticketsMenuRef}>
        <h2>🎫 Tickets</h2>
        <div className="tickets-header-actions">
          <button
            className="reportes-menu-button"
            aria-haspopup="true"
            aria-expanded={ticketsMenuOpen}
            onClick={() => setTicketsMenuOpen(!ticketsMenuOpen)}
            title="Menú"
          >
            ☰
          </button>
          {ticketsMenuOpen && (
            <div className="reportes-menu-list">
              <button type="button" className="reportes-menu-item" onClick={() => onNavigate ? onNavigate('chat') : null}>💬 Chat</button>
              <button type="button" className="reportes-menu-item" onClick={() => onNavigate ? onNavigate('admin') : null}>👑 Panel Admin</button>
            </div>
          )}
        </div>
      </div>
      <div>
        <hr className="separator" />
        {stats && (
          <div className="stats-card">
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
          </div>
        )}
      </div>

      <div className="tickets-main">
        <div className="tickets-table-card">
          <div className="tickets-table-header">
            <div className="filters-row">
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
              <div className="solo-mios-note">Mostrando solo los tickets del usuario conectado</div>
            </div>
          </div>

          <div className="tickets-table-body">
            <table className="tabla-tickets-full">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Teléfono</th>
                  <th>Placa</th>
                  <th>Estado</th>
                  <th>Prioridad</th>
                  <th>Asignado a</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingTickets ? (
                  <tr><td colSpan="8"><SkeletonList count={4} /></td></tr>
                ) : ticketsToShow.length === 0 ? (
                  <tr><td colSpan="8">No hay tickets que coincidan con los filtros.</td></tr>
                ) : (
                  ticketsToShow.map((ticket) => (
                    <tr key={ticket._id} onClick={() => { setTicketSeleccionado(ticket); setShowTicketModal(true); }}>
                      <td><strong>{ticket.numeroTicket || ticket._id}</strong></td>
                      <td>{ticket.phoneNumber}</td>
                      <td>{ticket.placa || '-'}</td>
                      <td><span className={`badge-estado ${String(ticket.estado || '').toLowerCase()}`}>{ticket.estado || '-'}</span></td>
                      <td><span className={`badge-prioridad ${String(ticket.prioridad || '').toLowerCase()}`}>{ticket.prioridad || '-'}</span></td>
                      <td>{ticket.asignadoA?.username || 'Sin asignar'}</td>
                      <td>{ticket.fechaCreacion ? new Date(ticket.fechaCreacion).toLocaleDateString('es-ES') : '-'}</td>
                      <td>
                        <a href={`/tickets/${ticket._id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="accion-link">Abrir</a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modales (ticket bloqueado, media, detalle, estadísticas) */}
      {showModal && (
        <dialog className="modal-overlay" open aria-modal="true" tabIndex={-1}>
          <div className="modal-backdrop" role="button" tabIndex={0} onClick={() => setShowModal(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') { setShowModal(false); } }} onTouchStart={() => setShowModal(false)} aria-label="Cerrar modal">
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
                <button className="btn-primary" onClick={() => setShowModal(false)}>Entendido</button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {showMediaModal && selectedMedia && (
        <dialog className="modal-overlay" open aria-modal="true" tabIndex={-1}>
          <div className="modal-backdrop" role="button" tabIndex={0} onClick={() => setShowMediaModal(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') { setShowMediaModal(false); } }} onTouchStart={() => setShowMediaModal(false)} aria-label="Cerrar modal">
            <div className="modal-content media-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {selectedMedia.tipo === 'image' && '📷 Imagen'}
                  {selectedMedia.tipo === 'audio' && '🎵 Audio'}
                  {selectedMedia.tipo === 'video' && '🎥 Video'}
                  {selectedMedia.tipo === 'document' && '📄 Documento'}
                </h2>
                <button className="modal-close" onClick={() => setShowMediaModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                {selectedMedia.caption && (
                  <div className="media-caption"><strong>Descripción:</strong> {selectedMedia.caption}</div>
                )}
                <div className="media-container">
                  {selectedMedia.tipo === 'image' && (
                    <img src={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)} alt="Imagen adjunta" className="media-preview-image" onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" dy=".3em">❌ Error cargando imagen</text></svg>'; }} />
                  )}
                  {selectedMedia.tipo === 'audio' && (
                    <audio controls className="media-preview-audio" src={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)}>Tu navegador no soporta la reproducción de audio.</audio>
                  )}
                  {selectedMedia.tipo === 'video' && (
                    <video controls className="media-preview-video" src={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)}>Tu navegador no soporta la reproducción de video.</video>
                  )}
                  {selectedMedia.tipo === 'document' && (
                    <div className="media-preview-document">
                      <p>📄 Documento</p>
                      <a href={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)} download className="btn-descargar" target="_blank" rel="noopener noreferrer">⬇️ Descargar Documento</a>
                    </div>
                  )}
                </div>
                <div className="media-info"><small>Fecha: {new Date(selectedMedia.fecha).toLocaleString('es-ES')}</small></div>
              </div>
              <div className="modal-footer">
                <a href={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)} download className="btn-secondary" target="_blank" rel="noopener noreferrer">⬇️ Descargar</a>
                <button className="btn-primary" onClick={() => setShowMediaModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </dialog>
      )}

      {showTicketModal && ticketSeleccionado && (
        <dialog className="modal-overlay" open aria-modal="true" role="dialog" tabIndex={-1} onClick={() => { setShowTicketModal(false); setTicketSeleccionado(null); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') { setShowTicketModal(false); setTicketSeleccionado(null); } }} onTouchStart={() => { setShowTicketModal(false); setTicketSeleccionado(null); }}>
          <div className="modal-content ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎫 {ticketSeleccionado.numeroTicket}</h2>
              <button className="modal-close" onClick={() => { setShowTicketModal(false); setTicketSeleccionado(null); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detalle-header">
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px'}}>
                  <h3>{ticketSeleccionado.numeroTicket}</h3>
                  <div className="detalle-acciones">
                    <button onClick={() => descargarConversacion(ticketSeleccionado._id)} className="btn-descargar-conversacion" title="Descargar conversación completa">💬 Descargar Conversación</button>
                    {ticketSeleccionado.estado === 'CERRADO' ? (
                      <div className="ticket-cerrado-badge">✅ Ticket Cerrado</div>
                    ) : (
                      <>
                        {!ticketSeleccionado.asignadoA && (
                          <button onClick={() => asignarTicket(ticketSeleccionado._id)} disabled={loading} className="btn-asignar">✋ Asignar a mí</button>
                        )}
                        {puedeEditarTicket(ticketSeleccionado) && (
                          <button onClick={() => cerrarTicket(ticketSeleccionado._id)} className="btn-cerrar-ticket" disabled={loading}>✅ Cerrar Ticket</button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="detalle-controles">
                <div className="control-group">
                  <label>📊 Estado:</label>
                  <select value={ticketSeleccionado.estado} onChange={(e) => actualizarEstado(ticketSeleccionado._id, e.target.value)} disabled={loading || ticketSeleccionado.estado === 'CERRADO' || !puedeEditarTicket(ticketSeleccionado)} className="select-estado">
                    <option value="PENDIENTE">⏳ Pendiente</option>
                    <option value="ASIGNADO">👤 Asignado</option>
                    <option value="CERRADO">✅ Cerrado</option>
                  </select>
                </div>
                <div className="control-group">
                  <label>🔥 Prioridad:</label>
                  <select value={ticketSeleccionado.prioridad} onChange={(e) => actualizarPrioridad(ticketSeleccionado._id, e.target.value)} disabled={loading || ticketSeleccionado.estado === 'CERRADO' || !puedeEditarTicket(ticketSeleccionado)} className="select-prioridad">
                    <option value="BAJA">🟢 Baja</option>
                    <option value="MEDIA">🟡 Media</option>
                    <option value="ALTA">🟠 Alta</option>
                    <option value="URGENTE">🔴 Urgente</option>
                  </select>
                </div>
              </div>

              <div className="detalle-info">
                <div className="info-grid">
                  <div className="info-item"><label>👤 Nombre Cliente:</label><span><strong>{ticketSeleccionado.nombreCliente || 'Sin nombre'}</strong></span></div>
                  <div className="info-item"><label>📞 Teléfono:</label><span>{ticketSeleccionado.phoneNumber}</span></div>
                  <div className="info-item"><label>🚗 Placa:</label><span>{ticketSeleccionado.placa}</span></div>
                  <div className="info-item"><label>🆔 Cédula:</label><span>{ticketSeleccionado.cedula}</span></div>
                  <div className="info-item"><label>📊 Ticket del Cliente:</label><span><strong>#{ticketSeleccionado.contadorTickets || 1}</strong></span></div>
                  <div className="info-item"><label>📊 Estado:</label><span className={`badge-estado ${ticketSeleccionado.estado.toLowerCase()}`}>{ticketSeleccionado.estado}</span></div>
                  <div className="info-item"><label>🔥 Prioridad:</label><span className={`badge-prioridad ${ticketSeleccionado.prioridad.toLowerCase()}`}>{ticketSeleccionado.prioridad}</span></div>
                  <div className="info-item"><label>👨‍💼 Asignado a:</label><span>{ticketSeleccionado.asignadoA?.username || 'Sin asignar'}</span></div>
                  <div className="info-item"><label>📅 Fecha creación:</label><span>{formatearFecha(ticketSeleccionado.fechaCreacion)}</span></div>
                  {ticketSeleccionado.fechaFinalizacion && <div className="info-item"><label>✅ Fecha finalización:</label><span>{formatearFecha(ticketSeleccionado.fechaFinalizacion)}</span></div>}
                  {ticketSeleccionado.fechaCierre && <div className="info-item"><label>🔒 Fecha cierre:</label><span>{formatearFecha(ticketSeleccionado.fechaCierre)}</span></div>}
                  {ticketSeleccionado.tiempoResolucion && <div className="info-item"><label>⏱️ Tiempo Resolución:</label><span><strong>{Math.floor(ticketSeleccionado.tiempoResolucion / 60)}h {ticketSeleccionado.tiempoResolucion % 60}min</strong></span></div>}
                  {ticketSeleccionado.cerradoPor && <div className="info-item"><label>✅ Cerrado por:</label><span>{ticketSeleccionado.cerradoPor.username}</span></div>}
                </div>

                <div className="descripcion-destacada">
                  <h3>📝 Descripción del Ticket</h3>
                  <div className="descripcion-contenido">{ticketSeleccionado.descripcion}</div>
                </div>

                {ticketSeleccionado.archivosAdjuntos && ticketSeleccionado.archivosAdjuntos.length > 0 && (
                  <div className="detalle-archivos">
                    <h3>📎 Archivos Adjuntos ({ticketSeleccionado.archivosAdjuntos.length})</h3>
                    <div className="archivos-grid">
                      {ticketSeleccionado.archivosAdjuntos.map((archivo, index) => {
                        const iconos = { 'image': '📷', 'audio': '🎵', 'video': '🎥', 'document': '📄' };
                        const nombres = { 'image': 'Imagen', 'audio': 'Audio', 'video': 'Video', 'document': 'Documento' };
                        return (
                          <div key={index} className="archivo-card">
                            {archivo.tipo === 'image' && archivo.mediaUrl ? (
                              <div className="archivo-preview" onClick={() => verArchivo(archivo)}>
                                <img src={getProxyUrl(archivo.mediaUrl, archivo.mediaId)} alt="Preview" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                <div className="archivo-icon-fallback" style={{display: 'none'}}>{iconos[archivo.tipo] || '📎'}</div>
                              </div>
                            ) : (
                              <div className="archivo-icon-large" onClick={() => verArchivo(archivo)}>{iconos[archivo.tipo] || '📎'}</div>
                            )}
                            <div className="archivo-info">
                              <div className="archivo-tipo">{nombres[archivo.tipo] || archivo.tipo}</div>
                              {archivo.caption && <div className="archivo-caption">{archivo.caption}</div>}
                              <div className="archivo-fecha">{new Date(archivo.fecha).toLocaleDateString('es-ES')}</div>
                            </div>
                            <div className="archivo-acciones">
                              <button onClick={() => verArchivo(archivo)} className="btn-ver-archivo" title="Ver archivo">👁️ Ver</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="detalle-notas">
                  <h3>📝 Notas</h3>
                  <div className="notas-lista">
                    {ticketSeleccionado.notas?.map((nota, index) => (
                      <div key={index} className="nota-item">
                        <div className="nota-header"><span className="nota-usuario">{nota.usuario?.username || 'Usuario'}</span><span className="nota-fecha">{formatearFecha(nota.fecha)}</span></div>
                        <div className="nota-texto">{nota.texto}</div>
                      </div>
                    ))}
                  </div>
                  {ticketSeleccionado.estado !== 'CERRADO' && puedeEditarTicket(ticketSeleccionado) && (
                    <div className="nota-nueva">
                      <textarea value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="Agregar una nota..." rows="3" />
                      <button onClick={agregarNota} disabled={loading || !nuevaNota.trim()}>Agregar Nota</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => { setShowTicketModal(false); setTicketSeleccionado(null); }}>Cerrar</button>
            </div>
          </div>
        </dialog>
      )}

      {showStatsModal && agentesStats.agentes && (
        <dialog className="modal-overlay" open aria-modal="true" tabIndex={-1}>
          <div className="modal-backdrop" role="button" tabIndex={0} onClick={() => setShowStatsModal(false)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Escape') { setShowStatsModal(false); } }} onTouchStart={() => setShowStatsModal(false)} aria-label="Cerrar modal">
            <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📊 Estadísticas de Agentes</h2>
                <div className="stats-downloads">
                  <button className="btn-download" onClick={descargarEstadisticasAgentesCSV} title="Descargar CSV">⬇️ CSV</button>
                  <button className="btn-download" onClick={descargarEstadisticasAgentesJSON} title="Descargar JSON">⬇️ JSON</button>
                </div>
                <button className="modal-close" onClick={() => setShowStatsModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="stats-resumen">
                  <div className="resumen-card"><span className="resumen-label">Total Agentes:</span><span className="resumen-valor">{agentesStats.resumen?.totalAgentes || 0}</span></div>
                  <div className="resumen-card"><span className="resumen-label">Promedio Global:</span><span className="resumen-valor">{agentesStats.resumen?.promedioGlobal ? `${Math.floor(agentesStats.resumen.promedioGlobal / 60)}h ${agentesStats.resumen.promedioGlobal % 60}min` : 'N/A'}</span></div>
                </div>
                <div className="agentes-stats-list">
                  {agentesStats.agentes.map((stat, index) => (
                    <div key={stat.agente.id} className="agente-stats-card">
                      <div className="agente-stats-header"><h3>#{index + 1} {stat.agente.nombre}</h3><span className="agente-email">{stat.agente.email}</span></div>
                      <div className="agente-stats-grid">
                        <div className="stat-item"><span className="stat-label">📊 Total Asignados</span><span className="stat-value">{stat.totalAsignados}</span></div>
                        <div className="stat-item"><span className="stat-label">⏳ Pendientes</span><span className="stat-value">{stat.ticketsPendientes}</span></div>
                        <div className="stat-item"><span className="stat-label">⚙️ En Proceso</span><span className="stat-value">{stat.ticketsEnProceso}</span></div>
                        <div className="stat-item"><span className="stat-label">✅ Cerrados</span><span className="stat-value">{stat.ticketsCerrados}</span></div>
                        <div className="stat-item highlight"><span className="stat-label">⏱️ Tiempo Promedio</span><span className="stat-value">{stat.tiempoPromedioFormateado}</span></div>
                        <div className="stat-item"><span className="stat-label">📈 Tasa de Cierre</span><span className="stat-value">{stat.tasaCierre}%</span></div>
                      </div>
                      <div className="agente-stats-actions">
                        <button className="btn-small" onClick={() => descargarEstadisticaAgenteCSV(stat)}>⬇️ CSV</button>
                        <button className="btn-small" onClick={() => descargarEstadisticaAgenteJSON(stat)}>⬇️ JSON</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-primary" onClick={() => setShowStatsModal(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

Tickets.propTypes = {
  onNavigate: PropTypes.func.isRequired,
};

export default Tickets;