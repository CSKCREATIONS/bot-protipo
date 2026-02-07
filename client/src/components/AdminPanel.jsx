import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return 'N/A';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

function generarCSVdeAgentes(agentesArray) {
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
}

const descargarBlob = (content, filename, type = 'text/csv;charset=utf-8;') => {
  const blob = new Blob([content], { type });
  const url = globalThis.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  globalThis.URL.revokeObjectURL(url);
};

export default function AdminPanel() {
  // Minimal, self-contained state so component compiles without external dependencies
  const [seccionActual, setSeccionActual] = useState('usuarios');
  const [usuarios] = useState([]);
  const [tickets] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [estadisticas] = useState(null);
  const [user] = useState({ role: 'admin' });
  const [usuarioEditando] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'agent' });
  const [loading] = useState(false);
  const [filtrosReporte, setFiltrosReporte] = useState({ fechaInicio: '', fechaFin: '', estado: '', prioridad: '', asignadoA: '' });
  const [reporte, setReporte] = useState(null);
  const token = '';

  const onNuevo = () => setMostrarModal(true);
  const editarUsuario = () => {};
  const eliminarUsuario = () => {};
  const handleSubmit = (e) => { e.preventDefault(); setMostrarModal(false); };


  const estadisticasBody = (() => {
    if (user?.role !== 'admin') {
      return <div className="acceso-denegado">Acceso denegado. Sólo administradores pueden ver estas estadísticas.</div>;
    }
    if (!estadisticas) {
      return <div>Cargando estadísticas...</div>;
    }
    return <div>Mostrando estadísticas (datos de ejemplo no cargados en versión minimal).</div>;
  })();

  return (
    <div className="admin-panel">
      <header className="panel-header">
        <h1>Admin Panel</h1>
        <nav className="panel-nav">
          <button onClick={() => setSeccionActual('usuarios')}>Usuarios</button>
          <button onClick={() => setSeccionActual('estadisticas')}>Estadísticas</button>
          <button onClick={() => setSeccionActual('tickets')}>Tickets</button>
          <button onClick={() => setSeccionActual('reportes')}>Reportes</button>
        </nav>
      </header>

      {seccionActual === 'usuarios' && (
        <div className="seccion-usuarios">
          <div className="seccion-header">
            <h2>Gestión de Usuarios</h2>
            <button className="btn-nuevo" onClick={onNuevo}>➕ Nuevo Usuario</button>
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
                {usuarios.length === 0 ? (
                  <tr><td colSpan="5">No hay usuarios</td></tr>
                ) : usuarios.map((usuario) => (
                  <tr key={usuario._id}>
                    <td data-label="Usuario">
                      <div className="usuario-info">
                        <div className="avatar-small">{(usuario.username || 'U').charAt(0).toUpperCase()}</div>
                        <strong>{usuario.username}</strong>
                      </div>
                    </td>
                    <td data-label="Email">{usuario.email}</td>
                    <td data-label="Rol"><span className={`badge-rol ${usuario.role}`}>{usuario.role}</span></td>
                    <td data-label="Fecha Creación">{usuario.createdAt ? new Date(usuario.createdAt).toLocaleDateString('es-ES') : '-'}</td>
                    <td data-label="Acciones">
                      <div className="acciones">
                        <button className="btn-editar" onClick={() => editarUsuario(usuario)}>✏️</button>
                        <button className="btn-eliminar" onClick={() => eliminarUsuario(usuario._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {seccionActual === 'estadisticas' && (
        <div className="seccion-estadisticas">
          <h2>Estadísticas del Sistema</h2>
          {estadisticasBody}
        </div>
      )}

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
                {tickets.length === 0 ? <tr><td colSpan="7">No hay tickets</td></tr> : tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td><strong>{ticket.numeroTicket}</strong></td>
                    <td>{ticket.phoneNumber}</td>
                    <td>{ticket.placa || 'N/A'}</td>
                    <td><span className={`badge-estado ${ticket.estado?.toLowerCase() || ''}`}>{ticket.estado}</span></td>
                    <td><span className={`badge-prioridad ${ticket.prioridad?.toLowerCase() || ''}`}>{ticket.prioridad}</span></td>
                    <td>{ticket.asignadoA?.username || 'Sin asignar'}</td>
                    <td>{ticket.fechaCreacion ? new Date(ticket.fechaCreacion).toLocaleDateString('es-ES') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostrarModal && (
        <>
          <button type="button" className="modal-overlay" onClick={() => setMostrarModal(false)} aria-label="Cerrar modal" />
          <div className="modal-content">
            <div className="modal-header">
              <h2>{usuarioEditando ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <button className="btn-cerrar" onClick={() => setMostrarModal(false)}>✖</button>
            </div>

            <form onSubmit={handleSubmit} className="form-usuario">
              <div className="form-group">
                <label htmlFor="username-input">Usuario:</label>
                <input id="username-input" type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required placeholder="nombre_usuario" />
              </div>

              <div className="form-group">
                <label htmlFor="email-input">Email:</label>
                <input id="email-input" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="usuario@example.com" />
              </div>

              <div className="form-group">
                <label htmlFor="password-input">Contraseña:</label>
                <input id="password-input" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!usuarioEditando} placeholder={usuarioEditando ? 'Dejar vacío para no cambiar' : 'Contraseña'} />
              </div>

              <div className="form-group">
                <label htmlFor="role-select">Rol:</label>
                <select id="role-select" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="agent">Agente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancelar" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn-guardar" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </>
      )}

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

// Componente de Reportes (mantengo funcionalidad básica)
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
    if (!reporte?.tickets || reporte.tickets.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = ['Ticket', 'Fecha', 'Teléfono', 'Placa', 'Cédula', 'Estado', 'Prioridad', 'Asignado a', 'Fecha Cierre', 'Tiempo Resolución (min)'];
    const rows = reporte.tickets.map(ticket => {
      const tiempoResolucion = ticket.fechaCierre ? Math.round((new Date(ticket.fechaCierre) - new Date(ticket.fechaCreacion)) / 1000 / 60) : '';
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

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="seccion-reportes">
      <h2>📋 Generador de Reportes</h2>

      <div className="filtros-reporte">
        <div className="filtros-grid">
          <div className="filtro-item">
            <label htmlFor="fechaInicio-input">Fecha Inicio:</label>
            <input id="fechaInicio-input" type="date" value={filtrosReporte.fechaInicio} onChange={(e) => setFiltrosReporte({ ...filtrosReporte, fechaInicio: e.target.value })} />
          </div>

          <div className="filtro-item">
            <label htmlFor="fechaFin-input">Fecha Fin:</label>
            <input id="fechaFin-input" type="date" value={filtrosReporte.fechaFin} onChange={(e) => setFiltrosReporte({ ...filtrosReporte, fechaFin: e.target.value })} />
          </div>

          <div className="filtro-item">
            <label htmlFor="estado-select">Estado:</label>
            <select id="estado-select" value={filtrosReporte.estado} onChange={(e) => setFiltrosReporte({ ...filtrosReporte, estado: e.target.value })}>
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="ASIGNADO">Asignado</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </div>

          <div className="filtro-item">
            <label htmlFor="prioridad-select">Prioridad:</label>
            <select id="prioridad-select" value={filtrosReporte.prioridad} onChange={(e) => setFiltrosReporte({ ...filtrosReporte, prioridad: e.target.value })}>
              <option value="">Todas</option>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>

          <div className="filtro-item">
            <label htmlFor="agente-select">Agente:</label>
            <select id="agente-select" value={filtrosReporte.asignadoA} onChange={(e) => setFiltrosReporte({ ...filtrosReporte, asignadoA: e.target.value })}>
              <option value="">Todos</option>
              {usuarios.map(usuario => (<option key={usuario._id} value={usuario._id}>{usuario.username}</option>))}
            </select>
          </div>
        </div>

        <div className="filtros-acciones">
          <button className="btn-generar" onClick={generarReporte} disabled={cargando}>{cargando ? 'Generando...' : '🔍 Generar Reporte'}</button>
          <button className="btn-generar" onClick={exportarCSV}>⬇️ Exportar CSV</button>
        </div>
      </div>

      {(reporte || hasSearched) && (
        <div className="reporte-resultados">
          {reporte ? (
            <div>
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
                      const tiempoResolucion = ticket.fechaCierre ? Math.round((new Date(ticket.fechaCierre) - new Date(ticket.fechaCreacion)) / 1000 / 60) : null;
                      return (
                        <tr key={ticket._id}>
                          <td><strong>{ticket.numeroTicket}</strong></td>
                          <td>{new Date(ticket.fechaCreacion).toLocaleDateString('es-ES')}</td>
                          <td>{ticket.phoneNumber}</td>
                          <td>{ticket.placa || '-'}</td>
                          <td><span className={`badge-estado ${ticket.estado?.toLowerCase() || ''}`}>{ticket.estado}</span></td>
                          <td><span className={`badge-prioridad ${ticket.prioridad?.toLowerCase() || ''}`}>{ticket.prioridad}</span></td>
                          <td>{ticket.asignadoA?.username || 'Sin asignar'}</td>
                          <td>{tiempoResolucion ? `${tiempoResolucion} min` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : <div className="no-resultados">No se encontraron resultados para los filtros seleccionados.</div>}
        </div>
      )}
    </div>
  );
}

ReportesSection.propTypes = {
  token: PropTypes.string,
  usuarios: PropTypes.array,
  filtrosReporte: PropTypes.object.isRequired,
  setFiltrosReporte: PropTypes.func.isRequired,
  reporte: PropTypes.object,
  setReporte: PropTypes.func.isRequired,
};
