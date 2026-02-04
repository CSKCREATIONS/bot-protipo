-- Crear base de datos
CREATE DATABASE IF NOT EXISTS whatsapp_bot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE whatsapp_bot;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'agent') DEFAULT 'agent',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phoneNumber VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) DEFAULT '',
  placa VARCHAR(50) DEFAULT '',
  cedula VARCHAR(50) DEFAULT '',
  estado ENUM('INICIO', 'ESPERANDO_NOMBRE', 'ESPERANDO_PLACA', 'ESPERANDO_CEDULA', 'EN_COLA', 'ASIGNADO') DEFAULT 'INICIO',
  lastMessage TEXT,
  lastMessageTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  unreadCount INT DEFAULT 0,
  status ENUM('active', 'archived', 'blocked') DEFAULT 'active',
  assignedAgentId INT DEFAULT NULL,
  posicionEnCola INT DEFAULT NULL,
  timestampEnCola DATETIME DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assignedAgentId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_phone (phoneNumber),
  INDEX idx_estado_cola (estado, timestampEnCola)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId INT NOT NULL,
  `from` VARCHAR(50) NOT NULL,
  `to` VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('text', 'image', 'video', 'audio', 'document') DEFAULT 'text',
  direction ENUM('inbound', 'outbound') NOT NULL,
  status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
  whatsappMessageId VARCHAR(255) UNIQUE,
  mediaId VARCHAR(255),
  mediaUrl TEXT,
  caption TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_conversation_timestamp (conversationId, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numeroTicket VARCHAR(50) NOT NULL UNIQUE,
  conversationId INT NOT NULL,
  phoneNumber VARCHAR(50) NOT NULL,
  nombreCliente VARCHAR(255) NOT NULL,
  placa VARCHAR(50) DEFAULT '',
  cedula VARCHAR(50) DEFAULT '',
  descripcion TEXT DEFAULT 'Solicitud de atención',
  contadorTickets INT DEFAULT 1,
  estado ENUM('PENDIENTE', 'ASIGNADO', 'CERRADO') DEFAULT 'PENDIENTE',
  prioridad ENUM('BAJA', 'MEDIA', 'ALTA', 'URGENTE') DEFAULT 'MEDIA',
  asignadoA INT DEFAULT NULL,
  lockedBy INT DEFAULT NULL,
  lockedAt DATETIME DEFAULT NULL,
  fechaAsignacion DATETIME DEFAULT NULL,
  fechaCierre DATETIME DEFAULT NULL,
  fechaFinalizacion DATETIME DEFAULT NULL,
  tiempoResolucion INT DEFAULT NULL COMMENT 'Tiempo en minutos',
  cerradoPor INT DEFAULT NULL,
  notas TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (asignadoA) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (lockedBy) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (cerradoPor) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_estado_fecha (estado, createdAt),
  INDEX idx_asignado_estado (asignadoA, estado),
  INDEX idx_phone (phoneNumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar usuario admin por defecto (password: admin123)
INSERT INTO users (username, email, password, role) 
VALUES ('admin', 'admin@whatsapp.com', '$2a$10$xqxWJbVQhRnXw0WmQbXHPO5vHLhVN8YQ3HKN4xPJ.0aYxM7dKZLLi', 'admin')
ON DUPLICATE KEY UPDATE username = username;

-- Consulta para verificar las tablas
SELECT 'Base de datos creada correctamente' AS mensaje;
