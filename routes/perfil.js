const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Conexión MySQL
const multer = require('multer');
const path = require('path');

//Usamos multer para poder subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/media/'); //Carpeta donde se guardarán las imágenes
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'perfil-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
});

// Middleware para verificar sesión
function verificarSesion(req, res, next) {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Ruta para mostrar el perfil
router.get('/perfil', verificarSesion, (req, res) => {
    const query = 'SELECT * FROM usuarios WHERE id_usuario = ?';
    
    db.query(query, [req.session.usuario.id_usuario], (err, results) => {
        if (err) {
            console.error('Error al cargar perfil:', err);
            return res.status(500).send('Error al cargar el perfil');
        }
        
        if (results.length === 0) {
            return res.redirect('/login');
        }
        
        const usuario = results[0];
        
        res.render('perfil', { 
            usuario: usuario,
            mensaje: req.query.mensaje || null,
            error: req.query.error || null
        });
    });
});

// Ruta para actualizar datos del perfil
router.post('/perfil/actualizar', verificarSesion, (req, res) => {
    const { nombre, correo, telefono } = req.body;
    
    // Verificar si el correo ya existe en otro usuario
    const checkQuery = 'SELECT id_usuario FROM usuarios WHERE correo = ? AND id_usuario != ?';
    
    db.query(checkQuery, [correo, req.session.usuario.id_usuario], (err, results) => {
        if (err) {
            console.error('Error al verificar correo:', err);
            return res.redirect('/perfil?error=Error al actualizar el perfil');
        }
        
        if (results.length > 0) {
            return res.redirect('/perfil?error=El correo ya está en uso');
        }
        
        // Actualizar datos
        const updateQuery = 'UPDATE usuarios SET nombre = ?, correo = ?, telefono = ? WHERE id_usuario = ?';
        
        db.query(updateQuery, [nombre, correo, telefono, req.session.usuario.id_usuario], (err, result) => {
            if (err) {
                console.error('Error al actualizar perfil:', err);
                return res.redirect('/perfil?error=Error al actualizar el perfil');
            }
            
            // Actualizar sesión
            req.session.usuario.nombre = nombre;
            req.session.usuario.correo = correo;
            req.session.usuario.telefono = telefono;
            
            res.redirect('/perfil?mensaje=Perfil actualizado correctamente');
        });
    });
});

// Ruta para cambiar contraseña
router.post('/perfil/cambiar-contrasena', verificarSesion, (req, res) => {
    const { contraseñaActual, contraseñaNueva, contraseñaConfirmar } = req.body;
    
    // Verificar contraseña actual
    const checkQuery = 'SELECT contraseña FROM usuarios WHERE id_usuario = ?';
    
    db.query(checkQuery, [req.session.usuario.id_usuario], (err, results) => {
        if (err) {
            console.error('Error al verificar contraseña:', err);
            return res.redirect('/perfil?error=Error al cambiar la contraseña');
        }
        
        if (results.length === 0) {
            return res.redirect('/perfil?error=Usuario no encontrado');
        }
        
        // Verificar contraseña actual
        if (results[0].contraseña !== contraseñaActual) {
            return res.redirect('/perfil?error=La contraseña actual es incorrecta');
        }
        
        // Verificar que las contraseñas nuevas coincidan
        if (contraseñaNueva !== contraseñaConfirmar) {
            return res.redirect('/perfil?error=Las contraseñas nuevas no coinciden');
        }
        
        // Validar longitud mínima
        if (contraseñaNueva.length < 8) {
            return res.redirect('/perfil?error=La contraseña debe tener al menos 6 caracteres');
        }
        
        // Actualizar contraseña
        const updateQuery = 'UPDATE usuarios SET contraseña = ? WHERE id_usuario = ?';
        
        db.query(updateQuery, [contraseñaNueva, req.session.usuario.id_usuario], (err, result) => {
            if (err) {
                console.error('Error al actualizar contraseña:', err);
                return res.redirect('/perfil?error=Error al cambiar la contraseña');
            }
            
            res.redirect('/perfil?mensaje=Contraseña cambiada correctamente');
        });
    });
});

// Ruta para actualizar imagen de perfil
router.post('/perfil/actualizar-imagen', verificarSesion, upload.single('imagen'), (req, res) => {
    
    if (!req.file) {
        console.error('No se seleccionó ninguna imagen.', err);
        return res.redirect('/perfil?error=No se seleccionó ninguna imagen');
    }
    
    const rutaImagen = '/media/' + req.file.filename;
    
    const updateQuery = 'UPDATE usuarios SET imagen = ? WHERE id_usuario = ?';
    
    db.query(updateQuery, [rutaImagen, req.session.usuario.id_usuario], (err, result) => {
        if (err) {
            console.error('Error al actualizar imagen:', err);
            return res.redirect('/perfil?error=Error al actualizar la imagen');
        }
        
        // Actualizar sesión
        req.session.usuario.imagen = rutaImagen;
        
        res.redirect('/perfil?mensaje=Imagen actualizada correctamente');
    });
});

// Ruta para actualizar preferencias de accesibilidad
router.post('/perfil/actualizar-preferencias', verificarSesion, (req, res) => {
    const { fontSize, theme } = req.body;
   
    const preferencias = JSON.stringify({
        fontSize: fontSize || 'normal',
        theme: theme || 'standard'
    });
    
    const updateQuery = 'UPDATE usuarios SET preferencias_accesibilidad = ? WHERE id_usuario = ?';
    
    db.query(updateQuery, [preferencias, req.session.usuario.id_usuario], (err, result) => {
        if (err) {
            console.error('Error al actualizar preferencias:', err);
            return res.redirect('/perfil?error=Error al actualizar las preferencias');
        }
        
        // Actualizar sesión
        req.session.usuario.preferencias_accesibilidad = JSON.parse(preferencias);
        
        res.redirect('/perfil?mensaje=Preferencias actualizadas correctamente');
    });
});

module.exports = router;