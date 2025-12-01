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

// GET /vehiculos/reservarVehiculo/:id - Reservar un vehículo
router.get('/reservarVehiculo/:id', (req, res) => {
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

        res.render('reservarVehiculo', { //cuando es un ejs, renderizar la vista reservarVehiculo.ejs con los datos usuarios y vehiculo
            usuario: req.session.usuario,
            vehiculo: results[0] // el coche
        });
    });
});

// POST /vehiculos/reservarVehiculo - Procesar la reserva
router.post('/reservarVehiculo', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    //Recoger datos del formulario
    const { id_vehiculo, fecha_inicio, fecha_fin } = req.body;

    const id_usuario = req.session.usuario.id_usuario;

    //crear la query
    const queryReserva = `INSERT INTO reservas (
                            id_usuario,
                            id_vehiculo,
                            fecha_inicio,
                            fecha_fin,
                            estado) 
                            VALUES (?, ?, ?, ?, 'activa')`;
    //ejecutar la query
    db.query(queryReserva, [id_usuario, id_vehiculo, fecha_inicio, fecha_fin], (err, result) => {
        if (err) {
            console.error("Error al crear la reserva:", err);
            return res.send("Hubo un error al procesar tu reserva.");
        }
        //cambiar el estado del coche a reservado
        const queryUpdate = "UPDATE vehiculos SET estado = 'reservado' WHERE id_vehiculo = ?";

        db.query(queryUpdate, [id_vehiculo], (errUpdate, resultUpdate) => {
            if (errUpdate) {
                console.error("Error actualizando estado del vehículo:", errUpdate);
                return res.send("Error crítico: Reserva creada pero vehículo no actualizado.");
            }
            //log existoso de la reserva
            console.log(`Reserva completada: Usuario ${id_usuario} reservó Vehículo ${id_vehiculo}`);
            
            // redirigir a vehiculos
            res.redirect('/vehiculos'); 
        });
    });
});


// GET /vehiculos/reservas
router.get('/reservas', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    const idUsuario = req.session.usuario.id_usuario; 

    // crear query de reservas del usuario y del coche reservado en orden descendente cronológico
    const query = ` SELECT r.id_reserva, r.fecha_inicio, r.fecha_fin, r.estado, r.id_vehiculo, 
                                         v.marca, v.modelo, v.imagen, v.matricula
        FROM reservas r
        JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo 
        WHERE r.id_usuario = ?
        ORDER BY r.fecha_inicio DESC `;

    // ejecutar query
    db.query(query, [idUsuario], (err, results) => {
        if (err) {
            console.error("Error al obtener reservas:", err);
            return res.status(500).send("Error del servidor");
        }

        // si existoso, renderizar la vista reservas.ejs con los datos
        res.render('reservas', {
            usuario: req.session.usuario,
            reservas: results
        });
    });
});

//POST /vehiculos/cancelar
router.post('/cancelar', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) {
        return res.redirect('/login');
    }   
    const { id_reserva, id_vehiculo } = req.body;

    // crear query para cancelar reserva
    const queryCancelar = "UPDATE reservas SET estado = 'cancelada' WHERE id_reserva = ?";

    // ejecutar query
    db.query(queryCancelar, [id_reserva], (errReserva, result) => {    
        if (errReserva) {
            console.error("Error al cancelar la reserva:", errReserva);
            return res.status(500).send("Error del servidor");
        }

        //exito al cancelar reserva, ahora actualizar estado del vehiculo a disponible
        const queryLiberarVehiculo = "UPDATE vehiculos SET estado = 'disponible' WHERE id_vehiculo = ?";

        db.query(queryLiberarVehiculo, [id_vehiculo], (errVehiculo, resultVehiculo) => {
            if (errVehiculo) {
                console.error("Reserva cancelada pero error al liberar vehículo:", errVehiculo);
            }
            //exito al cancelar y liberar vehiculo
            res.redirect('/vehiculos/reservas'); 
        });
    });
});


//POST /vehiculos/finalizar
router.post('/finalizar', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) {
        return res.redirect('/login');
    }   

    const { id_reserva, id_vehiculo, kilometros, incidencias } = req.body;  
    // crear query para finalizar reserva
    const queryFinalizar = "UPDATE reservas SET estado = 'finalizada', kilometros_recorridos = ?, incidencias = ? WHERE id_reserva = ?";
    // ejecutar query
    db.query(queryFinalizar, [kilometros, incidencias, id_reserva], (err, result) => {    
        if (err) {
            console.error("Error al finalizar la reserva:", err);
            return res.status(500).send("Error del servidor");
        }
        //exito al finalizar reserva, ahora actualizar estado del vehiculo a disponible
        const queryLiberarVehiculo = "UPDATE vehiculos SET estado = 'disponible' WHERE id_vehiculo = ?";  

        db.query(queryLiberarVehiculo, [id_vehiculo], (errVehiculo, resultVehiculo) => {
            if (errVehiculo) {
                console.error("Reserva finalizada pero error al liberar vehículo:", errVehiculo);
            }
            //exito al finalizar y liberar vehiculo
            res.redirect('/vehiculos/reservas');
        });
    });
});

module.exports = router; // Exportamos el router para usarlo en app.js