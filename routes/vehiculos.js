const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Conexión MySQL

// GET /vehiculos
router.get('/', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) { 
        return res.redirect('/login'); 
    }
    // crear query
    const filtroEstado = req.query.estado || ''; 
    let query = "SELECT * FROM vehiculos";
    let queryParams = [];

    // agregar filtro si existe a query
    if (filtroEstado) {
        query += " WHERE estado = ?"; 
        queryParams.push(filtroEstado);
    }
    // ejecutar query
    db.query(query, queryParams, (err, results) => {
        if (err) {// error en consulta
            console.error('Error consultando vehículos:', err);
            return res.status(500).send('Error en el servidor');
        }
        res.render('vehiculos', {  // render pagina vehiculos con datos
            usuario: req.session.usuario, 
            vehiculos: results, 
            filtroActual: filtroEstado 
        });
    });
});

module.exports = router; // Exportamos el router para usarlo en app.js