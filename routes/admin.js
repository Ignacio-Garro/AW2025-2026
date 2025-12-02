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

// Carga de vehiculos desde JSON
router.post('/cargar-json-vehiculos', upload.single('fichero_json'), (req, res) => { // multer fichero_json
    if (!req.file) return res.status(400).send('No se subió ningún archivo.');

    // Leemos el archivo subido
    const data = fs.readFileSync(req.file.path, 'utf8');
    const objetos = JSON.parse(data); // Asumimos que el JSON trae un array de vehículos
    
    // Insertamos cada vehículo en la base de datos, si existe lo actualizamos
    objetos.forEach(v => {
        const sql = `INSERT INTO vehiculos (matricula, marca, modelo, autonomia_km, id_concesionario) 
                     VALUES (?, ?, ?, ?, ?) 
                     ON DUPLICATE KEY UPDATE
                        marca = VALUES(marca),
                        modelo = VALUES(modelo),
                        autonomia_km = VALUES(autonomia_km),
                        id_concesionario = VALUES(id_concesionario)`; //si ya existe, actualizamos
        
        // corremos el query
        db.query(sql, [v.matricula, v.marca, v.modelo, v.autonomia, v.concesionario], (err) => {
           if(err) console.log("Error insertando: " + v.matricula);
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

module.exports = router; // Exportamos el router para usarlo en app.js