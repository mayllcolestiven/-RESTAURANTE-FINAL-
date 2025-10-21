import React, { useState } from "react";
import "./Principal.css";
import mascota from "../assets/mascota.png";
import userIcon from "../assets/user.png";

const Principal = () => {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [estudiante, setEstudiante] = useState(null);

  const validarCodigo = async () => {
    console.log("🔍 Código ingresado:", codigo);
    
    if (!codigo.trim()) {
      setMensaje("⚠️ Por favor ingresa un código");
      return;
    }

    setLoading(true);
    setMensaje("");
    setEstudiante(null);

    console.log("📡 Enviando petición al backend...");

    try {
      const response = await fetch("http://localhost:5000/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo }),
      });

      console.log("📥 Respuesta recibida:", response.status);

      if (!response.ok) {
        console.log("❌ Respuesta no OK");
        setMensaje("❌ Código no encontrado o no válido");
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("✅ Datos recibidos:", data);
      
      // Guardamos los datos del estudiante
      setEstudiante(data);
      setMensaje(`✅ Bienvenido ${data.nombre}`);
      
      // Limpiamos el input después de 3 segundos
      setTimeout(() => {
        setCodigo("");
        setMensaje("");
        setEstudiante(null);
      }, 3000);
      
    } catch (error) {
      console.error("💥 Error completo:", error);
      setMensaje("⚠️ Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      console.log("✅ Enter presionado!");
      validarCodigo();
    }
  };

  return (
    <div className="principal-container">
      <img src={mascota} alt="Mascota izquierda" className="mascota left" />

      <div className="card">
        <h2>SCAN YOUR CARD</h2>
        <input
          type="text"
          placeholder="Put your code here"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoFocus
        />
        
        {loading && <p className="loading">⏳ Validando código...</p>}
        
        {mensaje && (
          <div className={`mensaje ${estudiante ? 'exito' : 'error'}`}>
            {mensaje}
          </div>
        )}
        
        {estudiante && (
          <div className="info-estudiante">
            <p><strong>Nombre:</strong> {estudiante.nombre}</p>
            <p><strong>Grado:</strong> {estudiante.grado}</p>
            <p><strong>Tipo:</strong> {estudiante.tipo_alimentacion}</p>
          </div>
        )}
        
        <div className="circle">
          <img src={userIcon} alt="Usuario" />
        </div>
      </div>

      <img src={mascota} alt="Mascota derecha" className="mascota right" />
    </div>
  );
};

export default Principal;
