const { User, syncDatabase } = require('./models');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetAdminPassword() {
  try {
    await syncDatabase();
    
    const admin = await User.findOne({ 
      where: { email: 'admin@whatsapp.com' } 
    });
    
    if (!admin) {
      console.log('❌ Usuario admin no encontrado');
      process.exit(1);
    }
    
    console.log('🔍 Usuario encontrado:', admin.email);
    
    // Probar contraseña actual
    const testPassword = 'admin123';
    const isMatch = await admin.comparePassword(testPassword);
    console.log(`\n🔐 Comparación de contraseña "${testPassword}":`, isMatch);
    
    if (!isMatch) {
      console.log('\n🔧 Reseteando contraseña...');
      admin.password = 'admin123';
      await admin.save();
      console.log('✅ Contraseña reseteada a: admin123');
      
      // Verificar nuevamente
      const admin2 = await User.findOne({ where: { email: 'admin@whatsapp.com' } });
      const isMatch2 = await admin2.comparePassword('admin123');
      console.log('✅ Verificación después del reset:', isMatch2);
    } else {
      console.log('✅ La contraseña ya es correcta');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAdminPassword();
