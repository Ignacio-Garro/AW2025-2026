const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Conexión MySQL

// GET /vehiculos - Mostrar lista de vehículos con filtro opcional
router.get('/', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) { 
        return res.redirect('/login'); 
    }
    // crear query
    const filtroEstado = req.query.estado || ''; 
    let query = "SELECT * FROM vehiculos";
    let queryParams = []; // de momento solo tenemos un filtro possible, pero puede haber más

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

// GET /vehiculos/reservar/:id - Reservar un vehículo
router.get('/reservar/:id', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) { 
        return res.redirect('/login'); 
    }
    const idVehiculo = req.params.id; //id del vehiculo a reservar

    const query = "SELECT * FROM vehiculos WHERE id_vehiculo = ?";
    // ejecutar query
    db.query(query, [idVehiculo], (err, results) => {
        if (err) {
            console.error('Error reservando vehículo:', err);
            return res.status(500).send('Error en el servidor');
        }
        if (results.length === 0) { // si no existe el vehiculo
            return res.redirect('/vehiculos');
        }

        res.render('reservar', { //cuando es un ejs, renderizar la vista reservar.ejs con los datos usuarios y vehiculo
            usuario: req.session.usuario,
            vehiculo: results[0] // el coche
        });
    });
});

module.exports = router; // Exportamos el router para usarlo en app.js