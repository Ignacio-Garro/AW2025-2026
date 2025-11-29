const fs = require('fs').promises;
const path = require('path');
const db = require('../../config/db');

//Función para cargar el JSON (10 concesionarios, 15 vehiculos y 11 usuarios (1 admin y 10 empleados))
async function cargarDatosIniciales() {
    try {
        console.log('🔄 Verificando base de datos...');
        
        let concesTotal = 0, usersTotal = 0, vehiTotal = 0;
        
        //Usamos try catch con el fin de verificar que las tablas estan vacia
        try {
            const [conces] = await new Promise(r => db.query("SELECT COUNT(*) as total FROM Concesionarios", (e, res) => r(e ? [{total:0}] : res)));
            concesTotal = conces[0]?.total || 0;
        } catch(e) { console.log('⚠️  Tabla Concesionarios no existe'); }
        
        try {
            const [users] = await new Promise(r => db.query("SELECT COUNT(*) as total FROM usuarios", (e, res) => r(e ? [{total:0}] : res)));
            usersTotal = users[0]?.total || 0;
        } catch(e) { console.log('⚠️  Tabla usuarios no existe'); }
        
        try {
            const [vehi] = await new Promise(r => db.query("SELECT COUNT(*) as total FROM Vehiculos", (e, res) => r(e ? [{total:0}] : res)));
            vehiTotal = vehi[0]?.total || 0;
        } catch(e) { console.log('⚠️  Tabla Vehiculos no existe'); }
        
        //Al verificar los datos de la BD imprimos un mensaje con su contenido
        console.log(`📊 Estado BD: ${concesTotal}C | ${usersTotal}U | ${vehiTotal}V`);
        
        //Empezamos a cargar el JSON con la segunda linea
        console.log('📦 Cargando JSON...');
        const jsonPath = path.join(__dirname, '../..', 'datosIniciales.json');
        const datos = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
        
        //Imprimimos lo que encontramos en el JSON
        console.log(`📋 JSON encontrado: ${datos.concesionarios.length}Concesionarios | ${datos.usuarios.length}Usuarios | ${datos.vehiculos.length}Vehiculos`);
        
        //1. LIMPIAMOS LAS TABLAS (Para evitar problemas)
        await new Promise(resolve => db.query("DELETE FROM Vehiculos", () => db.query("DELETE FROM usuarios", () => db.query("DELETE FROM Concesionarios", resolve))));
        
        //2. CARGAMOS LOS CONCESIONARIOS
        console.log('🏢 Cargando CONCESIONARIOS...');
        let consCreados = 0;
        for (const c of datos.concesionarios) {
            await new Promise(resolve => {
                db.query(
                    "INSERT IGNORE INTO Concesionarios (id_concesionario, nombre, direccion, telefono_contacto) VALUES (?, ?, ?, ?)",
                    [c.id_concesionario, c.nombre, c.direccion, c.telefono_contacto],
                    (err, result) => {
                        //Manejamos la carga en la BD (✅si se completa adecuadamente, ❌si no se carga)
                        if (!err) {
                            consCreados++;
                            console.log(`  ✅ Concesionario ${c.id_concesionario}: ${c.nombre}`);
                        } else {
                            console.log(`  ❌ ERROR Concesionario ${c.id_concesionario}:`, err.message);
                        }
                        resolve();
                    }
                );
            });
        }
        
        //3. CARGAMOS LOS USUARIOS
        console.log('👥 Cargando USUARIOS...');
        let usersCreados = 0;
        for (const u of datos.usuarios) {
            await new Promise(resolve => {
                db.query(
                    `INSERT IGNORE INTO usuarios (nombre, correo, contraseña, telefono, imagen, id_concesionario, rol) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [u.nombre, u.correo, u.contraseña, u.telefono, u.imagen, u.id_concesionario, u.rol],
                    (err, result) => {
                        if (!err) {
                            usersCreados++;
                            console.log(`  ✅ Usuario ${u.correo} (${u.rol})`);
                        } else {
                            console.log(`  ❌ ERROR Usuario ${u.correo}:`, err.message);
                        }
                        resolve();
                    }
                );
            });
        }
        
        //4. CARGAMOS LOS VEHÍCULOS
        console.log('🚗 Cargando VEHÍCULOS...');
        let vehiNuevos = 0;
        for (const v of datos.vehiculos) {
            await new Promise(resolve => {
                db.query(
                    `INSERT INTO Vehiculos (id_vehiculo, matricula, marca, modelo, año_matriculacion, precio, numero_plazas, color, autonomia_km, imagen, estado, id_concesionario) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [v.id_vehiculo, v.matricula, v.marca, v.modelo, v.año_matriculacion, v.precio, v.numero_plazas, v.color, v.autonomia_km, v.imagen, v.estado, v.id_concesionario],
                    (err, result) => {
                        if (!err) {
                            vehiNuevos++;
                            console.log(`  ✅ Vehículo ${v.matricula} (${v.marca} ${v.modelo})`);
                        } else {
                            console.log(`  ❌ ERROR Vehículo ${v.matricula}:`, err.message);
                        }
                        resolve();
                    }
                );
            });
        }
        
        console.log(`\n✅ RESUMEN CARGA COMPLETA:`);
        console.log(`   🏢 ${consCreados}/10 CONCESIONARIOS`);
        console.log(`   👥 ${usersCreados}/11 USUARIOS`);
        console.log(`   🚗 ${vehiNuevos}/15 VEHÍCULOS`);
        
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