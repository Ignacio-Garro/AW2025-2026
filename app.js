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
  res.sendFile(path.join(__dirname, 'views', 'inicioSinLogin.html'));
});

//CODIGO DE LOGIN

// Configurar EJS
app.set('view engine', 'ejs'); // vamos a usar EJS como motor de plantillas

//simulación de base de datos de usuarios - remplazar por base de datos real
const usuarios = [
  { email: 'ignacio@gmail.com', password: '123' },
  { email: 'ana@gmail.com', password: 'password123' }
];

app.get('/login', (req, res) => { // cuando abre el login
  res.render('login', { error: null, email: '' });
});


app.post('/login', (req, res) => { // cuando envía el formulario
  const { email, password } = req.body;
  const usuario = usuarios.find(u => u.email === email);

  if(!usuario) {
    res.render('login', { error: 'Usuario no encontrado', email });
  } else if(usuario.password !== password) {
    res.render('login', { error: 'Contraseña incorrecta', email });
  } else {
    res.redirect('/inicio.html'); // redirige a la página principal después del login
  }
});

app.get('/inicio', (req, res) => {
  res.send('¡Bienvenido a la página principal!');
});




//Iniciamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  console.log(`Abre: http://localhost:${PORT}`);
});