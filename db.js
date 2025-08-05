const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Jz!4pWq9#XeL@1vGm2Rb', // si tu MySQL tiene contraseña, ponla aquí
  database: 'tienda_aurora' // asegúrate de que esta base existe
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL correctamente');
});

module.exports = connection;
