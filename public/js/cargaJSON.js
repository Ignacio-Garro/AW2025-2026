const fs = require('fs').promises;
const path = require('path');
const db = require('../../config/db');

// cargar el JSON 
async function cargarDatosIniciales() {
    try {
        console.log('\nVerificando base de datos...');
        
        let concesTotal = 0, usersTotal = 0, vehiTotal = 0;

        // Validaciones REGEX
        const emailRegex = /^[a-zA-Z0-9._%+-]+@voltiaDrive\.es$/;
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        const phoneRegex = /^[0-9]{9}$/;
        
        // Verificamos estado actual
        try {
            const [conces] = await new Promise(r => db.query("SELECT COUNT(*) as total FROM Concesionarios", (e, res) => r(e ? [{total:0}] : res)));
            concesTotal = conces[0]?.total || 0;
        } catch(e) { console.log('  Tabla Concesionarios no existe'); }
        
        try {
            const [users] = await new Promise(r => db.query("SELECT COUNT(*) as total FROM usuarios", (e, res) => r(e ? [{total:0}] : res)));
            usersTotal = users[0]?.total || 0;
        } catch(e) { console.log('  Tabla usuarios no existe'); }
        
        try {
            const [vehi] = await new Promise(r => db.query("SELECT COUNT(*) as total FROM Vehiculos", (e, res) => r(e ? [{total:0}] : res)));
            vehiTotal = vehi[0]?.total || 0;
        } catch(e) { console.log('  Tabla Vehiculos no existe'); }
        
        console.log(`Estado BD: ${concesTotal}C | ${usersTotal}U | ${vehiTotal}V`);
        
        // Carga de JSONs
        console.log('\nCargando JSON...');
        const concesionariosPath = path.join(__dirname, '../..', 'public', 'json', 'concesionarios.json');
        const usuariosPath = path.join(__dirname, '../..', 'public', 'json', 'usuarios.json');
        const vehiculosPath = path.join(__dirname, '../..', 'public', 'json', 'vehiculos.json');
        
        const concesionarios = JSON.parse(await fs.readFile(concesionariosPath, 'utf8')).concesionarios;
        const usuarios = JSON.parse(await fs.readFile(usuariosPath, 'utf8')).usuarios;
        const vehiculos = JSON.parse(await fs.readFile(vehiculosPath, 'utf8')).vehiculos;
        
        console.log(`JSON encontrado: ${concesionarios.length} Concesionarios | ${usuarios.length} Usuarios | ${vehiculos.length} Vehiculos`);
        
        // CARGAMOS LOS CONCESIONARIOS
        console.log('\nCargando CONCESIONARIOS...');
        let consProcesados = 0;

        for (const c of concesionarios) {
            if (!phoneRegex.test(c.telefono_contacto)) {
                console.log(`  ❌ Concesionario NO cargado (${c.nombre}): Teléfono inválido`);
                continue;
            }

            await new Promise(resolve => {
                const sql = `
                    INSERT INTO Concesionarios (id_concesionario, nombre, ciudad, direccion, telefono_contacto) 
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        nombre = VALUES(nombre),
                        ciudad = VALUES(ciudad),
                        direccion = VALUES(direccion),
                        telefono_contacto = VALUES(telefono_contacto)
                `;

                db.query(sql, [c.id_concesionario, c.nombre, c.ciudad, c.direccion, c.telefono_contacto], async (err, result) => {
                    if (err) {
                        console.log(`  ❌ Error Concesionario ${c.id_concesionario}: ${err.message}`);
                        resolve(); return;
                    }
                    
                    let statusIcon = "📌"; // Sin cambios
                    if (result.affectedRows === 1) statusIcon = "✅"; // Insertado
                    if (result.affectedRows === 2) statusIcon = "🔄"; // Actualizado

                    console.log(`  ${statusIcon} Concesionario ${c.id_concesionario} (${c.nombre})`);
                    consProcesados++;
                    resolve();
                });
            });
        }
        
        // CARGAMOS LOS USUARIOS
        console.log('\nCargando USUARIOS...');
        let usersProcesados = 0;

        for (const u of usuarios) {
            if (!emailRegex.test(u.correo)) {
                console.log(`  ❌ Usuario NO cargado (${u.correo}): Correo inválido`); continue;
            }
            if (!passRegex.test(u.contraseña)) {
                console.log(`  ❌ Usuario NO cargado (${u.correo}): Contraseña insegura`); continue;
            }
            if (!phoneRegex.test(u.telefono)) {
                console.log(`  ❌ Usuario NO cargado (${u.correo}): Teléfono inválido`); continue;
            }

            await new Promise(resolve => {
                const sql = `
                    INSERT INTO usuarios (id_usuario, nombre, correo, contraseña, telefono, imagen, id_concesionario, rol, preferencias_accesibilidad) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        nombre = VALUES(nombre),
                        correo = VALUES(correo),
                        contraseña = VALUES(contraseña),
                        telefono = VALUES(telefono),
                        imagen = VALUES(imagen),
                        id_concesionario = VALUES(id_concesionario),
                        rol = VALUES(rol),
                        preferencias_accesibilidad = VALUES(preferencias_accesibilidad)
                `;

                const prefs = JSON.stringify(u.preferencias_accesibilidad);

                db.query(sql, [u.id_usuario, u.nombre, u.correo, u.contraseña, u.telefono, u.imagen, u.id_concesionario, u.rol, prefs], async (err, result) => {
                    if (err) {
                        console.log(`  ❌ Error Usuario ${u.correo}: ${err.message}`);
                        resolve(); return;
                    }
                    
                    let statusIcon = "📌"; 
                    if (result.affectedRows === 1) statusIcon = "✅"; 
                    if (result.affectedRows === 2) statusIcon = "🔄"; 

                    console.log(`  ${statusIcon} Usuario ${u.nombre} (${u.rol})`);
                    usersProcesados++;
                    resolve();
                });
            });
        }
        
        // CARGAMOS LOS VEHÍCULOS
        console.log('\nCargando VEHÍCULOS...');
        let vehiProcesados = 0;
        
        for (const v of vehiculos) {
            await new Promise(resolve => {
                const sql = `
                    INSERT INTO Vehiculos (id_vehiculo, matricula, marca, modelo, año_matriculacion, precio, numero_plazas, color, autonomia_km, imagen, estado, id_concesionario) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        matricula = VALUES(matricula),
                        marca = VALUES(marca),
                        modelo = VALUES(modelo),
                        año_matriculacion = VALUES(año_matriculacion),
                        precio = VALUES(precio),
                        numero_plazas = VALUES(numero_plazas),
                        color = VALUES(color),
                        autonomia_km = VALUES(autonomia_km),
                        imagen = VALUES(imagen),
                        estado = VALUES(estado),
                        id_concesionario = VALUES(id_concesionario)
                `;

                db.query(sql, [v.id_vehiculo, v.matricula, v.marca, v.modelo, v.año_matriculacion, v.precio, v.numero_plazas, v.color, v.autonomia_km, v.imagen, v.estado, v.id_concesionario], async (err, result) => {
                    if (err) {
                        console.log(`  ❌ Error Vehículo ${v.matricula}: ${err.message}`);
                        resolve(); return;
                    } 
                    
                    let statusIcon = "📌"; 
                    if (result.affectedRows === 1) statusIcon = "✅"; 
                    if (result.affectedRows === 2) statusIcon = "🔄"; 

                    // Hacemos un SELECT rápido para confirmar qué matrícula quedó finalmente (útil si la cambiaste)
                    db.query("SELECT matricula, modelo FROM Vehiculos WHERE id_vehiculo = ?", [v.id_vehiculo], (e, rows) => {
                        const mat = rows[0]?.matricula || v.matricula;
                        console.log(`  ${statusIcon} Vehículo ${mat} (${v.marca} ${v.modelo})`);
                        vehiProcesados++;
                        resolve();
                    });
                });
            });
        }
        
        console.log(`\n✅ PROCESO COMPLETADO:`);
        console.log(`   Concesionarios: ${consProcesados}`);
        console.log(`   Usuarios:       ${usersProcesados}`);
        console.log(`   Vehículos:      ${vehiProcesados}`);
        
        return { 
            exito: true, 
            mensaje: `Carga OK. Revisar consola para detalles de actualizaciones.`,
            admin: (await new Promise(r=>db.query("SELECT CONCAT(correo,' / ',contraseña) as admin FROM usuarios WHERE rol='admin' LIMIT 1",(e,res)=>r(res[0]?.admin||'No encontrado'))))
        };
    
    } catch (error) {
        console.error('❌ ERROR GENERAL:', error.message);
        return { exito: false, mensaje: error.message };
    }
}

module.exports.cargarDatosIniciales = cargarDatosIniciales;