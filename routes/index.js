const express = require('express');
const router = express.Router();
const path = require('path');

// Ruta principal (Landing page sin login)
router.get('/', (req, res) => {
   res.sendFile(path.join(__dirname, '../public', 'inicioSinLogin.html'));
});

module.exports = router; // Exportamos el router para usarlo en app.js