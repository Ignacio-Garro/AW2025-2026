const express = require('express');
const router = express.Router();
const multer = require('multer'); // Necesario para subir ficheros
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal
const fs = require('fs'); // para manejar ficheros
const db = require('../config/db'); // Conexión MySQL

// Panel administrador
router.get('/', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    // Aquí podrías agregar validación extra: if (req.session.usuario.rol !== 'admin')...
    res.render('admin', { usuario: req.session.usuario, active: 'admin'});
});



//GESTION ADMIN VEHICULOS
//------------------------------
// Muestra la página Gestion de Vehículos
router.get('/gestionVehiculos', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    // creamos query para selecionar todos los vehiculos
    const sql = 'SELECT * FROM vehiculos'; 
    // ejecutamos query
    db.query(sql, (errVehiculos, vehiculos) => {
        if (errVehiculos) {
            console.error(errVehiculos);
            return res.status(500).send("Error en la base de datos cargando vehiculos");
        }
        //Exito
        // Consultamos concesionarios para el desplegable del modal de "Crear Nuevo"
        db.query('SELECT * FROM concesionarios', (errConcesionarios, concesionarios) => {
            if (errConcesionarios) {
            console.error(errConcesionarios);
            return res.status(500).send("Error en la base de datos cargando concesionarios");
        }
            // Renderizamos la vista pasando los datos
            res.render('gestionVehiculos', { 
                vehiculos: vehiculos,
                concesionarios: concesionarios,
                usuario: req.session.usuario
            });
        });
    });
});
//cargar nuevo vehiculo individual del modal
router.post('/crear-vehiculo', (req, res) => {
    const { matricula, marca, modelo, año_matriculacion, precio, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario } = req.body;   
    const sql = `INSERT INTO vehiculos (matricula, marca, modelo, año_matriculacion,precio,numero_plazas, autonomia_km,color,imagen,estado, id_concesionario)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [matricula, marca, modelo, año_matriculacion, precio, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al crear el vehículo");
        }
        // Éxito
        res.redirect('/gestionVehiculos');
    });
});

// Carga de vehiculos desde JSON
router.post('/cargar-json-vehiculos', upload.single('fichero_json'), (req, res) => { // multer fichero_json
    if (!req.file) return res.status(400).send('No se subió ningún archivo.');

    // Leemos el archivo subido
    const data = fs.readFileSync(req.file.path, 'utf8');
    const objetos = JSON.parse(data); // Asumimos que el JSON trae un array de vehículos
    
    // Asumimos que el array está dentro de ".vehiculos"
        const listaVehiculos = objetos.vehiculos;
        
    // Insertamos cada vehículo en la base de datos, si existe lo actualizamos
    listaVehiculos.forEach(v => {
    // 1. Definimos la consulta SQL completa con todos los campos
    const sql = `INSERT INTO vehiculos 
        (matricula, marca, modelo, año_matriculacion, precio, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            marca = VALUES(marca),
            modelo = VALUES(modelo),
            año_matriculacion = VALUES(año_matriculacion),
            precio = VALUES(precio),
            numero_plazas = VALUES(numero_plazas),
            autonomia_km = VALUES(autonomia_km),
            color = VALUES(color),
            imagen = VALUES(imagen),
            estado = VALUES(estado),
            id_concesionario = VALUES(id_concesionario)`; //actualizamos todos los campos si la matriucla ya existe

    // corremos query
    db.query(sql, [v.matricula,v.marca,v.modelo,v.año_matriculacion, v.precio,v.numero_plazas,v.autonomia_km,v.color,v.imagen,v.estado,v.id_concesionario], (err) => {
        if (err) {
            console.log("Error insertando matrícula " + v.matricula + ": " + err.message);
        } else {
            console.log("Vehículo procesado: " + v.matricula);
        }
    });
});

    // Borramos el archivo temporal y recargamos
    fs.unlinkSync(req.file.path);
    res.redirect('/gestionVehiculos');
});

// Eliminar Vehículo 
router.post('/borrar-vehiculo/:id', (req, res) => {
    const sql = 'DELETE FROM vehiculos WHERE id_vehiculo = ?'; 
    db.query(sql, [req.params.id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al borrar el vehículo");
        }
        //exito 
        res.redirect('/gestionVehiculos');
    });
});

//editar un vehiculo con el modal /editar-vehiculo/:id
router.post('/editar-vehiculo/:id', (req, res) => {
    const idVehiculo = req.params.id; // Capturamos el ID de la URL
    const { matricula, marca, modelo, año_matriculacion, precio, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario } = req.body; // cogemos datos del formulario

    // creamos la consulta SQL para actualizar el vehículo
    const sql = `
        UPDATE vehiculos 
        SET 
            matricula = ?, 
            marca = ?, 
            modelo = ?, 
            año_matriculacion = ?, 
            precio = ?, 
            numero_plazas = ?, 
            autonomia_km = ?, 
            color = ?, 
            imagen = ?, 
            estado = ?, 
            id_concesionario = ?
        WHERE id_vehiculo = ?
    `;

    // ejecutamos query
    db.query(sql, [matricula, marca, modelo, año_matriculacion, precio, numero_plazas,autonomia_km, color, imagen, estado, id_concesionario,idVehiculo], (err, result) => {
        if (err) {
            console.error("Error actualizando vehículo: ", err);
            return res.status(500).send("Error al actualizar el vehículo");
        }
        
        // exito
        res.redirect('/gestionVehiculos');
    });
});

//GESTION ADMIN USUARIOS
//------------------------------
router.get('/gestionUsuarios', (req, res) => {
    //comprobar el login
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    // crear query de todos los usarios
    const sql = 'SELECT * FROM usuarios'; 
    
    // corremos query usuaios
    db.query(sql, (errUsuarios, listaUsuarios) => {
        if (errUsuarios) {
            console.error(errUsuarios);
            return res.status(500).send("Error cargando usuarios");
        }

        // segunda consulta para obtener concesionarios
        db.query('SELECT * FROM concesionarios', (errConcesionarios, listaConcesionarios) => {
            if (errConcesionarios) {
                console.error(errConcesionarios);
                return res.status(500).send("Error cargando concesionarios");
            }
            // renderizamos la vista pasando los datos
            res.render('gestionUsuarios', { 
                usuarios: listaUsuarios,
                concesionarios: listaConcesionarios,
                usuario: req.session.usuario
            });
        });
    });
});

module.exports = router; // Exportamos el router para usarlo en app.js