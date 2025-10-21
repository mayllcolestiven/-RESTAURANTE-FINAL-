import { useState, useRef, useEffect } from "react";
import "./ValidadorGrado.css";

const gradosNoPermitidos = ["K2", "K3", "K4", "K5", "1", "2"];

export default function ValidadorGrado() {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [grado, setGrado] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const inputRef = useRef(null);

  // Mantener el foco en el input siempre
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [codigo]);

  const validarGrado = async () => {
    if (!codigo.trim()) {
      setMensaje("Ingrese un código válido");
      setGrado("");
      setNombre("");
      setTipo("");
      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });

      if (!response.ok) {
        setMensaje("❌ Código no encontrado o no válido");
        setGrado("");
        setNombre("");
        setTipo("");
        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      const data = await response.json();

      setNombre(data.nombre);
      setGrado(data.grado || "N/A");
      setTipo(data.tipo_alimentacion || "N/A");

      // VALIDACIÓN CRÍTICA: Bloquear grados no permitidos
      if (gradosNoPermitidos.includes(data.grado)) {
        setMensaje(`🚫 ACCESO DENEGADO - Grado ${data.grado} no puede usar este sistema`);
        
        // Limpiar después de mostrar el mensaje
        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        
        // IMPORTANTE: Detener aquí y NO continuar con el proceso
        return;
      }

      // Si llega aquí, el estudiante SÍ está autorizado
      setMensaje(`✅ Estudiante autorizado: Grado ${data.grado}`);

      // Limpiar el input y recuperar el foco
      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);

    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      setMensaje("⚠️ Error al conectar con el servidor");
      setGrado("");
      setNombre("");
      setTipo("");
      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="validador-grado-container">
      <h2>Validación de Grado</h2>

      <input
        ref={inputRef}
        type="text"
        placeholder="Ingrese código"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            validarGrado();
          }
        }}
        onBlur={() => {
          // Recuperar el foco si se pierde
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        autoFocus
        autoComplete="off"
      />

      <button onClick={validarGrado}>Validar</button>

      {mensaje && (
        <div className={`aviso ${gradosNoPermitidos.includes(grado) ? "warning" : "success"}`}>
          {mensaje}
        </div>
      )}

      {nombre && grado && tipo && (
        <div className="resultado">
          <p><strong>Nombre:</strong> {nombre}</p>
          <p><strong>Grado:</strong> {grado}</p>
          <p><strong>Tipo alimentación:</strong> {tipo}</p>
        </div>
      )}
    </div>
  );
}