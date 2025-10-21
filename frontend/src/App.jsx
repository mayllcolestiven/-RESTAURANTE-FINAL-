import React, { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import ParticleBackground from "./CustomParticleBackground.jsx";
import "./app.css";

// Importa las imágenes
import JaggyImage from "./assets/sin fondo 1.png";
import DefaultUserImage from "./assets/person_13924070.png";

function App() {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Mantener el foco en el input siempre
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, codigo]);

  // Función para verificar el código
  const verificarCodigo = async (value) => {
    if (value.length < 3 || value.length > 6) {
      Swal.fire({
        icon: "error",
        title: "❌ Código inválido",
        text: "El código debe tener entre 3 y 6 dígitos",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top",
      });
      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: value }),
      });

      if (!response.ok) {
        Swal.fire({
          icon: "error",
          title: "❌ Código no válido",
          text: "Por favor acércate a Tesorería",
          timer: 2000,
          showConfirmButton: false,
          toast: true,
          position: "top",
          customClass: { popup: "error-alert" },
        });
        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      const data = await response.json();
      console.log("✅ Datos recibidos:", data);

      // VALIDACIÓN: Bloquear grados no permitidos
      const gradosNoPermitidos = ["K2", "K3", "K4", "K5", "1", "2"];
      
      if (gradosNoPermitidos.includes(data.grado)) {
        Swal.fire({
          icon: "error",
          title: "🚫 ACCESO DENEGADO",
          html: `
            <strong>${data.nombre}</strong><br>
            Grado: ${data.grado}<br>
            Este grado NO puede usar este sistema
          `,
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: "top",
        });
        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return; // DETENER AQUÍ - No continuar con el proceso
      }

      const hour = new Date().getHours();
      let mensaje = "";
      let icono = "success";
      let titulo = "";

      if (data.tipo_alimentacion === "SOLO REFRIGERIO") {
        titulo = "✅ Solo plan de refrigerio";
        mensaje = "Puedes reclamar tu refrigerio";
        icono = "success";
      } else if (data.tipo_alimentacion === "SOLO ALMUERZO") {
        titulo = "🍽️ Solo plan de almuerzo";
        mensaje = "Puedes reclamar tu almuerzo";
        icono = "info";
      } else if (data.tipo_alimentacion === "REFRIGERIO Y ALMUERZO") {
        titulo = "🟢 Doble plan";
        mensaje = hour < 12
          ? "✅ Puedes reclamar tu refrigerio"
          : "✅ Puedes reclamar tu almuerzo";
        icono = "success";
      } else {
        titulo = "⚠️ Sin plan definido";
        mensaje = "Por favor acércate a Tesorería";
        icono = "warning";
      }

      Swal.fire({
        icon: icono,
        title: titulo,
        html: `
          <strong>${data.nombre}</strong><br>
          Grado: ${data.grado}<br>
          ${mensaje}
        `,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: "top",
      });

      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);

    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      Swal.fire({
        icon: "error",
        title: "⚠️ Error de conexión",
        text: "No se pudo conectar con el servidor",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top",
      });
      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <ParticleBackground />

      <div className="principal-container">
        <img src={JaggyImage} alt="jaguar" className="jaggy left-jaggy" />

        <div className="content">
          <h1>SCAN YOUR CARD</h1>

          <div className="input-container">
            <input
              ref={inputRef}
              type="text"
              id="numeroInput"
              placeholder="Put your code here"
              maxLength="6"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  verificarCodigo(codigo);
                }
              }}
              onBlur={() => {
                // Recuperar el foco si se pierde
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              disabled={loading}
              autoFocus
              autoComplete="off"
            />
          </div>

          {loading && <p style={{ color: "white" }}>⏳ Validando...</p>}

          <div className="default-image-container">
            <img id="defaultImage" src={DefaultUserImage} alt="Default User" />
          </div>

          <div className="student-info">
            <div className="student-name">
              <h2 id="studentName"></h2>
              <h2 id="tipoAlimentacion"></h2>
            </div>
          </div>
        </div>

        <img src={JaggyImage} alt="jaguar" className="jaggy right-jaggy" />
      </div>
    </div>
  );
}

export default App;