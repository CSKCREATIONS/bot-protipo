const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => {
  console.error('❌ Error al conectar MongoDB:', err);
  process.exit(1);
});

// Usuarios iniciales
const usuarios = [
  {
    username: 'admin',
    email: 'admin@chatbot.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    username: 'agente1',
    email: 'agente1@chatbot.com',
    password: 'agente123',
    role: 'agent'
  },
  {
    username: 'agente2',
    email: 'agente2@chatbot.com',
    password: 'agente123',
    role: 'agent'
  }
];

// Función para crear usuarios
async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de base de datos...\n');

    // Limpiar usuarios existentes (opcional - comenta esta línea si no quieres borrar)
    await User.deleteMany({});
    console.log('🗑️  Usuarios anteriores eliminados\n');

    // Crear usuarios
    for (const userData of usuarios) {
      const existingUser = await User.findOne({ 
        $or: [{ email: userData.email }, { username: userData.username }] 
      });

      if (existingUser) {
        console.log(`⚠️  Usuario "${userData.username}" ya existe, saltando...`);
        continue;
      }

      const user = new User(userData);
      await user.save();
      
      console.log(`✅ Usuario creado:`);
      console.log(`   Username: ${userData.username}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Role: ${userData.role}\n`);
    }

    console.log('🎉 Seed completado exitosamente!\n');
    console.log('📝 Credenciales de acceso:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    usuarios.forEach(u => {
      console.log(`\n${u.role === 'admin' ? '👑' : '👤'} ${u.username.toUpperCase()}`);
      console.log(`   Email:    ${u.email}`);
      console.log(`   Password: ${u.password}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar seed
seedDatabase();
