const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'El nombre de usuario ya está en uso'
    },
    validate: {
      notEmpty: {
        msg: 'El nombre de usuario no puede estar vacío'
      },
      len: {
        args: [3, 50],
        msg: 'El nombre de usuario debe tener entre 3 y 50 caracteres'
      },
      is: {
        args: /^[a-zA-Z0-9_-]+$/,
        msg: 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos'
      },
      // Validación personalizada contra inyecciones
      noSQLInjection(value) {
        const dangerousPatterns = [
          /(%27)|(')|(--)|(% 23)|(#)/i,
          /union.*select/i,
          /insert.*into/i,
          /delete.*from/i,
          /drop.*table/i,
          /update.*set/i,
          /<script/i,
          /<iframe/i
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error('El nombre de usuario contiene caracteres no permitidos');
          }
        }
      }
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: {
      msg: 'El email ya está en uso'
    },
    validate: {
      notEmpty: {
        msg: 'El email no puede estar vacío'
      },
      isEmail: {
        msg: 'Debe ser un email válido'
      },
      len: {
        args: [5, 255],
        msg: 'El email debe tener entre 5 y 255 caracteres'
      },
      // Validación personalizada contra inyecciones
      noSQLInjection(value) {
        const dangerousPatterns = [
          /(%27)|(')|(--)|(%23)|(#)/i,
          /union.*select/i,
          /insert.*into/i,
          /delete.*from/i,
          /drop.*table/i,
          /update.*set/i,
          /<script/i,
          /<iframe/i
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error('El email contiene caracteres no permitidos');
          }
        }
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La contraseña no puede estar vacía'
      },
      len: {
        args: [6, 128],
        msg: 'La contraseña debe tener entre 6 y 128 caracteres'
      }
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'agent'),
    defaultValue: 'agent',
    validate: {
      isIn: {
        args: [['admin', 'agent']],
        msg: 'El rol debe ser admin o agent'
      }
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Método para comparar contraseñas
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
