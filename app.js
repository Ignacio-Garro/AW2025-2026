// Importamos módulos
const express = require('express');
const session = require('express-session');
const path = require('path');
const { cargarDatosIniciales } = require('./public/js/cargaJSON');

// --- IMPORTAR RUTAS ---
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const vehiculosRoutes = require('./routes/vehiculos');
const adminRoutes = require('./routes/admin');
const perfilRoutes = require('./routes/perfil');

const PORT = 3000;
const app = express();

// Configuración de motor de vistas
app.set('views', path.join(__dirname, 'views')); 
app.set('view engine', 'ejs'); 

// Middlewares
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'secreto', 
  resave: false,
  saveUninitialized: true
}));

// --- USO DE RUTAS ---
app.use('/', indexRoutes);       // Maneja la raíz '/'
app.use('/', authRoutes);        // Maneja /login, /logout, /inicio
app.use('/vehiculos', vehiculosRoutes); // Maneja /vehiculos. OJO: En vehiculos.js la ruta ahora es '/'
app.use('/', adminRoutes);  // Maneja /admin (/gestionConcesionarios, /gestionVehiculos, /gestionUsuarios)
app.use('/', perfilRoutes); // Maneja /perfil de usuario (actualizacion de campos)


// Ruta para guardar preferencias de accesibilidad
app.post('/api/guardar-accesibilidad', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    // Guardamos las preferencias en la sesión del usuario en el servidor
    req.session.accesibilidad = {
        fontSize: req.body.fontSize,
        theme: req.body.theme
    };
    res.sendStatus(200); // 200-> OK
});


// Iniciamos servidor
cargarDatosIniciales().then(resultado => {
  app.listen(PORT, () => {
      console.log(` Servidor: http://localhost:${PORT}`);
      if (resultado.exito) {
          console.log(` ${resultado.mensaje}`);
      }
  });
});