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
        (id_vehiculo, matricula, marca, modelo, año_matriculacion, precio, numero_plazas, autonomia_km, color, imagen, estado, id_concesionario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            matricula = VALUES(matricula),
            marca = VALUES(marca),
            modelo = VALUES(modelo),
            año_matriculacion = VALUES(año_matriculacion),
            precio = VALUES(precio),
            numero_plazas = VALUES(numero_plazas),
            autonomia_km = VALUES(autonomia_km),
            color = VALUES(color),
            imagen = VALUES(imagen),
            estado = VALUES(estado),
            id_concesionario = VALUES(id_concesionario)`; //actualizamos todos los campos si el id ya existe

    // corremos query
    db.query(sql, [v.id_vehiculo, v.matricula,v.marca,v.modelo,v.año_matriculacion, v.precio,v.numero_plazas,v.autonomia_km,v.color,v.imagen,v.estado,v.id_concesionario], (err) => {
        if (err) {
            console.log("Error insertando matrícula " + v.matricula + ": " + err.message);
        } else {
            console.log("Vehículo procesado: " + v.id_vehiculo);
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

//cargar nuevo usuario individual del modal
router.post('/crear-usuario', (req, res) => {
    // Nota: en el formulario el campo name="contrasena", en BD la columna es "contraseña"
    const { nombre, correo, contrasena, rol, telefono, imagen, id_concesionario } = req.body;   
    const sql = `INSERT INTO usuarios (nombre, correo, contraseña, rol, telefono, imagen, id_concesionario)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [nombre, correo, contrasena, rol, telefono, imagen, id_concesionario], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al crear el usuario");
        }
        // Éxito
        res.redirect('/gestionUsuarios');
    });
});

// Carga de usuarios desde JSON (CON PROMESAS)
router.post('/cargar-json-usuarios', upload.single('fichero_json'), (req, res) => {
    if (!req.file) return res.status(400).send('No se subió ningún archivo.');

    try {
        const data = fs.readFileSync(req.file.path, 'utf8');
        const objetos = JSON.parse(data);
        const listaUsuarios = objetos.usuarios || objetos;

        //Creamos un array de Promesas
        const promesasDeInsercion = listaUsuarios.map(u => {
            return new Promise((resolve, reject) => {
                
                const sql = `INSERT INTO usuarios 
                    (id_usuario, nombre, correo, contraseña, rol, telefono, imagen, id_concesionario)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        nombre = VALUES(nombre),
                        correo = VALUES(correo),
                        contraseña = VALUES(contraseña),
                        rol = VALUES(rol),
                        telefono = VALUES(telefono),
                        imagen = VALUES(imagen),
                        id_concesionario = VALUES(id_concesionario)`;

                db.query(sql, [u.id_usuario, u.nombre, u.correo, u.contrasena || u.contraseña, u.rol, u.telefono, u.imagen, u.id_concesionario], (err) => {
                    if (err) {
                        console.log("Error con usuario ID " + u.id_usuario + ": " + err.message);
                        resolve(); // Resolvemos aunque falle para que continúe con los demás
                    } else {
                        resolve(); // Éxito
                    }
                });
            });
        });

        //Promise.all espera a que TODAS las inserciones terminen antes de hacer el redirect
        Promise.all(promesasDeInsercion)
            .then(() => {
                // Solo cuando todo ha terminado, borramos el archivo y redirigimos UNA VEZ
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    res.redirect('/gestionUsuarios');
            })
            .catch(error => {
                console.error("Error general en carga json de usuarios:", error);
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                    res.status(500).send("Error procesando la carga json de usuarios.");
            });

    } catch (error) {
        console.error(error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).send("Error procesando el JSON: " + error.message);
    }
});

// Eliminar Usuario 
router.post('/borrar-usuario/:id', (req, res) => {
    const sql = 'DELETE FROM usuarios WHERE id_usuario = ?'; 
    db.query(sql, [req.params.id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al borrar el usuario");
        }
        //exito 
        res.redirect('/gestionUsuarios');
    });
});

//editar un usuario con el modal /editar-usuario/:id
router.post('/editar-usuario/:id', (req, res) => {
    const idUsuario = req.params.id; // Capturamos el ID de la URL

    const { nombre, correo, contrasena, rol, telefono, imagen, id_concesionario } = req.body; // cogemos datos del formulario

    // creamos la consulta SQL para actualizar el usuario
    // Y si la contraseña está vacía, no la actualizamos
    if (contrasena && contrasena.trim().length > 0) {
        
        //contraseña no vacía -> la actualizamos
        sql = `
            UPDATE usuarios 
            SET 
                nombre = ?, 
                correo = ?, 
                contraseña = ?, 
                rol = ?, 
                telefono = ?, 
                imagen = ?, 
                id_concesionario = ?
            WHERE id_usuario = ?`;
        // Pasamos la contraseña en los parámetros
        params = [nombre, correo, contrasena, rol, telefono, imagen, id_concesionario, idUsuario];

    } else {
        
        //contraseña vacía -> NO la actualizamos
        sql = `
            UPDATE usuarios 
            SET 
                nombre = ?, 
                correo = ?, 
                rol = ?, 
                telefono = ?, 
                imagen = ?, 
                id_concesionario = ?
            WHERE id_usuario = ?`;

        // Pasamos los parámetros SIN la contraseña
        params = [nombre, correo, rol, telefono, imagen, id_concesionario, idUsuario];
    }

    // ejecutamos query
    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Error actualizando usuario: ", err);
            return res.status(500).send("Error al actualizar el usuario");
        }
        
        // exito
        res.redirect('/gestionUsuarios');
    });
});


//-----CONCESIONARIOS GESTIÓN ADMIN-----

// Muestra la página Gestión de Concesionarios
router.get('/gestionConcesionarios', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }

    db.query('SELECT * FROM concesionarios ORDER BY id_concesionario', (err, concesionarios) => {
        if (err) {
            console.error('Error cargando concesionarios:', err);
            return res.status(500).send('Error del servidor');
        }

        res.render('gestionConcesionarios', {
            usuario: req.session.usuario,
            concesionarios: concesionarios,
            //Para mensajes de éxito/error
            error: req.query.error,
            success: req.query.success
        });
    });
});

//Crear concesionario
router.post('/crear-concesionario', (req, res) => {
    const { nombre, ciudad, direccion, telefono_contacto } = req.body;   
    const sql = `INSERT INTO concesionarios (nombre, ciudad, direccion, telefono_contacto)
                    VALUES (?, ?, ?, ?)`;

    db.query(sql, [nombre, ciudad,direccion, telefono_contacto], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error al crear el concesionario");
        }
        // Éxito
        res.redirect('/gestionConcesionarios');
    });
});

//Eliminar concesionario 
router.post('/eliminar-concesionario/:id', (req, res) => {
    const id = req.params.id;

    //Primero comprobamos si hay vehículos en ese concesionario
    db.query('SELECT COUNT(*) AS total FROM vehiculos WHERE id_concesionario = ?', [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error del servidor");
        }

        if (result[0].total > 0) {
            //Hay vehículos → NO se puede borrar
            return res.redirect('/gestionConcesionarios?error=No se puede eliminar: hay ' + result[0].total + ' vehículos asociados');
        }

        //No hay vehículos → sí se puede borrar
        db.query('DELETE FROM concesionarios WHERE id_concesionario = ?', [id], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Error al eliminar el concesionario");
            }
            res.redirect('/gestionConcesionarios?success=Concesionario eliminado');
        });
    });
});

//Editar concesionario
router.post('/editar-concesionario/:id', (req, res) => {
    const idConcesionario = req.params.id; // Capturamos el ID de la URL
    const { nombre, ciudad, direccion, telefono_contacto } = req.body; // Cogemos datos del formulario

    // Creamos la consulta SQL para actualizar el vehículo
    const sql = `
        UPDATE concesionarios 
        SET 
            nombre = ?, 
            ciudad = ?, 
            direccion = ?, 
            telefono_contacto = ?
        WHERE id_concesionario = ?
    `;

    // ejecutamos query
    db.query(sql, [nombre, ciudad,direccion, telefono_contacto,idConcesionario], (err, result) => {
        if (err) {
            console.error("Error actualizando concesionario: ", err);
            return res.status(500).send("Error al actualizar el concesionario");
        }
        
        // exito
        res.redirect('/gestionConcesionarios');
    });
});

module.exports = router; // Exportamos el router para usarlo en app.js