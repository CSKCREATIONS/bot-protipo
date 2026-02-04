const { User, syncDatabase } = require('./models');
require('dotenv').config();

async function createAdmin() {
  try {
    await syncDatabase();
    
    // Verificar si el admin ya existe
    const existingAdmin = await User.findOne({ 
      where: { email: 'admin@whatsapp.com' } 
    });
    
    if (existingAdmin) {
      console.log('✅ El usuario admin ya existe:', existingAdmin.email);
      console.log('ID:', existingAdmin.id);
      console.log('Username:', existingAdmin.username);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }
    
    // Crear admin
    const admin = await User.create({
      username: 'admin',
      email: 'admin@whatsapp.com',
      password: 'admin123',
      role: 'admin'
    });
    
    console.log('✅ Usuario admin creado exitosamente!');
    console.log('Email:', admin.email);
    console.log('Password: admin123');
    console.log('Username:', admin.username);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdmin();
