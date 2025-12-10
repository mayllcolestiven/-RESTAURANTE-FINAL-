const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Test mode - when true, tickets won't actually print
const testMode = true;

app.use(cors());
app.use(express.json());

// =============================================================================
// PRINTER CONFIGURATION
// =============================================================================
const PRINTER_SHARE_NAME = 'TICKET';
const COMPUTER_NAME = 'localhost';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function cleanText(str) {
    // Remove accents and special characters for better printer compatibility
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/', (req, res) => {
    res.json({
        status: 'Online',
        mode: testMode ? 'TEST MODE (Not printing)' : 'PRODUCTION (Printing enabled)',
        printer: PRINTER_SHARE_NAME
    });
});

app.post('/imprimir', (req, res) => {
    // Validate request
    if (!req.body.contenido || !req.body.contenido.nombre) {
        return res.status(400).json({
            success: false,
            message: 'Incomplete data'
        });
    }

    // Send immediate response
    res.json({ success: true, message: "Printing..." });

    // Process printing in background
    setTimeout(() => {
        try {
            const { contenido } = req.body;
            const now = new Date();

            // Format date and time
            const fechaStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}`;

            // Daily keyword for validation
            const palabras = [
            "FLI", "LEARN TO LEARN", "INDEPENDENT", "SOCIAL LEADER", "CITIZENSHIP",
            "CARING", "KIND", "TEAM PLAYER", "COOKING", "FAIR",
            "PERSONAL BEST", "LEARN TO BE", "INNOVATIVE", "ARTSSO", "SENIORS",
            "CERRITOS", "RESPECTFUL", "FREEDOM", "COURAGEOUS", "FUNDACIÓN",
            "WEECARE", "COLOMBIA", "THINK", "HUMBLE", "CHONTADURO",
            "SPORTS", "VIADUCTO", "MOTIVATED", "LOYAL", "MULTICULTURAL",
            "LICEO INGLÉS", "UNITED STATES", "LEADERSHIP", "SUCCESS", "EMPATHETIC",
            "HONESTY", "PASSIONATE", "VOLLEYBALL", "SCIENCE", "LEADER",
            "RELIABLE", "HONEST", "INTEGRITY", "LEARN TO THINK", "THOUGHTFUL",
            "JAGGY", "RISARALDA", "GLOBAL CITIZEN", "LOVE IT!", "COFFEE",
            "OPEN MINDED", "RISK TAKER", "CONSOTA", "HAPPY", "SOCCER",
            "DIGNITY", "RESPONSIBLE", "TRUSTWORTHY", "OTÚN", "SIX-SEVEN",
            "ACHIEVEMENT", "GLOBAL", "ROBOTICS", "DIGITAL", "PROACTIVE",
            "PEREIRA", "NHS", "FLIMUN", "30 DE AGOSTO", "CREATIVE",
            "AWARENESS", "NJHS", "COGNIA", "BILINGUAL", "UNDERSTANDING",
            "AUTONOMOUS", "CIVIC", "GO JAGUARS"
        ];
            const palabra = palabras[getDayOfYear(now) % palabras.length].toUpperCase();

            // ESC/POS commands
            const ESC = '\x1B';
            const GS = '\x1D';
            const LF = '\n';

            let commands = '';
            commands += ESC + '@'; // Initialize printer
            commands += ESC + 'a' + '\x01'; // Center align

            commands += LF; // Top margin

            // 1. Student name (double height)
            commands += GS + '!' + '\x10';
            commands += ESC + 'E' + '\x01'; // Bold ON
            commands += cleanText(contenido.nombre) + LF;
            commands += ESC + 'E' + '\x00'; // Bold OFF
            commands += GS + '!' + '\x00'; // Reset size

            commands += LF;

            // 2. Date and time
            commands += fechaStr + LF;

            // 3. Service type
            commands += '(' + contenido.tipo_alimentacion + ')' + LF;

            commands += LF;

            // 4. Daily keyword (large)
            commands += GS + '!' + '\x11'; // Double width and height
            commands += ESC + 'E' + '\x01'; // Bold ON
            commands += palabra + LF;
            commands += ESC + 'E' + '\x00'; // Bold OFF
            commands += GS + '!' + '\x00'; // Reset size

            // 5. Cut paper
            commands += LF + LF + LF + LF;
            commands += GS + 'V' + '\x41' + '\x00';

            // Save to temporary file
            const tempFile = path.join(__dirname, 'raw_ticket.bin');
            fs.writeFileSync(tempFile, commands, { encoding: 'binary' });

            // Send to printer
            if (!testMode) {
                const printerPath = `\\\\${COMPUTER_NAME}\\${PRINTER_SHARE_NAME}`;
                const cmd = `copy /b "${tempFile}" "${printerPath}"`;

                exec(cmd, (error) => {
                    if (error) {
                        console.error("❌ Printer error:", error.message);
                    } else {
                        console.log(`✅ Ticket printed: ${contenido.nombre} - ${contenido.tipo_alimentacion}`);
                    }
                });
            } else {
                console.log(`🧪 TEST MODE - Ticket would print: ${contenido.nombre} - ${contenido.tipo_alimentacion}`);
                console.log(`   Keyword: ${palabra}`);
            }

        } catch (e) {
            console.error("❌ Background error:", e);
        }
    }, 0);
});

// =============================================================================
// START SERVER
// =============================================================================
app.listen(port, () => {
    console.log("\n" + "=".repeat(60));
    console.log("🖨️  PRINTER SERVER");
    console.log("=".repeat(60));
    console.log(`📍 Server: http://localhost:${port}`);
    console.log(`🖨️  Printer: ${PRINTER_SHARE_NAME}`);
    console.log(`🧪 Test Mode: ${testMode ? 'ENABLED (Not printing)' : 'DISABLED (Printing enabled)'}`);
    console.log("=".repeat(60) + "\n");
});
