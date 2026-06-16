import React, { useEffect, useState } from 'react';
import './Toast.css';

const ToastContainer = ({ notifications, removeNotification }) => {
  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

const Toast = ({ notification, onClose }) => {
  const { message, type } = notification;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[type] || 'ℹ️';

  return (
    <div className={`toast ${type} ${visible ? 'show' : 'hide'}`}>
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={handleClose}>✕</button>
    </div>
  );
};

export default ToastContainer;