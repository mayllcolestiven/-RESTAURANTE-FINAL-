const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 3000;
const testMode = false;

app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN ---
const PRINTER_SHARE_NAME = 'TICKET'; 
const COMPUTER_NAME = 'localhost'; 
// 0 = Velocidad Máxima (Inmediato)
const TIEMPO_DE_ESPERA = 0; 

const horarios = {
    refrigerio: { start: '06:00', end: '11:30', alias: 'Refrigerio/Snack' }, 
    almuerzo:   { start: '11:40', end: '18:00', alias: 'Almuerzo/Lunch' }
};

function checkPlan(tipo) {
    const now = new Date();
    const t = tipo.toUpperCase();
    const inRange = (s, e) => {
        const [sh, sm] = s.split(':'); const [eh, em] = e.split(':');
        const d = new Date(now); 
        const start = new Date(d.setHours(sh, sm, 0));
        const end = new Date(d.setHours(eh, em, 59));
        return now >= start && now <= end;
    };
    if ((t.includes('REFRIGERIO') || t.includes('SNACK')) && inRange(horarios.refrigerio.start, horarios.refrigerio.end)) return horarios.refrigerio.alias;
    if ((t.includes('ALMUERZO') || t.includes('LUNCH')) && inRange(horarios.almuerzo.start, horarios.almuerzo.end)) return horarios.almuerzo.alias;
    return null;
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function cleanText(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

app.get('/', (req, res) => res.json({ status: 'Online', mode: 'Nativo ESC/POS (Diseño Excel)' }));

app.post('/imprimir', (req, res) => {
    // 1. RESPUESTA RAPIDA
    if (!req.body.contenido || !req.body.contenido.nombre) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }
    res.json({ success: true, message: "Imprimiendo..." });

    // 2. IMPRESIÓN DE FONDO
    setTimeout(() => {
        try {
            const { contenido } = req.body;
            const plan = checkPlan(contenido.tipo_alimentacion);
            if (!plan) return;

            const now = new Date();
            // Formato de fecha limpio
            const fechaStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit', hour12:true})}`;
            
            const palabras = ["APPLE","BANANA","BREAD","BUTTER","CARROT","CHEESE","CHICKEN","CHOCOLATE","COFFEE","COOKIE","CORN","CREAM","CUCUMBER","EGG","FISH","FLOUR","GARLIC","GRAPE","HONEY","ICE CREAM","JUICE","LEMON","LETTUCE","MEAT","MILK","MUSHROOM","NOODLES","ONION","ORANGE","PASTA","PEACH","PEAR","PEPPER","PIZZA","POTATO","RICE","SALAD","SALT","SANDWICH","SOUP","SPINACH","STEAK","STRAWBERRY","SUGAR","TEA","TOMATO","WATER","WATERMELON","YOGURT","ZUCCHINI"];
            const palabra = palabras[getDayOfYear(now) % palabras.length].toUpperCase();

            // --- DISEÑO TIPO EXCEL ---
            const ESC = '\x1B';
            const GS = '\x1D';
            const LF = '\n';

            let commands = '';
            commands += ESC + '@'; // Inicializar
            commands += ESC + 'a' + '\x01'; // Centrar
            
            commands += LF; // Margen superior

            // 1. NOMBRE (DOBLE ALTO - ESTILO TÍTULO)
            // \x10 = Doble Alto pero Ancho Normal (Para que quepa en una línea)
            commands += GS + '!' + '\x10'; 
            commands += ESC + 'E' + '\x01'; // Negrita ON
            commands += cleanText(contenido.nombre) + LF;
            commands += ESC + 'E' + '\x00'; // Negrita OFF
            commands += GS + '!' + '\x00'; // Resetear tamaño
            
            commands += LF; // Espacio

            // 2. FECHA (Normal)
            commands += fechaStr + LF;
            
            // 3. PLAN (Normal)
            commands += '(' + plan + ')' + LF;
            
            commands += LF; // Espacio antes de la palabra grande

            // 4. PALABRA CLAVE (GIGANTE - ESTILO EXCEL)
            // \x11 = Doble Ancho y Doble Alto (Letra gorda y grande)
            commands += GS + '!' + '\x11'; 
            commands += ESC + 'E' + '\x01'; // Negrita ON
            commands += palabra + LF;
            commands += ESC + 'E' + '\x00'; // Negrita OFF
            commands += GS + '!' + '\x00'; // Resetear tamaño

            // 5. CORTE
            commands += LF + LF + LF + LF; 
            commands += GS + 'V' + '\x41' + '\x00'; 

            // Guardar y enviar
            const tempFile = path.join(__dirname, 'raw_ticket.bin');
            fs.writeFileSync(tempFile, commands, { encoding: 'binary' });

            const printerPath = `\\\\${COMPUTER_NAME}\\${PRINTER_SHARE_NAME}`;
            const cmd = `copy /b "${tempFile}" "${printerPath}"`;

            if (!testMode) {
                exec(cmd, (error) => {
                    if (error) console.error("❌ Error imprimiendo:", error.message);
                    else console.log(`✅ Ticket enviado: ${contenido.nombre}`);
                });
            }

        } catch (e) {
            console.error("Error de fondo:", e);
        }
    }, TIEMPO_DE_ESPERA);
});

app.listen(port, () => {
    console.log(`🚀 Servidor LISTO en http://localhost:${port}`);
    console.log(`🎨 Estilo: Copia de Excel (Rápido)`);
});