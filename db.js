const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'tramway.proxy.rlwy.net',
  user: 'root',
  password: 'RBRPfwkUhiYBAGyNuLMArVAdqYSZhMoU', // si tu MySQL tiene contraseña, ponla aquí
  database: 'railway', // asegúrate de que esta base existe
  port; 27387
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Error al conectar a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL correctamente');
});

module.exports = connection;
