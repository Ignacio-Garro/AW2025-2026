// routes/concesionarios.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Conexión MySQL

//Verificar que esté logueado
router.use((req, res, next) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    next();
});

// Panel principal
router.get('/', (req, res) => {
    db.query('SELECT * FROM concesionarios ORDER BY id_concesionario', (err, concesionarios) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error del servidor');
        }

        res.render('gestionConcesionarios', {
            usuario: req.session.usuario,
            titulo: 'Gestión de Concesionarios',
            concesionarios: concesionarios
        });
    });
});

module.exports = router;