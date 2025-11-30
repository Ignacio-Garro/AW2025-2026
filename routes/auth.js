const express = require('express');
const router = express.Router();
const db = require('../config/db');// Conexión MySQL

// GET Login
router.get('/login', (req, res) => {
    res.render('login', { error: null, email: '' });
});

// POST Login
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    //hacer query para buscar usuario con el req (datos del formulario)
    const query = "SELECT * FROM usuarios WHERE correo = ?";
    db.query(query, [email], (err, results) => {
        if (err) { // error en consulta
            console.error("ERROR en consulta:", err);
            return res.render('login', { error: 'Error interno del servidor', email });
        }

        if (results.length === 0) { // usuario no encontrado
            return res.render('login', { error: 'Usuario no encontrado', email });
        }

        const usuario = results[0];

        if (usuario.contraseña !== password) { // contraseña incorrecta
            return res.render('login', { error: 'Contraseña incorrecta', email });
        }
        
        req.session.usuario = usuario; //guardar usuario en sesión
        res.redirect('/inicio'); // redirigir a inicio despues de login exitoso
    });
});

// GET Inicio
router.get('/inicio', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    res.render('inicio', { usuario: req.session.usuario }); //al cargar pagina inicio, pasar datos usuario
});

// GET Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.send('Error al cerrar sesión');
        }
        res.redirect('/'); 
    });
});

module.exports = router; // Exportamos el router para usarlo en app.js