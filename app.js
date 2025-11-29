//Importamos módulos
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/db'); // Conexión MySQL

const { cargarDatosIniciales } = require('./public/js/cargaJSON');

const PORT = 3000;
const app = express();

app.set('views', path.join(__dirname, 'views')); 
//app.use(express.static(path.join(__dirname, 'views')));//Sirve todos los archivos de la carpeta views como estáticos.
app.use(express.static(path.join(__dirname, 'public')));//Sirve todos los archivos de la carpeta public como estáticos.
app.use(express.urlencoded({ extended: true }));//Permite que Express pueda leer datos enviados por formularios HTML (POST).
app.use(session({//para tener sesiones de usuario
  secret: 'secreto', // cualquier cadena aleatoria
  resave: false,
  saveUninitialized: true
}));


//Ruta principal → inicioSinLogin.html
app.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, 'public', 'inicioSinLogin.html'));
});

//CODIGO DE LOGIN-------------------
//cerrar sesion
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.send('Error al cerrar sesión');
    }
    // CAMBIO AQUÍ: En vez de '/login', redirige a la raíz '/'
    // La raíz '/' es la que carga 'inicioSinLogin.html'
    res.redirect('/'); 
  });
});

app.set('view engine', 'ejs'); // vamos a usar EJS como motor de plantillas

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
    // Guardar usuario en sesión
    req.session.usuario = usuario;

    res.redirect('/inicio');
  });
});

app.get('/inicio', (req, res) => {

  if (!req.session.usuario) {
    // Si no hay sesión, redirige al login
    return res.redirect('/login');
  }

  res.render('inicio', { usuario: req.session.usuario });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.send('Error al cerrar sesión');
    }
    res.redirect('/login'); // Redirige al login después de cerrar sesión
  });
});

//VEHICULOS---------------------
app.get('/vehiculos', (req, res) => {
  if (!req.session.usuario) { // solo muestra si hay sesión iniciada, sino redirige al login
    return res.redirect('/login'); 
  }
  const query = "SELECT * FROM vehiculos"; // consulta para obtener todos los vehículos

  db.query(query, (err, results) => { // ejecuta la consulta
    if (err) {
      console.error('Error consultando vehículos:', err);
      return res.status(500).send('Error en el servidor');
    }

  res.render('vehiculos', { usuario: req.session.usuario, vehiculos: results });//renderiza vehiculos.ejs con datos de usuario y vehículos
  });
});

//PANEL ADMINISTRADOR---------------------
app.get('/admin', (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  res.render('admin', { usuario: req.session.usuario, active: 'admin'});
});

//Iniciamos servidor cargando datos en la BD
cargarDatosIniciales().then(resultado => {
  app.listen(PORT, () => {
      console.log(`🚀 Servidor: http://localhost:${PORT}`);
      if (resultado.exito) {
          console.log(`✅ ${resultado.mensaje}`);
          console.log(`🔐 Admin: ${resultado.admin}`);
      }
  });
});