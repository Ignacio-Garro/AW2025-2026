const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Conexión MySQL

// GET /vehiculos Mostrar lista de vehículos con filtros avanzados
router.get('/', (req, res) => {
    // Verificación de sesión
    if (!req.session.usuario) { 
        return res.redirect('/login'); 
    }

    db.query('SELECT * FROM concesionarios', (err, concesionarios) => {
        if (err) {
            console.error('Error cargando concesionarios:', err);
            return res.status(500).send('Error en el servidor');
        }

        //craemos la query 
        let query = "SELECT * FROM vehiculos WHERE 1=1"; 
        let queryParams = []; 

        //Estado 
        if (req.query.estado) {
            query += " AND estado = ?";
            queryParams.push(req.query.estado);
        }

        //Concesionario
        if (req.query.concesionario) {
            query += " AND id_concesionario = ?";
            queryParams.push(req.query.concesionario);
        }

        //Autonomía

        if (req.query.autonomia) {
            query += " AND autonomia_km >= ?";
            queryParams.push(req.query.autonomia);
        }

        //Plazas
        if (req.query.plazas) {
            query += " AND numero_plazas = ?";
            queryParams.push(req.query.plazas);
        }

        //Color
        if (req.query.color) {
            query += " AND color LIKE ?"; //Like para búsqueda parcial
            queryParams.push('%' + req.query.color + '%');
        }

        // corremos query con los parámetros
        db.query(query, queryParams, (err, results) => {
            if (err) {
                console.error('Error consultando vehículos:', err);
                return res.status(500).send('Error en el servidor');
            }

            // 5. Renderizar vista pasando TODOS los datos necesarios
            res.render('vehiculos', { 
                usuario: req.session.usuario, 
                vehiculos: results,       // El resultado filtrado
                concesionarios: concesionarios, // La lista para el desplegable
                query: req.query          // Para mantener los filtros escritos en los inputs
            });
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
    //id_usuario y rol desde la sesión
    const { id_usuario, rol } = req.session.usuario;
    let queryParams = [];

    // Creamos una query que se adapta según el rol
    let query = `
        SELECT 
            r.id_reserva, r.fecha_inicio, r.fecha_fin, r.estado, r.id_vehiculo, 
            v.marca, v.modelo, v.imagen, v.matricula,
            u.nombre AS nombre_usuario, u.correo
        FROM reservas r
        JOIN vehiculos v ON r.id_vehiculo = v.id_vehiculo 
        JOIN usuarios u ON r.id_usuario = u.id_usuario
    `;

    //si es admin, no usamos el WHERE
    if (rol !== 'admin') {
        query += ' WHERE r.id_usuario = ?';
        queryParams.push(id_usuario);
    }

    //ordenar por fecha_inicio DESC
    query += ' ORDER BY r.fecha_inicio DESC';

    // ejecutar query
    db.query(query, queryParams, (err, results) => {
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
            return res.status(500).send("Error del servidor cancelando reserva");
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
    const queryFinalizar = `
    UPDATE reservas 
    SET estado = 'finalizada', 
        kilometros_recorridos = ?, 
        incidencias_reportadas = ?, 
        fecha_fin = NOW() 
    WHERE id_reserva = ?`;
    // ejecutar query
    db.query(queryFinalizar, [kilometros, incidencias, id_reserva], (err, result) => {    
        if (err) {
            console.error("Error al finalizar la reserva:", err);
            return res.status(500).send("Error del servidor finalizando reserva");
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