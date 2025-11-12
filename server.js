const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 3000;
const testMode = false; // Cambiar a true para pruebas sin imprimir

app.use(cors());
app.use(express.json());

// RANGOS DE HORARIO (DEBEN COINCIDIR CON EL FRONTEND DE REACT)
const horarios = {
    // SINCRONIZADO: Refrigerio ahora termina a las 11:30 AM
    refrigerio: { start: '06:00', end: '11:30', alias: 'Refrigerio/Snack' }, 
    almuerzo: { start: '11:40', end: '18:00', alias: 'Almuerzo/Lunch' }
};

/**
 * Helper para verificar si la hora actual está dentro de un rango definido.
 */
function isTimeInRange(now, startHour, endHour) {
    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);
    
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0);
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);
    
    return now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
}

/**
 * Analiza el tipo de alimentación del estudiante y devuelve el alias del plan activo AHORA.
 */
function getActivePlanAlias(tipoAlimentacion) {
    const ahora = new Date();
    const tipoAlimentacionUpper = tipoAlimentacion.toUpperCase();

    // Priorizar refrigerio si ambos están activos, o simplemente devolver el activo.
    if ((tipoAlimentacionUpper.includes('REFRIGERIO') || tipoAlimentacionUpper.includes('SNACK')) && 
        isTimeInRange(ahora, horarios.refrigerio.start, horarios.refrigerio.end)) {
        return horarios.refrigerio.alias;
    }

    if ((tipoAlimentacionUpper.includes('ALMUERZO') || tipoAlimentacionUpper.includes('LUNCH')) && 
        isTimeInRange(ahora, horarios.almuerzo.start, horarios.almuerzo.end)) {
        return horarios.almuerzo.alias;
    }
    
    return null; // Ningún plan activo
}

// --- NUEVA FUNCIÓN PARA ROTACIÓN DIARIA ---

/**
 * Calcula el día del año (1 a 366).
 */
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

// --- FUNCIONES DE FORMATO ---

function formatearFecha(fecha) {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
}

// Ruta principal
app.get('/', (req, res) => {
    res.json({ 
        message: 'Servidor de impresión activo',
        impresora: 'XP-80',
        puerto: port,
        testMode: testMode
    });
});

// Endpoint para imprimir ticket
app.post('/imprimir', async (req, res) => {
    const tempFile = path.join(__dirname, 'temp.txt');
    try {
        const { contenido } = req.body;
        
        if (!contenido || !contenido.nombre || !contenido.tipo_alimentacion) {
            return res.status(400).json({ 
                success: false, 
                message: 'Los campos "contenido.nombre" y "contenido.tipo_alimentacion" son obligatorios' 
            });
        }

        // 🛑 VALIDACIÓN DE HORARIO FINAL (BACKEND)
        const planActivo = getActivePlanAlias(contenido.tipo_alimentacion);

        if (!planActivo) {
            const horarioAlmuerzo = `${horarios.almuerzo.start} - ${horarios.almuerzo.end}`;
            const horarioRefrigerio = `${horarios.refrigerio.start} - ${horarios.refrigerio.end}`; 
            
            return res.status(400).json({
                success: false,
                message: `FUERA DE HORARIO. Ningún plan activo para esta hora.\nHorarios: Refrigerio (${horarioRefrigerio}), Almuerzo (${horarioAlmuerzo}).`
            });
        }
        
        // --- INFORMACIÓN DE TICKET ---
        const fechaActual = new Date(); // Usamos esta variable para todo el cálculo
        const fechaFormateada = formatearFecha(fechaActual);
        const horaFormateada = fechaActual.toLocaleTimeString('es-CO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // ** PALABRA DEL DÍA - ROTACIÓN AUTOMÁTICA **
        const palabraDelDiaArray = [
            "apple","banana", "bread", "butter", "carrot", "cheese", "chicken", "chocolate", "coffee", "cookie",
            "corn", "cream", "cucumber", "egg", "fish", "flour", "garlic", "grape", "honey", "ice cream",
            "juice", "lemon", "lettuce", "meat", "milk", "mushroom", "noodles", "onion", "orange", "pasta",
            "peach", "pear", "pepper", "pizza", "potato", "rice", "salad", "salt", "sandwich", "soup",
            "spinach", "steak", "strawberry", "sugar", "tea", "tomato", "water", "watermelon", "yogurt", "zucchini"
        ]; 
        
        // Lógica de rotación diaria
        const dayOfYear = getDayOfYear(fechaActual);
        const palabraIndex = dayOfYear % palabraDelDiaArray.length; // Índice basado en el día
        const palabraActiva = palabraDelDiaArray[palabraIndex].toUpperCase(); // La palabra única del día
        // -----------------------------

        // Comandos ESC/POS para impresora térmica (Simplificados)
        const negritaON = '\x1B\x45\x01';
        const negritaOFF = '\x1B\x45\x00';
        
        // TAMAÑOS DE FUENTE
        const tamañoDoble = '\x1D\x21\x01'; 
        const tamañoMaximo = '\x1B\x21\x30'; 
        const tamañoNormal = '\x1B\x21\x00'; 

        const centrar = '\x1B\x61\x01';
        const cortar = '\x1B\x69';
        const salto = '\n';
        
        // Generar ticket limpio y simple con la nueva estructura compacta y legible
        const ticketText =
            // APLICAR CENTRADO
            centrar + 
            
            salto + 
            
            // 1. Nombre del Estudiante (TAMAÑO DOBLE - SIN NEGRITA)
            tamañoDoble + contenido.nombre + salto + 
            
            // 2. Plan Activo (TAMAÑO DOBLE - SIN NEGRITA)
            tamañoDoble + planActivo.toUpperCase() + salto + 
            
            // 3. Fecha / Hora (TAMAÑO NORMAL - SIN NEGRITA)
            tamañoNormal + `FECHA/HORA: ${fechaFormateada} - ${horaFormateada}` + salto + 
            
            // 4. PALABRA DEL DÍA (MÁXIMO TAMAÑO Y CON NEGRITA) - USANDO palabraActiva
            tamañoMaximo + negritaON + palabraActiva + negritaOFF + salto.repeat(3) + 
            
            // Corte (4 saltos de línea para que el corte quede bien)
            salto.repeat(4) + cortar;
        
        if (testMode) {
            console.log('🧪 MODO DE PRUEBA - Contenido del ticket:');
            console.log(ticketText);
            return res.json({
                success: true,
                message: 'Ticket procesado en modo de prueba (no impreso)',
                testMode: true,
                palabra_del_dia: palabraActiva, // Muestra la palabra activa
                ticketText
            });
        }

        // Escribir archivo temporal
        fs.writeFileSync(tempFile, ticketText, { encoding: 'ascii' });
        console.log('✅ Archivo temporal creado:', tempFile);

        // Comando para imprimir en XP-80
        const printCommand = `print /D:"\\\\localhost\\XP-80" "${tempFile}"`;

        exec(printCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error al imprimir:', error);
                
                return res.status(500).json({ 
                    success: false, 
                    message: `Error al enviar a impresora XP-80: ${error.message}` 
                });
            }

            console.log('✅ Impresión exitosa en XP-80');
            res.json({ 
                success: true, 
                message: 'Ticket impreso correctamente en XP-80',
                palabra_del_dia: palabraActiva
            });

            // Eliminar archivo temporal después de 2 segundos
            setTimeout(() => {
                if (fs.existsSync(tempFile)) {
                    try {
                        fs.unlinkSync(tempFile);
                        console.log('🗑️ Archivo temporal eliminado');
                    } catch (unlinkError) {
                        console.error('⚠️ Error al eliminar archivo temporal:', unlinkError);
                    }
                }
            }, 2000);
        });
    } catch (error) {
        console.error('❌ Error en /imprimir:', error);

        if (fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile);
            } catch (unlinkError) {
                console.error('Error limpiando archivo tras fallo:', unlinkError);
            }
        }

        res.status(500).json({ 
            success: false, 
            message: `Error interno del servidor: ${error.message}`
        });
    }
});

app.listen(port, () => {
    console.log('\n🚀 ========================================');
    console.log(`    Servidor de impresión iniciado`);
    console.log(`    Puerto: http://localhost:${port}`);
    console.log(`    Impresora: XP-80`);
    console.log(`    Modo de prueba: ${testMode ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}`);
    console.log(`    Horarios: Refrigerio hasta las 11:30`);
    console.log('========================================\n');
});