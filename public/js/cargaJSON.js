const fs = require('fs').promises;
const path = require('path');
const db = require('../../config/db');

//Función para cargar el JSON (10 concesionarios, 15 vehiculos y 12 usuarios (2 admin y 10 empleados))
async function cargarDatosIniciales() {
    try {
        console.log('\nVerificando base de datos...');
        
        let concesTotal = 0, usersTotal = 0, vehiTotal = 0;

        //Validaciones REGEX
        const emailRegex = /^[a-zA-Z0-9._%+-]+@voltiaDrive\.es$/;
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
        const phoneRegex = /^[0-9]{9}$/;
        
        //Usamos try catch con el fin de verificar que las tablas estan vacia
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
        
        //Al verificar los datos de la BD imprimos un mensaje con su contenido
        console.log(`Estado BD: ${concesTotal}C | ${usersTotal}U | ${vehiTotal}V`);
        
        //Empezamos a cargar los 3 JSON
        console.log('\nCargando JSON...');
        const concesionariosPath = path.join(__dirname, '../..', 'public', 'json', 'concesionarios.json');
        const usuariosPath = path.join(__dirname, '../..', 'public', 'json', 'usuarios.json');
        const vehiculosPath = path.join(__dirname, '../..', 'public', 'json', 'vehiculos.json');
        
        const concesionarios = JSON.parse(await fs.readFile(concesionariosPath, 'utf8')).concesionarios;
        const usuarios = JSON.parse(await fs.readFile(usuariosPath, 'utf8')).usuarios;
        const vehiculos = JSON.parse(await fs.readFile(vehiculosPath, 'utf8')).vehiculos;
        
        //Imprimimos lo que encontramos en los JSON
        console.log(`JSON encontrado: ${concesionarios.length} Concesionarios | ${usuarios.length} Usuarios | ${vehiculos.length} Vehiculos`);
        
        //1. CARGAMOS LOS CONCESIONARIOS
        console.log('\nCargando CONCESIONARIOS...');
        let consCreados = 0;

        for (const c of concesionarios) {

            //Validamos antes de cargar
            if (!phoneRegex.test(c.telefono_contacto)) {
                console.log(`  ❌ Concesionario NO cargado (${c.nombre}): Teléfono inválido, requiere 9 números`);
                continue;
            }

            await new Promise(resolve => {
                
                //Si no hay nada en la BD
                db.query(
                    "INSERT IGNORE INTO Concesionarios (id_concesionario, nombre, ciudad, direccion, telefono_contacto) VALUES (?, ?, ?, ?, ?)",
                    [c.id_concesionario, c.nombre, c.ciudad, c.direccion, c.telefono_contacto],
                    async (err, result) => {
                        //Manejamos la carga en la BD (✅ si se completa adecuadamente, ❌si no se carga)
                        if (err) {
                            console.log(`  ❌ Concesionario ${c.id_concesionario}: ${c.nombre}`);
                            resolve();
                            return;
                        }
                        
                        db.query(
                            `SELECT id_concesionario, nombre, ciudad FROM Concesionarios WHERE id_concesionario = ?`,
                            [c.id_concesionario],
                            (err2, rows) => {
                                if (err2 || rows.length === 0) {
                                    console.log(`  ❌ ERROR leyendo concesionario ${c.id_concesionario}`);
                                    resolve();
                                    return;
                                }
            
                                const concesionarioReal = rows[0];
            
                                if (result.affectedRows > 0) {
                                    consCreados++;
                                    console.log(`  ✅ Concesionario ${concesionarioReal.id_concesionario} (${concesionarioReal.nombre})`);
                                } else {
                                    console.log(`  📌 Ya existe el concesionario ${concesionarioReal.id_concesionario} (${concesionarioReal.nombre})`);
                                }
                                resolve();
                            }
                        );
                    }
                    
                );
                
            });
        }
        
        //2. CARGAMOS LOS USUARIOS
        console.log('\nCargando USUARIOS...');
        let usersCreados = 0;

        for (const u of usuarios) {

            //Validaciones antes de cargar
            if (!emailRegex.test(u.correo)) {
                console.log(`  ❌ Usuario NO cargado (${u.correo}): Correo inválido`);
                continue;
            }

            if (!passRegex.test(u.contraseña)) {
                console.log(`  ❌ Usuario NO cargado (${u.correo}): Contraseña insegura (min 8, mayus y minus)`);
                continue;
            }

            if (!phoneRegex.test(u.telefono)) {
                console.log(`  ❌ Usuario NO cargado (${u.correo}): Teléfono inválido, requiere 9 números`);
                continue;
            }

            await new Promise(resolve => {
                //Insertamos si no existe el usuario (lo vemos con el id)
                db.query(
                    `INSERT IGNORE INTO usuarios (id_usuario, nombre, correo, contraseña, telefono, imagen, id_concesionario, rol, preferencias_accesibilidad) 
                     VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)`,
                    [u.id_usuario, u.nombre, u.correo, u.contraseña, u.telefono, u.imagen, u.id_concesionario, u.rol, JSON.stringify(u.preferencias_accesibilidad)],
                    async (err, result) => {
                        if (err) {
                            console.log(`  ❌ ERROR Usuario ${u.correo} (${u.rol}): ${err.message}`);
                            resolve();
                            return;
                        }
                        
                        //Si el usuario existe, leemos sus datos de la BD porque a lo mejor han cambiado
                        db.query(
                            `SELECT id_usuario, nombre, correo, rol FROM usuarios WHERE id_usuario = ?`,
                            [u.id_usuario],
                            (err2, rows) => {
                                if (err2 || rows.length === 0) {
                                    console.log(`  ERROR leyendo usuario ${u.id_usuario}`);
                                    resolve();
                                    return;
                                }
        
                                const usuarioReal = rows[0];
        
                                if (result.affectedRows > 0) {
                                    usersCreados++;
                                    console.log(`  ✅ Usuario ${usuarioReal.correo} (${usuarioReal.rol})`);
                                } else {
                                    console.log(`  📌 Ya existe el usuario ${usuarioReal.nombre} (${usuarioReal.correo} (${usuarioReal.rol})`);
                                }
        
                                resolve();
                            }
                        );
                    }
                );
            });
        }
        
        //3. CARGAMOS LOS VEHÍCULOS
        console.log('\nCargando VEHÍCULOS...');
        let vehiNuevos = 0;
        for (const v of vehiculos) {
            await new Promise(resolve => {
                //Si no esta en la BD
                db.query(
                    `INSERT IGNORE INTO Vehiculos (id_vehiculo, matricula, marca, modelo, año_matriculacion, precio, numero_plazas, color, autonomia_km, imagen, estado, id_concesionario) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [v.id_vehiculo, v.matricula, v.marca, v.modelo, v.año_matriculacion, v.precio, v.numero_plazas, v.color, v.autonomia_km, v.imagen, v.estado, v.id_concesionario],
                    async (err, result) => {
                        if (err) {
                            console.log(`  ❌ Vehículo ${v.matricula} (${v.marca} ${v.modelo})`);
                            resolve();
                            return;
                        } 
                        db.query(
                            `SELECT matricula, marca, modelo, estado FROM Vehiculos WHERE id_vehiculo = ?`,
                            [v.id_vehiculo],
                            (err2, rows) => {
                                if (err2 || rows.length === 0) {
                                    console.log(`  ERROR leyendo vehículo ${v.id_vehiculo}`);
                                    resolve();
                                    return;
                                }
        
                                const vehiculoReal = rows[0];
        
                                if (result.affectedRows > 0) {
                                    vehiNuevos++;
                                    console.log(`  ✅ Vehículo ${vehiculoReal.matricula} (${vehiculoReal.marca} ${vehiculoReal.modelo})`);
                                } else {
                                    console.log(`  📌 Ya existe el vehículo ${vehiculoReal.matricula} (${vehiculoReal.marca} ${vehiculoReal.modelo})`);
                                }
                                resolve();
                            }
                        );
                    }
                );
            });
        }
        
        console.log(`\n✅ RESUMEN CARGA COMPLETA:`);
        console.log(`   ${consCreados}/10 CONCESIONARIOS`);
        console.log(`   ${usersCreados}/12 USUARIOS`);
        console.log(`   ${vehiNuevos}/15 VEHÍCULOS`);
        
        //Devolvemos lo que se ha cargado y el admin y lo imprimos por pantalla
        return { 
            exito: true, 
            mensaje: `Carga OK: ${consCreados}C + ${usersCreados}U + ${vehiNuevos}V`,
            admin: (await new Promise(r=>db.query("SELECT CONCAT(correo,' / ',contraseña) as admin FROM usuarios WHERE rol='admin' LIMIT 1",(e,res)=>r(res[0]?.admin||'No encontrado'))))
        };
    
    //En caso de que la carga falle manejamos el error
    } catch (error) {
        console.error('❌ ERROR CARGA JSON:', error.message);
        return { exito: false, mensaje: error.message };
    }
}

module.exports.cargarDatosIniciales = cargarDatosIniciales;