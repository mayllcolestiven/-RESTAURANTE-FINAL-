// src/CustomParticleBackground.jsx
import React, { useRef, useEffect } from 'react';

// 1. Clase Particle (Puede permanecer fuera del componente o dentro)
// Se queda igual, pero ahora toma el elemento canvas en el constructor.
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = '#ffffff';
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Borde envolvente (wrap-around)
        if (this.x > this.canvas.width) this.x = 0;
        if (this.x < 0) this.x = this.canvas.width;
        if (this.y > this.canvas.height) this.y = 0;
        if (this.y < 0) this.y = this.canvas.height;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}


const CustomParticleBackground = () => {
    // Referencia al elemento <canvas> en el DOM
    const canvasRef = useRef(null); 
    
    // Configuración que se ejecuta UNA SOLA VEZ al montar el componente
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return; // Salir si la ref no está lista

        const ctx = canvas.getContext('2d');
        let animationFrameId;
        const numberOfParticles = 100;
        const particles = [];

        // --- MÉTODOS ADAPTADOS DE TU CLASE ParticleEffect ---

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // No recreamos las partículas aquí para evitar un salto,
            // pero podrías llamar a 'init()' si quieres que se redistribuyan.
        };

        const init = () => {
            particles.length = 0; // Limpiar por si acaso
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle(canvas));
            }
        };

        const animate = () => {
            // Se usa el fondo degradado del CSS/background-color del canvas en el JSX
            // en lugar de dibujar un rectángulo aquí, por rendimiento.
            ctx.clearRect(0, 0, canvas.width, canvas.height); 
            
            // 1. Actualizar y dibujar partículas
            particles.forEach(particle => {
                particle.update();
                particle.draw(ctx);
            });

            // 2. Dibujar líneas entre partículas cercanas
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) {
                        ctx.beginPath();
                        // Opacidad basada en la distancia
                        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - distance/100})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            
            // Bucle de animación
            animationFrameId = requestAnimationFrame(animate);
        };

        // --- EJECUCIÓN ---
        resize(); // Ajustar el tamaño inicial
        init();   // Crear las partículas
        animate(); // Iniciar el bucle de animación
        
        // Listener de redimensionamiento
        window.addEventListener('resize', resize);

        // --- FUNCIÓN DE LIMPIEZA DE REACT ---
        // Se ejecuta cuando el componente se desmonta.
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []); // Array de dependencias vacío para ejecutar solo en el montaje

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <canvas 
            id="custom-particles" // Puedes usar este ID para el CSS
            ref={canvasRef} 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                // Puedes poner el fondo degradado aquí o en app.css
                background: 'linear-gradient(45deg, #1a1a1a, #4a4a4a)',
                zIndex: -1, // ¡Crucial para que se vea detrás de la UI!
            }} 
        />
    );
};

export default CustomParticleBackground;