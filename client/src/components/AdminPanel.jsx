import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function AdminPanel({ onNavigate }) {
  const [seccionActual, setSeccionActual] = useState('usuarios'); // usuarios, estadisticas, tickets, reportes
  const [usuarios, setUsuarios] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [agentesStats, setAgentesStats] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('todos');
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'agent'
  });
  const [filtrosReporte, setFiltrosReporte] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: '',
    prioridad: '',
    asignadoA: ''
  });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');

  // Admin header menu state (moved here so it's available during render)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutsideAdmin = (e) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideAdmin);
    return () => document.removeEventListener('mousedown', handleClickOutsideAdmin);
  }, []);

  const navegarA = (seccion) => {
    // Si la sección es chat, tickets o admin (vistas principales), usar onNavigate
    if (seccion === 'chat' || seccion === 'tickets' || seccion === 'admin') {
      if (onNavigate) {
        onNavigate(seccion);
      }
    } else {
      // Para secciones internas del AdminPanel (usuarios, estadisticas, reportes)
      setSeccionActual(seccion);
    }
    setAdminMenuOpen(false);
  };

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 10000);
    return () => clearInterval(interval);
  }, [seccionActual]);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data.user);
      } catch (error) {
        console.error('Error al obtener perfil:', error);
      }
    };

    fetchProfile();
  }, []);

  const cargarDatos = () => {
    if (seccionActual === 'usuarios') {
      cargarUsuarios();
    } else if (seccionActual === 'estadisticas') {
      cargarEstadisticas();
    } else if (seccionActual === 'tickets') {
      cargarTickets();
    } else if (seccionActual === 'reportes') {
      // No auto-recargar reportes, solo cuando el usuario lo solicite
    }
  };

  const cargarUsuarios = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      const ticketsPromise = axios.get(`${API_URL}/tickets/stats/resumen`, headers).catch(e => ({ error: e }));
      const colaPromise = axios.get(`${API_URL}/cola/estadisticas`, headers).catch(e => ({ error: e }));
      const agentesPromise = axios.get(`${API_URL}/auth/agents`, headers).catch(e => ({ error: e }));
      const agentesStatsPromise = axios.get(`${API_URL}/tickets/stats/agentes`, headers).catch(e => ({ error: e }));

      const [ticketsRes, colaRes, agentesRes, agentesStatsRes] = await Promise.all([ticketsPromise, colaPromise, agentesPromise, agentesStatsPromise]);

      const ticketsData = ticketsRes?.data && !ticketsRes.error ? ticketsRes.data : null;
      const colaData = colaRes?.data && !colaRes.error ? colaRes.data : null;
      const agentesData = agentesRes?.data && !agentesRes.error ? agentesRes.data : null;
      const agentesStatsData = agentesStatsRes?.data && !agentesStatsRes.error ? agentesStatsRes.data : null;

      setEstadisticas({
        tickets: ticketsData || {},
        cola: colaData || {},
        agentesCount: Array.isArray(agentesData) ? agentesData.length : 0,
        error: (ticketsRes.error || colaRes.error || agentesRes.error) ? 'Error al cargar algunas estadísticas' : null
      });
      setAgentesStats(agentesStatsData);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setEstadisticas({ error: 'Error al cargar estadísticas' });
    }
  };

  const cargarTickets = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error cargando tickets:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (usuarioEditando) {
        // Actualizar usuario
        await axios.patch(
          `${API_URL}/auth/users/${usuarioEditando._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Usuario actualizado correctamente');
      } else {
        // Crear usuario
        await axios.post(
          `${API_URL}/auth/register`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Usuario creado correctamente');
      }

      setMostrarModal(false);
      setUsuarioEditando(null);
      setFormData({ username: '', email: '', password: '', role: 'agent' });
      cargarUsuarios();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert(error.response?.data?.error || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  const editarUsuario = (usuario) => {
    setUsuarioEditando(usuario);
    setFormData({
      username: usuario.username,
      email: usuario.email,
      password: '',
      role: usuario.role
    });
    setMostrarModal(true);
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await axios.delete(`${API_URL}/auth/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Usuario eliminado correctamente');
      cargarUsuarios();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      alert('Error al eliminar usuario');
    }
  };

  const abrirModalNuevo = () => {
    setUsuarioEditando(null);
    setFormData({ username: '', email: '', password: '', role: 'agent' });
    setMostrarModal(true);
  };

  // Estadística del agente seleccionado (si aplica) — comparar como strings
  const statSeleccionado = agentesStats?.agentes?.find(s => String(s.agente.id || s.agente._id) === String(usuarioSeleccionado)) || null;

  // Helpers para exportar estadísticas de agentes
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
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const descargarEstadisticasAgentesCSV = () => {
    const agentesArray = usuarioSeleccionado === 'todos' 
      ? (agentesStats?.agentes || [])
      : (agentesStats?.agentes || []).filter(s => String(s.agente.id || s.agente._id) === String(usuarioSeleccionado));
    const csv = generarCSVdeAgentes(agentesArray);
    if (!csv) { alert('No hay estadísticas para descargar'); return; }
    const filename = usuarioSeleccionado === 'todos' 
      ? `estadisticas_agentes_${Date.now()}.csv`
      : `estadisticas_agente_${usuarioSeleccionado}_${Date.now()}.csv`;
    descargarBlob(csv, filename);
  };

  const descargarEstadisticasAgentesJSON = () => {
    const dataToExport = usuarioSeleccionado === 'todos'
      ? agentesStats
      : (agentesStats?.agentes || []).find(s => String(s.agente.id || s.agente._id) === String(usuarioSeleccionado));
    const json = JSON.stringify(dataToExport || {}, null, 2);
    const filename = usuarioSeleccionado === 'todos'
      ? `estadisticas_agentes_${Date.now()}.json`
      : `estadisticas_agente_${usuarioSeleccionado}_${Date.now()}.json`;
    descargarBlob(json, filename, 'application/json;charset=utf-8;');
  };

  const descargarEstadisticaAgenteCSV = (stat) => {
    const csv = generarCSVdeAgentes([stat]);
    if (!csv) { alert('No hay datos para este agente'); return; }
    const nombre = stat?.agente?.nombre || stat?.agente?.username || stat?.agente?.email || 'agente';
    descargarBlob(csv, `estadisticas_agente_${nombre.replace(/\s+/g,'_')}_${Date.now()}.csv`);
  };

  const descargarEstadisticaAgenteJSON = (stat) => {
    const json = JSON.stringify(stat || {}, null, 2);
    const nombre = stat?.agente?.nombre || stat?.agente?.username || stat?.agente?.email || 'agente';
    descargarBlob(json, `estadisticas_agente_${nombre.replace(/\s+/g,'_')}_${Date.now()}.json`, 'application/json;charset=utf-8;');
  };

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header" ref={adminMenuRef}>
        <h1>👑 Panel de Administración</h1>
        <div className="admin-header-menu">
          <button
            className="reportes-menu-button"
            aria-haspopup="true"
            aria-expanded={adminMenuOpen}
            onClick={() => setAdminMenuOpen(!adminMenuOpen)}
            title="Menú"
          >
            ☰
          </button>
          {adminMenuOpen && (
            <ul className="reportes-menu-list" role="menu">
              <li className="reportes-menu-item" role="menuitem" onClick={() => navegarA('chat')}>💬 Chat</li>
              <li className="reportes-menu-item" role="menuitem" onClick={() => navegarA('tickets')}>🎫 Mis Tickets</li>
            </ul>
          )}
        </div>
      </div>

      {/* Navegación */}
      <div className="admin-nav">
        <button
          className={`nav-btn ${seccionActual === 'usuarios' ? 'active' : ''}`}
          onClick={() => setSeccionActual('usuarios')}
        >
          👥 Usuarios
        </button>
        {user?.role === 'admin' && (
          <button
            className={`nav-btn ${seccionActual === 'estadisticas' ? 'active' : ''}`}
            onClick={() => setSeccionActual('estadisticas')}
          >
            📊 Estadísticas
          </button>
        )}
        <button
          className={`nav-btn ${seccionActual === 'tickets' ? 'active' : ''}`}
          onClick={() => setSeccionActual('tickets')}
        >
          🎫 Gestión de Tickets
        </button>
        <button
          className={`nav-btn ${seccionActual === 'reportes' ? 'active' : ''}`}
          onClick={() => setSeccionActual('reportes')}
        >
          📋 Reportes
        </button>
      </div>

      {/* Contenido */}
      <div className="admin-content">
        {/* Sección Usuarios */}
        {seccionActual === 'usuarios' && (
          <div className="seccion-usuarios">
            <div className="seccion-header">
              <h2>Gestión de Usuarios</h2>
              <button className="btn-nuevo" onClick={abrirModalNuevo}>
                ➕ Nuevo Usuario
              </button>
            </div>

            <div className="tabla-container">
              <table className="tabla-usuarios">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha Creación</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario._id}>
                      <td data-label="Usuario">
                        <div className="usuario-info">
                          <div className="avatar-small">
                            {usuario.username.charAt(0).toUpperCase()}
                          </div>
                          <strong>{usuario.username}</strong>
                        </div>
                      </td>
                      <td data-label="Email">{usuario.email}</td>
                      <td data-label="Rol">
                        <span className={`badge-rol ${usuario.role}`}>
                          {usuario.role === 'admin' ? '👑 Admin' : '👤 Agente'}
                        </span>
                      </td>
                      <td data-label="Fecha Creación">{new Date(usuario.createdAt).toLocaleDateString('es-ES')}</td>
                      <td data-label="Acciones">
                        <div className="acciones">
                          <button
                            className="btn-editar"
                            onClick={() => editarUsuario(usuario)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-eliminar"
                            onClick={() => eliminarUsuario(usuario._id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sección Estadísticas */}
        {seccionActual === 'estadisticas' && (
          user?.role !== 'admin' ? (
            <div className="seccion-estadisticas">
              <h2>Estadísticas del Sistema</h2>
              <div className="acceso-denegado">Acceso denegado. Sólo administradores pueden ver estas estadísticas.</div>
            </div>
          ) : (
            estadisticas ? (
              <div className="seccion-estadisticas">
            <h2>Estadísticas del Sistema</h2>

            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-number">{estadisticas.tickets.total}</div>
                  <div className="stat-label">Total Tickets</div>
                </div>
              </div>

              <div className="stat-card abiertos">
                <div className="stat-icon">📥</div>
                <div className="stat-info">
                  <div className="stat-number">{estadisticas.tickets.pendientes || 0}</div>
                  <div className="stat-label">Tickets Pendientes</div>
                </div>
              </div>

              <div className="stat-card proceso">
                <div className="stat-icon">⚙️</div>
                <div className="stat-info">
                  <div className="stat-number">{estadisticas.tickets.asignados || 0}</div>
                  <div className="stat-label">En Proceso</div>
                </div>
              </div>

              <div className="stat-card resueltos">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <div className="stat-number">{estadisticas.tickets.cerrados || 0}</div>
                  <div className="stat-label">Cerrados</div>
                </div>
              </div>

              <div className="stat-card cola">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <div className="stat-number">{estadisticas.cola?.enCola || 0}</div>
                  <div className="stat-label">En Cola</div>
                </div>
              </div>

              <div className="stat-card asignados">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <div className="stat-number">{estadisticas.cola?.asignados || 0}</div>
                  <div className="stat-label">Asignados</div>
                </div>
              </div>

              <div className="stat-card usuarios">
                <div className="stat-icon">👤</div>
                <div className="stat-info">
                  <div className="stat-number">{(estadisticas?.agentesCount ?? usuarios.length) || 0}</div>
                  <div className="stat-label">Usuarios Registrados</div>
                </div>
              </div>

              <div className="stat-card tiempo">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <div className="stat-number">
                    {estadisticas.cola?.tiempoPromedioEnCola 
                      ? `${Math.round(estadisticas.cola.tiempoPromedioEnCola)}m`
                      : 'N/A'}
                  </div>
                  <div className="stat-label">Tiempo Promedio Cola</div>
                </div>
              </div>
            </div>

            <div className="prioridades-section">
              <h3>Tickets por Prioridad</h3>
              <div className="prioridades-grid">
                {estadisticas.tickets?.porPrioridad && Object.entries(estadisticas.tickets.porPrioridad).map(([prioridad, cantidad]) => (
                  <div key={prioridad} className={`prioridad-card ${prioridad.toLowerCase()}`}>
                    <div className="prioridad-nombre">{prioridad.toUpperCase()}</div>
                    <div className="prioridad-cantidad">{cantidad || 0}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estadísticas por Usuario */}
            {agentesStats && agentesStats.agentes && (
              <div className="agentes-stats-section">
                <div className="agentes-stats-header">
                  <h3>📊 Estadísticas por Usuario</h3>
                  <div className="stats-controls">
                    <select 
                      className="user-selector" 
                      value={usuarioSeleccionado} 
                      onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                    >
                      <option value="todos">Todos los usuarios</option>
                      {agentesStats.agentes.map((stat) => (
                        <option key={String(stat.agente.id || stat.agente._id)} value={String(stat.agente.id || stat.agente._id)}>
                          {stat.agente.nombre || stat.agente.username || stat.agente.email}
                        </option>
                      ))}
                    </select>
                    <div className="stats-downloads">
                      <button className="btn-download" onClick={descargarEstadisticasAgentesCSV} title="Descargar CSV">
                        ⬇️ CSV {usuarioSeleccionado === 'todos' ? 'Global' : ''}
                      </button>
                      <button className="btn-download" onClick={descargarEstadisticasAgentesJSON} title="Descargar JSON">
                        ⬇️ JSON {usuarioSeleccionado === 'todos' ? 'Global' : ''}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="stats-resumen-admin">
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

                {usuarioSeleccionado !== 'todos' && statSeleccionado ? (
                  <div className="agente-detailed">
                    <div className="agente-detailed-header">
                      <div className="agente-title">
                        <h3>#{statSeleccionado.agente.orden || ''} {statSeleccionado.agente.nombre || statSeleccionado.agente.username}</h3>
                        <div className="agente-email">{statSeleccionado.agente.email}</div>
                      </div>
                      <div className="agente-downloads">
                        <button className="btn-green" onClick={() => descargarEstadisticaAgenteCSV(statSeleccionado)}>⬇️ CSV</button>
                        <button className="btn-green" onClick={() => descargarEstadisticaAgenteJSON(statSeleccionado)}>⬇️ JSON</button>
                      </div>
                    </div>

                    <div className="stat-cards-row">
                      <div className="stat-card-mini">
                        <div className="mini-label">Total Asignados</div>
                        <div className="mini-value">{statSeleccionado.totalAsignados || 0}</div>
                      </div>
                      <div className="stat-card-mini">
                        <div className="mini-label">Pendientes</div>
                        <div className="mini-value">{statSeleccionado.ticketsPendientes || 0}</div>
                      </div>
                      <div className="stat-card-mini">
                        <div className="mini-label">En Proceso</div>
                        <div className="mini-value">{statSeleccionado.ticketsEnProceso || 0}</div>
                      </div>
                      <div className="stat-card-mini">
                        <div className="mini-label">Cerrados</div>
                        <div className="mini-value">{statSeleccionado.ticketsCerrados || 0}</div>
                      </div>
                      <div className="stat-card-mini highlight-mini">
                        <div className="mini-label">Tiempo Promedio</div>
                        <div className="mini-value">{statSeleccionado.tiempoPromedioFormateado || formatTime(statSeleccionado.tiempoPromedio || statSeleccionado.promedioSegundos)}</div>
                      </div>
                      <div className="stat-card-mini">
                        <div className="mini-label">Tasa de Cierre</div>
                        <div className="mini-value">{(statSeleccionado.tasaCierre ?? statSeleccionado.tasa ?? 0) + '%'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="agentes-stats-list">
                    {agentesStats.agentes
                      .filter(stat => usuarioSeleccionado === 'todos' || String(stat.agente.id || stat.agente._id) === String(usuarioSeleccionado))
                      .map((stat, index) => (
                      <div key={stat.agente.id || index} className="agente-stats-card">
                        <div className="agente-stats-header-card">
                          <div>
                            <h4>#{index + 1} {stat.agente.nombre || stat.agente.username}</h4>
                            <span className="agente-email">{stat.agente.email}</span>
                          </div>
                          <div className="agente-stats-actions">
                            <button className="btn-small" onClick={() => descargarEstadisticaAgenteCSV(stat)} title="Descargar CSV de este agente">⬇️ CSV</button>
                            <button className="btn-small" onClick={() => descargarEstadisticaAgenteJSON(stat)} title="Descargar JSON de este agente">⬇️ JSON</button>
                          </div>
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
                )}
              </div>
            )}
          </div>
            ) : (
              <div className="seccion-estadisticas">
                <h2>Estadísticas del Sistema</h2>
                <div>Cargando estadísticas...</div>
              </div>
            )
          )
        )}

        {/* Sección Tickets */}
        {seccionActual === 'tickets' && (
          <div className="seccion-tickets-admin">
            <h2>Todos los Tickets del Sistema</h2>
            <div className="tickets-count">Total: {tickets.length} tickets</div>

            <div className="tabla-container">
              <table className="tabla-tickets">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Teléfono</th>
                    <th>Placa</th>
                    <th>Estado</th>
                    <th>Prioridad</th>
                    <th>Asignado a</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket._id}>
                      <td><strong>{ticket.numeroTicket}</strong></td>
                      <td>{ticket.phoneNumber}</td>
                      <td>{ticket.placa || 'N/A'}</td>
                      <td>
                        <span className={`badge-estado ${ticket.estado.toLowerCase()}`}>
                          {ticket.estado}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-prioridad ${ticket.prioridad.toLowerCase()}`}>
                          {ticket.prioridad}
                        </span>
                      </td>
                      <td>{ticket.asignadoA?.username || 'Sin asignar'}</td>
                      <td>{new Date(ticket.fechaCreacion).toLocaleDateString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Usuario */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="btn-cerrar" onClick={() => setMostrarModal(false)}>
                ✖
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-usuario">
              <div className="form-group">
                <label>Usuario:</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  placeholder="nombre_usuario"
                />
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="usuario@example.com"
                />
              </div>

              <div className="form-group">
                <label>Contraseña:</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!usuarioEditando}
                  placeholder={usuarioEditando ? 'Dejar vacío para no cambiar' : 'Contraseña'}
                />
              </div>

              <div className="form-group">
                <label>Rol:</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="agent">Agente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancelar" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-guardar" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Sección Reportes */}
      {seccionActual === 'reportes' && (
        <ReportesSection
          token={token}
          usuarios={usuarios}
          filtrosReporte={filtrosReporte}
          setFiltrosReporte={setFiltrosReporte}
          reporte={reporte}
          setReporte={setReporte}
        />
      )}
    </div>
  );
}

// Componente de Reportes
function ReportesSection({ token, usuarios, filtrosReporte, setFiltrosReporte, reporte, setReporte }) {
  const [cargando, setCargando] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const generarReporte = async () => {
    setCargando(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (filtrosReporte.fechaInicio) params.append('fechaInicio', filtrosReporte.fechaInicio);
      if (filtrosReporte.fechaFin) params.append('fechaFin', filtrosReporte.fechaFin);
      if (filtrosReporte.estado) params.append('estado', filtrosReporte.estado);
      if (filtrosReporte.prioridad) params.append('prioridad', filtrosReporte.prioridad);
      if (filtrosReporte.asignadoA) params.append('asignadoA', filtrosReporte.asignadoA);

      const response = await axios.get(`${API_URL}/tickets/stats/reportes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReporte(response.data);
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte');
    } finally {
      setCargando(false);
    }
  };

  const exportarCSV = () => {
    if (!reporte || !reporte.tickets || reporte.tickets.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Crear CSV
    const headers = ['Ticket', 'Fecha', 'Teléfono', 'Placa', 'Cédula', 'Estado', 'Prioridad', 'Asignado a', 'Fecha Cierre', 'Tiempo Resolución (min)'];
    const rows = reporte.tickets.map(ticket => {
      const tiempoResolucion = ticket.fechaCierre 
        ? Math.round((new Date(ticket.fechaCierre) - new Date(ticket.fechaCreacion)) / 1000 / 60)
        : '';
      
      return [
        ticket.numeroTicket,
        new Date(ticket.fechaCreacion).toLocaleString('es-ES'),
        ticket.phoneNumber,
        ticket.placa || '',
        ticket.cedula || '',
        ticket.estado,
        ticket.prioridad,
        ticket.asignadoA?.username || 'Sin asignar',
        ticket.fechaCierre ? new Date(ticket.fechaCierre).toLocaleString('es-ES') : '',
        tiempoResolucion
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Descargar archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="seccion-reportes">
      <div >
        <h2>📋 Generador de Reportes</h2>
        
      </div>

      <div className="filtros-reporte">
        <div className="filtros-grid">
          <div className="filtro-item">
            <label>Fecha Inicio:</label>
            <input
              type="date"
              value={filtrosReporte.fechaInicio}
              onChange={(e) => setFiltrosReporte({ ...filtrosReporte, fechaInicio: e.target.value })}
            />
          </div>

          <div className="filtro-item">
            <label>Fecha Fin:</label>
            <input
              type="date"
              value={filtrosReporte.fechaFin}
              onChange={(e) => setFiltrosReporte({ ...filtrosReporte, fechaFin: e.target.value })}
            />
          </div>

          <div className="filtro-item">
            <label>Estado:</label>
            <select
              value={filtrosReporte.estado}
              onChange={(e) => setFiltrosReporte({ ...filtrosReporte, estado: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ASIGNADO">Asignado</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </div>

          <div className="filtro-item">
            <label>Prioridad:</label>
            <select
              value={filtrosReporte.prioridad}
              onChange={(e) => setFiltrosReporte({ ...filtrosReporte, prioridad: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>

          <div className="filtro-item">
            <label>Agente:</label>
            <select
              value={filtrosReporte.asignadoA}
              onChange={(e) => setFiltrosReporte({ ...filtrosReporte, asignadoA: e.target.value })}
            >
              <option value="">Todos</option>
              {usuarios.map(usuario => (
                <option key={usuario._id} value={usuario._id}>{usuario.username}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filtros-acciones">
          <button className="btn-generar" onClick={generarReporte} disabled={cargando}>
            {cargando ? 'Generando...' : '🔍 Generar Reporte'}
          </button>
        </div>
      </div>

      {(reporte || hasSearched) && (
        <div className="reporte-resultados">
          {!reporte ? (
            <div className="no-resultados">No se encontraron resultados para los filtros seleccionados.</div>
          ) : (
            <>
              <div className="reporte-stats">
                <h3>Resumen del Reporte</h3>
                <div className="stats-grid-reportes">
                  <div className="stat-card-reporte">
                    <div className="stat-label">Total Tickets</div>
                    <div className="stat-value">{reporte.estadisticas?.totalTickets ?? 0}</div>
                  </div>
                  <div className="stat-card-reporte">
                    <div className="stat-label">Pendientes</div>
                    <div className="stat-value">{reporte.estadisticas?.ticketsPorEstado?.PENDIENTE ?? 0}</div>
                  </div>
                  <div className="stat-card-reporte">
                    <div className="stat-label">Asignados</div>
                    <div className="stat-value">{reporte.estadisticas?.ticketsPorEstado?.ASIGNADO ?? 0}</div>
                  </div>
                  <div className="stat-card-reporte">
                    <div className="stat-label">Cerrados</div>
                    <div className="stat-value">{reporte.estadisticas?.ticketsPorEstado?.CERRADO ?? 0}</div>
                  </div>
                  <div className="stat-card-reporte">
                    <div className="stat-label">Tiempo Promedio Resolución</div>
                    <div className="stat-value">{reporte.estadisticas?.tiempoPromedioResolucion ?? 'N/A'} {reporte.estadisticas?.tiempoPromedioResolucion ? 'min' : ''}</div>
                  </div>
                </div>

                {reporte.estadisticas?.ticketsPorAgente && Object.keys(reporte.estadisticas.ticketsPorAgente).length > 0 && (
                  <div className="tickets-por-agente">
                    <h4>Tickets por Agente</h4>
                    <div className="agentes-grid">
                      {Object.entries(reporte.estadisticas.ticketsPorAgente).map(([agente, stats]) => (
                        <div key={agente} className="agente-card">
                          <div className="agente-nombre">{agente}</div>
                          <div className="agente-stats">
                            <span>Total: {stats.total}</span>
                            <span>Cerrados: {stats.cerrados || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="reporte-tabla">
                <h3>Detalle de Tickets ({(reporte.tickets || []).length})</h3>
                <div className="tabla-container">
                  <table className="tabla-tickets">
                    <thead>
                      <tr>
                        <th>Ticket</th>
                        <th>Fecha</th>
                        <th>Teléfono</th>
                        <th>Placa</th>
                        <th>Estado</th>
                        <th>Prioridad</th>
                        <th>Asignado</th>
                        <th>Tiempo Resolución</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reporte.tickets || []).map((ticket) => {
                        const tiempoResolucion = ticket.fechaCierre 
                          ? Math.round((new Date(ticket.fechaCierre) - new Date(ticket.fechaCreacion)) / 1000 / 60)
                          : null;
                        
                        return (
                          <tr key={ticket._id}>
                            <td><strong>{ticket.numeroTicket}</strong></td>
                            <td>{new Date(ticket.fechaCreacion).toLocaleDateString('es-ES')}</td>
                            <td>{ticket.phoneNumber}</td>
                            <td>{ticket.placa || '-'}</td>
                            <td>
                              <span className={`badge-estado ${ticket.estado.toLowerCase()}`}>
                                {ticket.estado}
                              </span>
                            </td>
                            <td>
                              <span className={`badge-prioridad ${ticket.prioridad.toLowerCase()}`}>
                                {ticket.prioridad}
                              </span>
                            </td>
                            <td>{ticket.asignadoA?.username || 'Sin asignar'}</td>
                            <td>{tiempoResolucion ? `${tiempoResolucion} min` : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;