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

      const data = await response.json();
      console.log("✅ Datos recibidos:", data);

      // ❌ CASO 1: Backend responde con error (código no válido)
      if (!response.ok || data.error) {
        Swal.fire({
          title: "❌ Código no válido",
          text: data.mensaje || "Por favor acércate a Tesorería",
          timer: 3000,
          showConfirmButton: false,
          toast: true,
          position: "top",
          customClass: { popup: "error-alert" },
        });
        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      // 🚫 CASO 2: Bloquear grados no permitidos
      const gradosNoPermitidos = ["K2", "K3", "K4", "K5", "1", "2"];

      if (gradosNoPermitidos.includes(data.grado)) {
        Swal.fire({
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
          customClass: { popup: "error-alert" },
        });
        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      // ✅ CASO 3: Validar horarios y mostrar alertas
      const hour = new Date().getHours();
      const minutes = new Date().getMinutes();

      // 🔹 SOLO REFRIGERIO
      if (data.tipo_alimentacion === "SOLO REFRIGERIO") {
        const esHoraRefrigerio = (hour >= 6 && hour < 11) || (hour === 11 && minutes < 30);

        if (esHoraRefrigerio) {
          // ✅ SÍ puede reclamar refrigerio
          Swal.fire({
            title: "",
            html: `
              <div style="text-align:center; line-height:1.4; font-size:18px;">
                <strong>Solo plan de<br>refrigerio</strong><br><br>
                ${data.nombre}<br>
                Grado: ${data.grado}<br><br>
                Puedes<br>reclamar tu<br>refrigerio
              </div>
            `,
            timer: 3500,
            showConfirmButton: false,
            toast: true,
            position: "top",
            customClass: { popup: "warning-alert" },
          });
        } else {
          // ❌ NO puede reclamar refrigerio
          Swal.fire({
            title: "",
            html: `
              <div style="text-align:center; line-height:1.4; font-size:18px;">
                <strong>Solo plan de<br>refrigerio</strong><br><br>
                ${data.nombre}<br>
                Grado: ${data.grado}<br><br>
                No puedes<br>reclamar tu<br>refrigerio
              </div>
            `,
            timer: 3500,
            showConfirmButton: false,
            toast: true,
            position: "top",
            customClass: { popup: "light-error-alert" },
          });
        }

        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      // 🔹 SOLO ALMUERZO
      if (data.tipo_alimentacion === "SOLO ALMUERZO") {
        const esHoraAlmuerzo = (hour === 11 && minutes >= 40) || (hour >= 12 && hour < 18);

        if (esHoraAlmuerzo) {
          // ✅ SÍ puede reclamar almuerzo
          Swal.fire({
            title: "",
            html: `
              <div style="text-align:center; line-height:1.4; font-size:18px;">
                <strong>Solo plan de<br>almuerzo</strong><br><br>
                ${data.nombre}<br>
                Grado: ${data.grado}<br><br>
                Puedes<br>reclamar tu<br>almuerzo
              </div>
            `,
            timer: 3500,
            showConfirmButton: false,
            toast: true,
            position: "top",
            customClass: { popup: "purple-alert" },
          });
        } else {
          // ❌ NO puede reclamar almuerzo
          Swal.fire({
            title: "",
            html: `
              <div style="text-align:center; line-height:1.4; font-size:18px;">
                <strong>Solo plan de<br>almuerzo</strong><br><br>
                ${data.nombre}<br>
                Grado: ${data.grado}<br><br>
                No puedes<br>reclamar tu<br>almuerzo
              </div>
            `,
            timer: 3500,
            showConfirmButton: false,
            toast: true,
            position: "top",
            customClass: { popup: "light-error-alert" },
          });
        }

        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      // 🔹 REFRIGERIO Y ALMUERZO (Doble plan)
      if (data.tipo_alimentacion === "REFRIGERIO Y ALMUERZO") {
        const esHoraRefrigerio = (hour >= 6 && hour < 11) || (hour === 11 && minutes < 40);
        const esHoraAlmuerzo = (hour === 11 && minutes >= 40) || (hour >= 12 && hour < 18);

        if (esHoraRefrigerio) {
          // ✅ Puede reclamar REFRIGERIO
          Swal.fire({
            title: "",
            html: `
              <div style="text-align:center; line-height:1.4; font-size:18px;">
                <strong>Doble plan</strong><br><br>
                ${data.nombre}<br>
                Grado: ${data.grado}<br><br>
                Puedes<br>reclamar tu<br>refrigerio
              </div>
            `,
            timer: 3500,
            showConfirmButton: false,
            toast: true,
            position: "top",
            customClass: { popup: "doubleplan-alert" },
          });
        } else if (esHoraAlmuerzo) {
          // ✅ Puede reclamar ALMUERZO
          Swal.fire({
            title: "",
            html: `
              <div style="text-align:center; line-height:1.4; font-size:18px;">
                <strong>Doble plan</strong><br><br>
                ${data.nombre}<br>
                Grado: ${data.grado}<br><br>
                Puedes<br>reclamar tu<br>almuerzo
              </div>
            `,
            timer: 3500,
            showConfirmButton: false,
            toast: true,
            position: "top",
            customClass: { popup: "doubleplan-alert" },
          });
        } else {
          // ❌ Fuera de horario (ni refrigerio ni almuerzo)
          Swal.fire({
            title: "",
            html: `
              <div style="text-align:center; line-height:1.4; font-size:18px;">
                <strong>Doble plan</strong><br><br>
                ${data.nombre}<br>
                Grado: ${data.grado}<br><br>
                Fuera de<br>horario
              </div>
            `,
            timer: 3500,
            showConfirmButton: false,
            toast: true,
            position: "top",
            customClass: { popup: "light-error-alert" },
          });
        }

        setCodigo("");
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      // 🔹 Sin plan definido
      Swal.fire({
        title: "⚠️ Sin plan definido",
        html: `
          <strong>${data.nombre}</strong><br>
          Grado: ${data.grado}<br>
          Por favor acércate a Tesorería
        `,
        timer: 3000,
        showConfirmButton: false,
        toast: true,
        position: "top",
        customClass: { popup: "warning-alert" },
      });

      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      Swal.fire({
        title: "⚠️ Error de conexión",
        text: "No se pudo conectar con el servidor",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top",
        customClass: { popup: "error-alert" },
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
              onBlur={() => setTimeout(() => inputRef.current?.focus(), 0)}
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