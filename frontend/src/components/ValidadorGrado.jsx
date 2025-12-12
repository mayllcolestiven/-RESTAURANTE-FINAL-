import { useState, useRef, useEffect } from "react";
// Se elimina la importación de CSS externa que causaba el error de compilación:
// import "./ValidadorGrado.css";

// Grados que NO están permitidos para usar este sistema (acceso denegado)
const gradosNoPermitidos = ["K2", "K3", "K4", "K5", "1", "2"];

export default function ValidadorGrado() {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [grado, setGrado] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const inputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false); // Nuevo estado para evitar clics múltiples

  // Función para manejar la solicitud de impresión al servidor Flask
  const solicitarImpresion = async (datosEstudiante) => {
    try {
      // Nota: Si el backend de Flask no se ejecuta en 127.0.0.1, debes cambiar esta IP
      const response = await fetch("http://127.0.0.1:5000/imprimir_ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosEstudiante),
      });

      if (response.ok) {
        console.log("Impresión solicitada con éxito.");
        return true;
      } else {
        // En caso de error de servidor de impresión
        const errorData = await response.json().catch(() => ({ mensaje: "Respuesta de error no JSON" }));
        console.error("Error al solicitar impresión:", errorData.mensaje);
        return false;
      }
    } catch (error) {
      // En caso de error de red
      console.error("Error de red al intentar imprimir:", error);
      return false;
    }
  };

  // Mantener el foco en el input siempre para permitir el escaneo continuo
  useEffect(() => {
    // Solo enfocar si no estamos en medio de una validación
    if (inputRef.current && !isProcessing) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [codigo, isProcessing]);

  const validarGrado = async () => {
    if (isProcessing) return; // Prevenir doble clic

    const trimmedCodigo = codigo.trim();

    if (!trimmedCodigo) {
      setMensaje("Ingrese un código válido");
      setGrado("");
      setNombre("");
      setTipo("");
      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }
    
    setIsProcessing(true); // Iniciar procesamiento
    setMensaje("Buscando estudiante...");
    setGrado("");
    setNombre("");
    setTipo("");

    try {
      // 1. Verificar el código en el backend de Flask
      const response = await fetch("http://127.0.0.1:5000/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: trimmedCodigo }),
      });

      if (!response.ok) {
        setMensaje("❌ Código no encontrado o no válido");
        setGrado("");
        setNombre("");
        setTipo("");
        
        // Limpiar después de mostrar el mensaje de error
        setCodigo(""); 
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      const data = await response.json();

      setNombre(data.nombre);
      setGrado(data.grado || "N/A");
      setTipo(data.tipo_alimentacion || "N/A");

      // 2. VALIDACIÓN CRÍTICA: Bloquear grados no permitidos
      if (gradosNoPermitidos.includes(data.grado)) {
        // Mostrar el aviso de ACCESO DENEGADO
        setMensaje(`🚫 ACCESO DENEGADO: Grado ${data.grado} no puede usar este sistema.`);
        
        // Limpiar después de mostrar el mensaje
        setCodigo("");
        return;
      }

      // 3. Si llega aquí, el estudiante SÍ está autorizado.
      
      // 🔑 NUEVO PASO: Llamar al backend para IMPRIMIR
      setMensaje("✅ Estudiante autorizado. Solicitando impresión...");
      const impresionExitosa = await solicitarImpresion(data);

      if (impresionExitosa) {
        setMensaje(`✅ Estudiante autorizado: Ticket en impresión (Grado ${data.grado})`);
      } else {
        setMensaje(`⚠️ Error de impresión. Acceso concedido (Grado ${data.grado})`);
      }


      // Limpiar el input
      setCodigo("");

    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      setMensaje("⚠️ Error al conectar con el servidor (ver consola)");
      setGrado("");
      setNombre("");
      setTipo("");
    } finally {
      setIsProcessing(false); // Finalizar procesamiento
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Determinar si el grado actual está permitido o no para los estilos
  const isDenied = gradosNoPermitidos.includes(grado);

  return (
    <div className="flex flex-col items-center p-6 bg-gray-50 min-h-screen">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h2 className="text-3xl font-extrabold mb-6 text-gray-900 text-center">
                Validación de Comedor
            </h2>

            <div className="mb-6">
                <label htmlFor="codigo-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Escanear Código del Estudiante
                </label>
                <input
                    id="codigo-input"
                    ref={inputRef}
                    type="text"
                    placeholder="Código o Matrícula"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        validarGrado();
                      }
                    }}
                    onBlur={() => {
                      // Recuperar el foco si no estamos procesando
                      if (!isProcessing) {
                        setTimeout(() => inputRef.current?.focus(), 0);
                      }
                    }}
                    autoFocus
                    autoComplete="off"
                    disabled={isProcessing}
                    className="w-full p-4 text-2xl text-center border-4 border-blue-400 rounded-xl shadow-inner focus:ring-4 focus:ring-blue-600 focus:border-blue-600 transition duration-150 font-mono tracking-wider disabled:bg-gray-100"
                />
            </div>

            <button 
                onClick={validarGrado}
                disabled={isProcessing || !codigo.trim()}
                className={`w-full py-4 px-4 text-xl font-bold rounded-xl shadow-lg transition duration-200 transform ${
                  isProcessing ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
                {isProcessing ? 'Procesando...' : 'Validar Entrada'}
            </button>

            {mensaje && (
                <div className={`mt-6 p-4 rounded-xl shadow-md text-center font-semibold text-lg transition-all duration-300 ${
                  mensaje.includes("ACCESO DENEGADO") ? "bg-red-500 text-white" : 
                  mensaje.includes("autorizado") ? "bg-green-500 text-white" : 
                  "bg-yellow-200 text-yellow-800"
                }`}>
                  {mensaje}
                </div>
            )}

            {nombre && grado && tipo && (
                <div className={`mt-6 p-6 rounded-xl shadow-xl border-t-4 ${
                  isDenied ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"
                }`}>
                  <h3 className="text-xl font-bold mb-3 text-gray-800">Detalles del Estudiante</h3>
                  <p className="text-lg text-gray-700 mb-1">
                    <span className="font-semibold">Nombre:</span> {nombre}
                  </p>
                  <p className="text-lg text-gray-700 mb-1">
                    <span className="font-semibold">Grado:</span> <span className={`${isDenied ? 'text-red-600 font-extrabold' : 'text-green-600 font-extrabold'}`}>{grado}</span>
                  </p>
                  <p className="text-lg text-gray-700">
                    <span className="font-semibold">Alimentación:</span> {tipo}
                  </p>
                </div>
            )}

        </div>
    </div>
  );
}