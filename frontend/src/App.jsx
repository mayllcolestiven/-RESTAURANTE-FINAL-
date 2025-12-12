import React, { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import ParticleBackground from "./CustomParticleBackground.jsx";
import "./app.css";

import JaggyImage from "./assets/sin fondo 1.png";
import DefaultUserImage from "./assets/person_13924070.png";

function App() {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Keep focus on input always
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, codigo]);

  // Verify student code
  const verificarCodigo = async (value) => {
    // Validate code length
    if (value.length < 3 || value.length > 6) {
      Swal.fire({
        html: `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Invalid Code</div>
            <div style="font-size: 16px; margin-bottom: 30px;">Code must be between 3 and 6 digits</div>
            <div style="font-size: 48px; color: #dc3545;">✖</div>
          </div>
        `,
        timer: 2500,
        showConfirmButton: false,
        position: "top",
        customClass: {
          popup: 'custom-swal-popup'
        }
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
      console.log("Response from backend:", data);

      // SUCCESS CASE
      if (response.ok && data.success) {
        // Extract service type from message or use tipo_alimentacion
        const serviceName = data.service_claimed || data.tipo_alimentacion;

        Swal.fire({
          html: `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">${data.nombre}</div>
              <div style="font-size: 16px; margin-bottom: 30px;">You can claim your ${serviceName}</div>
              <div style="font-size: 48px; color: #28a745;">✓</div>
            </div>
          `,
          timer: 2500,
          showConfirmButton: false,
          position: "top",
          customClass: {
            popup: 'custom-swal-popup'
          }
        });
      }
      // ERROR CASES
      else {
        // Determine icon and color based on error type
        let icon = "✖";
        let color = "#dc3545";

        if (data.message && data.message.includes("homeroom")) {
          icon = "⚠";
          color = "#ffc107";
        } else if (data.message && data.message.includes("already claimed")) {
          icon = "ℹ";
          color = "#17a2b8";
        }

        Swal.fire({
          html: `
            <div style="text-align: center; padding: 20px;">
              <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">${data.nombre || "Error"}</div>
              <div style="font-size: 16px; margin-bottom: 30px;">${data.message || data.error || "Please try again"}</div>
              <div style="font-size: 48px; color: ${color};">${icon}</div>
            </div>
          `,
          timer: 2800,
          showConfirmButton: false,
          position: "top",
          customClass: {
            popup: 'custom-swal-popup'
          }
        });
      }

      setCodigo("");
      setTimeout(() => inputRef.current?.focus(), 100);

    } catch (error) {
      console.error("Connection error:", error);
      Swal.fire({
        html: `
          <div style="text-align: center; padding: 20px;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">Connection Error</div>
            <div style="font-size: 16px; margin-bottom: 30px;">Could not connect to server</div>
            <div style="font-size: 48px; color: #dc3545;">✖</div>
          </div>
        `,
        timer: 2800,
        showConfirmButton: false,
        position: "top",
        customClass: {
          popup: 'custom-swal-popup'
        }
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
              placeholder="Enter your code here"
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

          {loading && <p style={{ color: "white" }}>⏳ Validating...</p>}

          <div className="default-image-container">
            <img id="defaultImage" src={DefaultUserImage} alt="Default User" />
          </div>
        </div>

        <img src={JaggyImage} alt="jaguar" className="jaggy right-jaggy" />
      </div>
    </div>
  );
}

export default App;
