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
  
  // Estados para modal de multimedia
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Estados para modal de estadísticas
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [agentesStats, setAgentesStats] = useState([]);

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

  const verEstadisticasAgentes = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets/stats/agentes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAgentesStats(response.data);
      setShowStatsModal(true);
    } catch (error) {
      console.error('Error cargando estadísticas de agentes:', error);
      alert('Error al cargar estadísticas de agentes');
    }
  };

  const exportarCSV = async () => {
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (filtroPrioridad) params.prioridad = filtroPrioridad;
      
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_URL}/tickets/exportar/csv${queryString ? '?' + queryString : ''}`;
      
      // Usar fetch con headers de autorización
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al descargar CSV');
      }
      
      // Crear blob y descargar
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `tickets_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      alert('Archivo CSV descargado correctamente');
    } catch (error) {
      console.error('Error exportando CSV:', error);
      alert('Error al exportar CSV: ' + error.message);
    }
  };

  const verArchivo = (archivo) => {
    setSelectedMedia(archivo);
    setShowMediaModal(true);
  };

  const getProxyUrl = (mediaUrl, mediaId) => {
    const authToken = localStorage.getItem('token');
    if (!authToken) return null;
    
    // Si hay mediaId, usarlo (URLs frescas)
    if (mediaId) {
      return `${API_URL}/tickets/media/download?mediaId=${mediaId}&token=${authToken}`;
    }
    
    // Si no, usar la URL almacenada
    if (mediaUrl) {
      const encodedUrl = encodeURIComponent(mediaUrl);
      return `${API_URL}/tickets/media/download?url=${encodedUrl}&token=${authToken}`;
    }
    
    return null;
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
            <div className="header-buttons">
              <button 
                onClick={verEstadisticasAgentes} 
                className="btn-stats"
                title="Ver estadísticas de agentes"
              >
                📊 Estadísticas
              </button>
              <button 
                onClick={exportarCSV} 
                className="btn-export"
                title="Exportar a CSV"
              >
                📥 Exportar CSV
              </button>
            </div>
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
                  <div className="ticket-nombre">👤 {ticket.nombreCliente || 'Sin nombre'}</div>
                  <div className="ticket-placa">🚗 {ticket.placa || 'Sin placa'}</div>
                  <div className="ticket-phone">📞 {ticket.phoneNumber}</div>
                  <div className="ticket-badges">
                    <span className={`badge-estado ${ticket.estado.toLowerCase()}`}>
                      {ticket.estado}
                    </span>
                    <span className={`badge-prioridad ${ticket.prioridad.toLowerCase()}`}>
                      {ticket.prioridad}
                    </span>
                    <span className="badge-contador">#{ticket.contadorTickets || 1}</span>
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
                {ticketSeleccionado.estado === 'CERRADO' ? (
                  <div className="ticket-cerrado-badge">
                    ✅ Ticket Cerrado
                  </div>
                ) : (
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
                  <label>👤 Nombre Cliente:</label>
                  <span><strong>{ticketSeleccionado.nombreCliente || 'Sin nombre'}</strong></span>
                </div>
                <div className="info-item">
                  <label>📞 Teléfono:</label>
                  <span>{ticketSeleccionado.phoneNumber}</span>
                </div>
                <div className="info-item">
                  <label>🚗 Placa:</label>
                  <span>{ticketSeleccionado.placa}</span>
                </div>
                <div className="info-item">
                  <label>🆔 Cédula:</label>
                  <span>{ticketSeleccionado.cedula}</span>
                </div>
                <div className="info-item">
                  <label>📊 Ticket del Cliente:</label>
                  <span><strong>#{ticketSeleccionado.contadorTickets || 1}</strong></span>
                </div>
                <div className="info-item">
                  <label>📊 Estado:</label>
                  <span className={`badge-estado ${ticketSeleccionado.estado.toLowerCase()}`}>
                    {ticketSeleccionado.estado}
                  </span>
                </div>
                <div className="info-item">
                  <label>🔥 Prioridad:</label>
                  <span className={`badge-prioridad ${ticketSeleccionado.prioridad.toLowerCase()}`}>
                    {ticketSeleccionado.prioridad}
                  </span>
                </div>
                <div className="info-item">
                  <label>👨‍💼 Asignado a:</label>
                  <span>{ticketSeleccionado.asignadoA?.username || 'Sin asignar'}</span>
                </div>
                <div className="info-item full-width">
                  <label>📝 Descripción:</label>
                  <span>{ticketSeleccionado.descripcion}</span>
                </div>
                <div className="info-item">
                  <label>📅 Fecha creación:</label>
                  <span>{formatearFecha(ticketSeleccionado.fechaCreacion)}</span>
                </div>
                {ticketSeleccionado.fechaCierre && (
                  <div className="info-item">
                    <label>🔒 Fecha cierre:</label>
                    <span>{formatearFecha(ticketSeleccionado.fechaCierre)}</span>
                  </div>
                )}
                {ticketSeleccionado.tiempoResolucion && (
                  <div className="info-item">
                    <label>⏱️ Tiempo Resolución:</label>
                    <span><strong>
                      {Math.floor(ticketSeleccionado.tiempoResolucion / 60)}h {ticketSeleccionado.tiempoResolucion % 60}min
                    </strong></span>
                  </div>
                )}
                {ticketSeleccionado.cerradoPor && (
                  <div className="info-item">
                    <label>✅ Cerrado por:</label>
                    <span>{ticketSeleccionado.cerradoPor.username}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Archivos Adjuntos */}
            {ticketSeleccionado.archivosAdjuntos && ticketSeleccionado.archivosAdjuntos.length > 0 && (
              <div className="detalle-archivos">
                <h3>📎 Archivos Adjuntos ({ticketSeleccionado.archivosAdjuntos.length})</h3>
                <div className="archivos-grid">
                  {ticketSeleccionado.archivosAdjuntos.map((archivo, index) => {
                    const iconos = {
                      'image': '📷',
                      'audio': '🎵',
                      'video': '🎥',
                      'document': '📄'
                    };
                    const nombres = {
                      'image': 'Imagen',
                      'audio': 'Audio',
                      'video': 'Video',
                      'document': 'Documento'
                    };
                    
                    return (
                      <div key={index} className="archivo-card">
                        {archivo.tipo === 'image' && archivo.mediaUrl ? (
                          <div className="archivo-preview" onClick={() => verArchivo(archivo)}>
                            <img 
                              src={getProxyUrl(archivo.mediaUrl, archivo.mediaId)} 
                              alt="Preview"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="archivo-icon-fallback" style={{display: 'none'}}>
                              {iconos[archivo.tipo] || '📎'}
                            </div>
                          </div>
                        ) : (
                          <div className="archivo-icon-large" onClick={() => verArchivo(archivo)}>
                            {iconos[archivo.tipo] || '📎'}
                          </div>
                        )}
                        <div className="archivo-info">
                          <div className="archivo-tipo">{nombres[archivo.tipo] || archivo.tipo}</div>
                          {archivo.caption && (
                            <div className="archivo-caption">{archivo.caption}</div>
                          )}
                          <div className="archivo-fecha">
                            {new Date(archivo.fecha).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                        <div className="archivo-acciones">
                          <button 
                            onClick={() => verArchivo(archivo)}
                            className="btn-ver-archivo"
                            title="Ver archivo"
                          >
                            👁️ Ver
                          </button>
                          )}
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

      {/* Modal de Visualización de Multimedia */}
      {showMediaModal && selectedMedia && (
        <div className="modal-overlay" onClick={() => setShowMediaModal(false)}>
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
                <div className="media-caption">
                  <strong>Descripción:</strong> {selectedMedia.caption}
                </div>
              )}
              
              <div className="media-container">
                {selectedMedia.tipo === 'image' && (
                  <img 
                    src={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)}
                    alt="Imagen adjunta"
                    className="media-preview-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" dy=".3em">❌ Error cargando imagen</text></svg>';
                    }}
                  />
                )}
                
                {selectedMedia.tipo === 'audio' && (
                  <audio 
                    controls 
                    className="media-preview-audio"
                    src={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)}
                  >
                    Tu navegador no soporta la reproducción de audio.
                  </audio>
                )}
                
                {selectedMedia.tipo === 'video' && (
                  <video 
                    controls 
                    className="media-preview-video"
                    src={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)}
                  >
                    Tu navegador no soporta la reproducción de video.
                  </video>
                )}
                
                {selectedMedia.tipo === 'document' && (
                  <div className="media-preview-document">
                    <p>📄 Documento</p>
                    <a 
                      href={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)}
                      download
                      className="btn-descargar"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ⬇️ Descargar Documento
                    </a>
                  </div>
                )}
              </div>
              
              <div className="media-info">
                <small>Fecha: {new Date(selectedMedia.fecha).toLocaleString('es-ES')}</small>
              </div>
            </div>
            <div className="modal-footer">
              <a 
                href={getProxyUrl(selectedMedia.mediaUrl, selectedMedia.mediaId)}
                download
                className="btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                ⬇️ Descargar
              </a>
              <button className="btn-primary" onClick={() => setShowMediaModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estadísticas de Agentes */}
      {showStatsModal && agentesStats.agentes && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Estadísticas de Agentes</h2>
              <button className="modal-close" onClick={() => setShowStatsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="stats-resumen">
                <div className="resumen-card">
                  <span className="resumen-label">Total Agentes:</span>
                  <span className="resumen-valor">{agentesStats.resumen?.totalAgentes || 0}</span>
                </div>
                <div className="resumen-card">
                  <span className="resumen-label">Promedio Global:</span>
                  <span className="resumen-valor">{agentesStats.resumen?.promedioGlobal ? 
                    `${Math.floor(agentesStats.resumen.promedioGlobal / 60)}h ${agentesStats.resumen.promedioGlobal % 60}min` 
                    : 'N/A'}</span>
                </div>
              </div>

              <div className="agentes-stats-list">
                {agentesStats.agentes.map((stat, index) => (
                  <div key={stat.agente.id} className="agente-stats-card">
                    <div className="agente-stats-header">
                      <h3>#{index + 1} {stat.agente.nombre}</h3>
                      <span className="agente-email">{stat.agente.email}</span>
                    </div>
                    <div className="agente-stats-grid">
                      <div className="stat-item">
                        <span className="stat-label">📊 Total Asignados</span>
                        <span className="stat-value">{stat.totalAsignados}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">⏳ Pendientes</span>
                        <span className="stat-value">{stat.ticketsPendientes}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">⚙️ En Proceso</span>
                        <span className="stat-value">{stat.ticketsEnProceso}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">✅ Cerrados</span>
                        <span className="stat-value">{stat.ticketsCerrados}</span>
                      </div>
                      <div className="stat-item highlight">
                        <span className="stat-label">⏱️ Tiempo Promedio</span>
                        <span className="stat-value">{stat.tiempoPromedioFormateado}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">📈 Tasa de Cierre</span>
                        <span className="stat-value">{stat.tasaCierre}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowStatsModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tickets;
