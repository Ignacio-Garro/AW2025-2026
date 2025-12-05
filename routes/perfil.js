const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Conexión MySQL

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
router.post('/perfil/cambiar-contraseña', verificarSesion, (req, res) => {
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
        if (contrasenaNueva !== contraseñaConfirmar) {
            return res.redirect('/perfil?error=Las contraseñas nuevas no coinciden');
        }
        
        // Validar longitud mínima
        if (contraseñaNueva.length < 6) {
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
router.post('/perfil/actualizar-imagen', verificarSesion, (req, res) => {
    
});

// Ruta para actualizar preferencias de accesibilidad
router.post('/perfil/actualizar-preferencias', verificarSesion, (req, res) => {
    
});

module.exports = router;