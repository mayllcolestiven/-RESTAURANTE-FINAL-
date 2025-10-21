import React, { useState } from "react";
import "./ValidarComida.css";

export default function ValidarComida() {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoAlimentacion, setTipoAlimentacion] = useState("");

  const validarCodigo = async () => {
    if (!codigo.trim()) {
      setMensaje("Ingrese un código válido");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });

      if (!response.ok) {
        setMensaje("❌ Código no encontrado o no válido");
        setNombre("");
        setTipoAlimentacion("");
        return;
      }

      const data = await response.json();
      setNombre(data.nombre);
      setTipoAlimentacion(data.tipo_alimentacion);

      // Lógica de validación según tipo de alimentación
      if (data.tipo_alimentacion === "REFRIGERIO") {
        setMensaje("✅ Puedes reclamar REFRIGERIO");
      } else if (data.tipo_alimentacion === "ALMUERZO") {
        setMensaje("✅ Puedes reclamar ALMUERZO");
      } else if (data.tipo_alimentacion === "REFRIGERIO Y ALMUERZO") {
        setMensaje("✅ Puedes reclamar REFRIGERIO Y ALMUERZO");
      } else {
        setMensaje("⚠️ Tipo de alimentación no definido");
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      setMensaje("Error al conectar con el servidor");
    }
  };

  return (
    <div className="validador-comida">
      <h2>Validación de Comida</h2>
      <input
        type="text"
        placeholder="Ingrese código"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
      />
      <button onClick={validarCodigo}>Validar</button>

      {mensaje && <div className="mensaje">{mensaje}</div>}

      {nombre && tipoAlimentacion && (
        <div className="resultado">
          <p>Nombre: {nombre}</p>
          <p>Tipo de Alimentación: {tipoAlimentacion}</p>
        </div>
      )}
    </div>
  );
}
