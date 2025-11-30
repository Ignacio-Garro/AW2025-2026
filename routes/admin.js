const express = require('express');
const router = express.Router();

// Panel administrador
router.get('/', (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/login');
    }
    // Aquí podrías agregar validación extra: if (req.session.usuario.rol !== 'admin')...
    res.render('admin', { usuario: req.session.usuario, active: 'admin'});
});

module.exports = router; // Exportamos el router para usarlo en app.js