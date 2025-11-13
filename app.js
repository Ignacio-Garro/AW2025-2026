// 1. Importamos módulos
const express = require('express');
const path = require('path');
const db = require('./config/db'); // Conexión MySQL

const app = express();

// 2. Sirve TODOS los archivos de 'views' como estáticos
// → HTML, CSS, partials (navbar, footer), JS, imágenes, etc.
app.use(express.static(path.join(__dirname, 'views')));

// 2.1 Sirve TODO lo que esté en 'public' (imágenes, JS)
app.use(express.static(path.join(__dirname, 'public')));

// 3. Para leer formularios (POST)
app.use(express.urlencoded({ extended: true }));

// 4. Ruta principal → inicioSinLogin.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'inicioSinLogin.html'));
});

// 5. Puerto
const PORT = 3000;

// 6. Iniciamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log(`Abre: http://localhost:${PORT}`);
});