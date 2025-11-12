import React, { useState } from "react";

export default function ValidarComida() {
    // ESTADO
    const [codigo, setCodigo] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [nombre, setNombre] = useState("");
    const [tipoAlimentacion, setTipoAlimentacion] = useState("");
    const [estudianteData, setEstudianteData] = useState(null); // Almacena datos si el código es válido

    // RANGOS DE HORARIO (DEBEN COINCIDIR CON EL BACKEND DE NODE.JS/Python)
    const horarios = {
        // Horario de Refrigerio
        refrigerio: { start: '06:00', end: '11:30', alias: 'Refrigerio/Snack' }, 
        // Horario de Almuerzo
        almuerzo: { start: '11:40', end: '18:00', alias: 'Almuerzo/Lunch' }
    };

    /**
     * Helper para verificar si la hora actual está dentro de un rango definido.
     */
    const isTimeInRange = (now, startHour, endHour) => {
        const [startH, startM] = startHour.split(':').map(Number);
        const [endH, endM] = endHour.split(':').map(Number);
        
        // Creamos objetos Date para los límites con la misma fecha que 'now'
        const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0);
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);
        
        // Verificamos si la hora actual está entre el inicio y el fin (inclusivo)
        return now.getTime() >= startDate.getTime() && now.getTime() <= endDate.getTime();
    };

    /**
     * Analiza el plan del estudiante e identifica qué planes están activos AHORA (en hora).
     * @param {string} tipoAlimentacion - El plan completo del estudiante (e.g., "REFRIGERIO Y ALMUERZO").
     * @returns {Array<string>} Lista de planes activos (e.g., ['almuerzo']).
     */
    const getActivePlans = (tipoAlimentacion) => {
        const ahora = new Date();
        const tipoAlimentacionUpper = tipoAlimentacion.toUpperCase();
        const planesDisponibles = [];

        // 1. Identificar planes que tiene el estudiante (por plan)
        if (tipoAlimentacionUpper.includes('REFRIGERIO') || tipoAlimentacionUpper.includes('SNACK')) {
            planesDisponibles.push('refrigerio');
        }
        if (tipoAlimentacionUpper.includes('ALMUERZO') || tipoAlimentacionUpper.includes('LUNCH')) {
            planesDisponibles.push('almuerzo');
        }

        // 2. Filtrar solo los planes que están activos AHORA
        const planesActivos = planesDisponibles.filter(plan => {
            const range = horarios[plan];
            if (range) {
                return isTimeInRange(ahora, range.start, range.end);
            }
            return false;
        });

        return planesActivos;
    };

    /**
     * Identifica los planes que el estudiante tiene pero que NO están activos en este momento (fuera de hora).
     * @param {string} tipoAlimentacion - El plan completo del estudiante.
     * @returns {Array<string>} Lista de planes que tiene pero que están fuera de horario.
     */
    const getInactivePlans = (tipoAlimentacion) => {
        const ahora = new Date();
        const tipoAlimentacionUpper = tipoAlimentacion.toUpperCase();
        const planesQueTiene = [];

        if (tipoAlimentacionUpper.includes('REFRIGERIO') || tipoAlimentacionUpper.includes('SNACK')) {
            planesQueTiene.push('refrigerio');
        }
        if (tipoAlimentacionUpper.includes('ALMUERZO') || tipoAlimentacionUpper.includes('LUNCH')) {
            planesQueTiene.push('almuerzo');
        }
        
        // Filtramos los planes que NO están en el rango de tiempo
        return planesQueTiene.filter(plan => {
            const range = horarios[plan];
            if (range) {
                return !isTimeInRange(ahora, range.start, range.end);
            }
            return true;
        });
    };
    
    // FUNCIÓN PARA VERIFICAR CÓDIGO (Paso 1: Se conecta al servidor Python en 5000)
    const validarCodigo = async () => {
        setMensaje("");
        // Limpiamos los datos del estudiante en caso de un intento fallido o fuera de hora
        setEstudianteData(null); 
        setNombre("");
        setTipoAlimentacion("");

        if (!codigo.trim()) {
            setMensaje("Ingrese un código válido");
            return;
        }

        try {
            // Llama al servidor Python/Flask (puerto 5000)
            const response = await fetch("http://localhost:5000/verificar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ codigo }),
            });

            if (!response.ok) {
                setMensaje("❌ Código no encontrado o no válido");
                return;
            }

            const data = await response.json();
            
            // Capitalización para mostrar el nombre bonito
            const nombreCapitalizado = data.nombre.toLowerCase().split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');


            // 🛑 LÓGICA DE VALIDACIÓN DE HORARIO INMEDIATA
            const planesActivos = getActivePlans(data.tipo_alimentacion);
            
            if (planesActivos.length > 0) {
                // 1. Hora CORRECTA: Mostramos el mensaje de éxito y cargamos los datos.
                const planesDisponiblesTexto = planesActivos.map(p => horarios[p].alias).join(' y ');
                
                // Cargamos los datos para que el panel de resultado y el botón de reclamar se muestren
                setNombre(nombreCapitalizado); 
                setTipoAlimentacion(data.tipo_alimentacion);
                setEstudianteData(data); 

                // Mensaje de éxito.
                setMensaje(`✅ Estudiante: ${nombreCapitalizado}. Hora correcta. Puedes reclamar: ${planesDisponiblesTexto}.`);
            } else {
                // 2. Fuera de HORARIO: Muestra la advertencia específica.
                
                const inactivePlans = getInactivePlans(data.tipo_alimentacion);
                let specificMessage = "";

                if (inactivePlans.length === 1) {
                    // Mensaje específico si solo tiene un plan y está fuera de hora.
                    const planName = horarios[inactivePlans[0]].alias;
                    specificMessage = `⚠️ No es hora de reclamar **${planName}**.`;
                } else if (inactivePlans.length > 1) {
                    // Mensaje si tiene AMBOS planes y AMBOS están fuera de hora.
                    specificMessage = `⚠️ El estudiante tiene planes, pero todos están **FUERA DE HORARIO** de reclamo.`;
                } else {
                    // Caso de fallback (código válido, pero sin planes registrados o fuera de todos los rangos).
                    specificMessage = `⚠️ Estudiante: ${nombreCapitalizado}. Código válido, pero **FUERA DE HORARIO** de reclamo.`;
                }
                
                const horarioAlmuerzo = `${horarios.almuerzo.start} - ${horarios.almuerzo.end}`;
                const horarioRefrigerio = `${horarios.refrigerio.start} - ${horarios.refrigerio.end}`;
                
                // Mensaje completo: El mensaje específico + los horarios para referencia.
                setMensaje(`${specificMessage}\nHorarios de hoy:\n• Refrigerio: ${horarioRefrigerio}\n• Almuerzo: ${horarioAlmuerzo}`);
                
                // NO se llama a setEstudianteData(data), por lo que el panel de resultado no se renderiza.
            }


        } catch (error) {
            console.error("Error al conectar con el servidor de verificación:", error);
            setMensaje("Error al conectar con el servidor de verificación");
        }
    };
    
    // FUNCIÓN PARA VALIDAR HORA E IMPRIMIR (Paso 2: Se conecta al servidor Node.js en 3000)
    const handleReclamar = async () => {
        setMensaje(""); // Limpiar mensaje antes de intentar la impresión
        
        if (!estudianteData) {
            setMensaje("Primero valide el código del estudiante (Paso 1).");
            return;
        }

        const planesActivos = getActivePlans(estudianteData.tipo_alimentacion);
        
        // VALIDACIÓN DE HORA RÁPIDA (FRONTEND)
        if (planesActivos.length === 0) {
            const horarioAlmuerzo = `${horarios.almuerzo.start} - ${horarios.almuerzo.end}`;
            const horarioRefrigerio = `${horarios.refrigerio.start} - ${horarios.refrigerio.end}`;
            
            setMensaje(`❌ Fuera de horario. Ningún plan activo para reclamar.\nHorarios: Refrigerio (${horarioRefrigerio}), Almuerzo (${horarioAlmuerzo}).`);
            return; 
        }
        
        // 🚀 ENVÍO A IMPRESIÓN (Llama a tu server.js en puerto 3000)
        try {
            const printResponse = await fetch('http://localhost:3000/imprimir', { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    contenido: {
                        nombre: estudianteData.nombre,
                        // Enviamos el plan original. El backend lo usará para la validación final.
                        tipo_alimentacion: estudianteData.tipo_alimentacion 
                    }
                }) 
            });

            const printResult = await printResponse.json();

            if (printResponse.ok && printResult.success) {
                // Generamos el mensaje de éxito basado en los planes que pasaron la validación
                const planesReclamadosTexto = planesActivos.map(p => horarios[p].alias).join(' y ');
                setMensaje(`✅ Ticket impreso correctamente. Reclamando: ${planesReclamadosTexto}`);
            } else {
                 // Captura errores del servidor de impresión (ej: ya reclamado, error de impresora)
                 setMensaje(`⚠️ Error de impresión: ${printResult.message || 'Error desconocido del servidor de impresión.'}`);
            }

        } catch (error) {
            console.error("Error al enviar a imprimir:", error);
            setMensaje("Error de red al intentar imprimir.");
        }
    };


    return (
        <>
            {/* ESTILOS CSS INCLUIDOS EN EL MISMO ARCHIVO */}
            <style jsx="true">{`
                .validador-comida {
                    max-width: 400px;
                    margin: 40px auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    font-family: 'Inter', Arial, sans-serif;
                    text-align: center;
                    background-color: #f9f9f9;
                }
                .validador-comida h2 {
                    color: #1a1a1a;
                    margin-bottom: 25px;
                    font-weight: 700;
                }
                .validador-comida input, .validador-comida button {
                    width: 100%;
                    padding: 12px;
                    margin-bottom: 15px;
                    border-radius: 6px;
                    box-sizing: border-box;
                    font-size: 16px;
                }
                .validador-comida input {
                    border: 1px solid #ccc;
                    outline: none;
                    transition: border-color 0.3s;
                }
                .validador-comida input:focus {
                    border-color: #007bff;
                }
                .validador-comida button {
                    background-color: #007bff;
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    transition: background-color 0.3s, transform 0.1s;
                }
                .validador-comida button:hover {
                    background-color: #0056b3;
                    transform: translateY(-1px);
                }
                .reclamar-button {
                    background-color: #28a745 !important;
                    margin-top: 20px !important;
                    font-size: 18px !important;
                    padding: 14px !important;
                }
                .reclamar-button:hover {
                    background-color: #1e7e34 !important;
                }
                .mensaje {
                    margin-top: 20px;
                    padding: 15px;
                    border-radius: 8px;
                    background-color: #fff3cd;
                    color: #856404;
                    border: 1px solid #ffeeba;
                    font-weight: 500;
                    text-align: left;
                    white-space: pre-wrap; /* Mantiene los saltos de línea para los horarios */
                }
                .resultado {
                    margin-top: 25px;
                    padding: 20px;
                    border: 2px solid #007bff;
                    border-radius: 10px;
                    background-color: #e9f7ff;
                    text-align: left;
                }
                .resultado p {
                    margin: 8px 0;
                    color: #333;
                    font-size: 17px;
                }
                .resultado strong {
                    font-weight: 700;
                    color: #0056b3;
                }
            `}</style>
            
            <div className="validador-comida">
                <h2>Validación y Reclamo de Comida</h2>
                
                {/* Campo de Código */}
                <input
                    type="text"
                    placeholder="Ingrese código"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') validarCodigo(); }} // Validar al presionar Enter
                />
                
                {/* Botón de Validación */}
                <button onClick={validarCodigo}>1. Validar Código</button>

                {/* Área de Mensajes */}
                {mensaje && <div className="mensaje">{mensaje}</div>}

                {/* Panel de Resultado (Solo visible si el código es válido Y la hora es correcta) */}
                {estudianteData && (
                    <div className="resultado">
                        <p>Nombre: <strong>{nombre}</strong></p>
                        <p>Plan: <strong>{tipoAlimentacion}</strong></p>
                        
                        {/* Botón para Reclamar/Imprimir */}
                        <button onClick={handleReclamar} className="reclamar-button">2. Reclamar e Imprimir Ticket</button>
                    </div>
                )}
            </div>
        </>
    );
}