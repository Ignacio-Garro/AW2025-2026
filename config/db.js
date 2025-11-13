// 1. Importamos mysql2
const mysql = require('mysql2');

// 2. Creamos la conexión con la BD
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',   //XAMPP: vacío
    database: 'flota_vehiculos',
    port: 3306           
  });

// 3. Conectamos
connection.connect((err) => {
    if (err) {
      console.error('ERROR CONECTANDO A MYSQL:', err);
      process.exit(1);
    }
    console.log('Conectado a MySQL');
  });

// 4. Exportamos para usarlo en otros archivos
module.exports = connection;