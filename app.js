//Importamos módulos
const express = require('express');
const path = require('path');
const db = require('./config/db'); // Conexión MySQL

const PORT = 3000;
const app = express();


//Sirve TODOS los archivos de 'views' como estáticos
//HTML, CSS, partials (navbar, footer), JS, imágenes, etc.
app.use(express.static(path.join(__dirname, 'views')));

//Sirve TODO lo que esté en 'public' (imágenes, JS)
app.use(express.static(path.join(__dirname, 'public')));

//Para leer formularios (POST)
app.use(express.urlencoded({ extended: true }));

//Ruta principal → inicioSinLogin.html
app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'public', 'html', 'inicioSinLogin.html'));
});

//CODIGO DE LOGIN

// Configurar EJS
app.set('view engine', 'ejs'); // vamos a usar EJS como motor de plantillas

//simulación de base de datos de usuarios - remplazar por base de datos real
//const usuarios = [
//  { email: 'ignacio@gmail.com', password: '123' },
//  { email: 'ana@gmail.com', password: 'password123' }
//];

app.get('/login', (req, res) => { // cuando abre el login
  res.render('login', { error: null, email: '' });
});


app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log("Correo recibido:", email, "| Contraseña:", password);

  const query = "SELECT * FROM usuarios WHERE correo = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("ERROR en consulta:", err);
      return res.render('login', { error: 'Error interno del servidor', email });
    }

    console.log("Resultados de la query:", results);

    if (results.length === 0) {
      return res.render('login', { error: 'Usuario no encontrado', email });
    }

    const usuario = results[0];

    if (usuario.contraseña !== password) {
      return res.render('login', { error: 'Contraseña incorrecta', email });
    }

    res.redirect('/html/inicio.html');
  });
});

app.get('/inicio', (req, res) => {
  res.send('¡Bienvenido a la página principal!');
});




//Iniciamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log(`Abre: http://localhost:${PORT}`);
});