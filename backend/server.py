from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS
import requests
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
db_config = {
    'host': '172.16.0.28',    # IP del servidor remoto
    'user': 'flaskuser',
    'password': '12345',
    'database': 'cafeteria'
}

# Grados que NO están permitidos para imprimir tickets (K2 a 2)
GRADOS_NO_PERMITIDOS = ["K2", "K3", "K4", "K5", "1", "2"]

# URL del servidor de impresión Node.js
NODE_SERVER_URL = "http://localhost:3000/imprimir"

# Función para imprimir ticket llamando al servidor Node.js
def imprimir_ticket_nodejs(estudiante):
    """Envía los datos del estudiante al servidor Node.js para imprimir"""
    
    # Intenta obtener el código usando 'codigo_estudiante'
    codigo_impresion = estudiante.get('codigo_estudiante') or estudiante.get('codigo')
    
    # Validación de datos esenciales
    if not all([codigo_impresion, estudiante.get('nombre'), estudiante.get('grado'), estudiante.get('tipo_alimentacion')]):
        print("❌ Error: Faltan datos esenciales del estudiante para imprimir.")
        return False
        
    try:
        payload = {
            "contenido": {
                "codigo": codigo_impresion,
                "nombre": estudiante['nombre'],
                "grado": estudiante['grado'],
                "tipo_alimentacion": estudiante['tipo_alimentacion']
            }
        }
        
        print(f"📤 Enviando a Node.js: {payload}")
        
        response = requests.post(NODE_SERVER_URL, json=payload, timeout=5)
        
        if response.status_code == 200:
            print("✅ Ticket impreso correctamente desde Node.js")
            return True
        else:
            print(f"❌ Error al imprimir: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión con Node.js: {e}")
        return False

# RUTA UNIFICADA: Verifica el código, comprueba el grado y solo IMPRIME si está permitido.
@app.route("/verificar", methods=["POST"])
def verificar_codigo():
    data = request.get_json()
    codigo = data.get("codigo")

    print("📥 Código recibido del frontend para verificación:", codigo)

    if not codigo:
        return jsonify({"error": "No se recibió ningún código"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT codigo_estudiante, nombre, grado, tipo_alimentacion 
            FROM estudiantes 
            WHERE codigo_estudiante = %s
            """,
            (codigo,)
        )
        estudiante = cursor.fetchone()
        cursor.close()
        conn.close()

        if estudiante:
            print("✅ Estudiante encontrado:", estudiante)
            
            grado_estudiante = estudiante.get('grado')
            impresion_exitosa = False
            
            # 1. COMPROBACIÓN CRÍTICA DEL GRADO (Lógica de bloqueo)
            if grado_estudiante and grado_estudiante in GRADOS_NO_PERMITIDOS:
                # El grado está bloqueado. No se llama a la impresora.
                mensaje_impresion = f"🚫 ACCESO DENEGADO: Grado {grado_estudiante} no puede usar este sistema. No se imprime ticket."
                print(mensaje_impresion)
            else:
                # 2. IMPRESIÓN AUTOMÁTICA (Si el grado está permitido)
                impresion_exitosa = imprimir_ticket_nodejs(estudiante)
                mensaje_impresion = "Ticket impreso correctamente" if impresion_exitosa else "⚠️ Error al imprimir"

            # 3. Respuesta al Frontend
            return jsonify({
                **estudiante,
                "impreso": impresion_exitosa, # Indica si se intentó imprimir con éxito
                "mensaje_impresion": mensaje_impresion # Mensaje detallado para el frontend
            })
        else:
            print("❌ No se encontró estudiante con ese código.")
            return jsonify({"error": "Código no válido o estudiante no encontrado"}), 404

    except Exception as e:
        print("❌ Error al conectar con la base de datos:", e)
        return jsonify({"error": "Error al conectar con la base de datos"}), 500


# La ruta /imprimir_ticket se ELIMINA ya que /verificar lo hace todo.

# Ruta de prueba para verificar conexión a la base
@app.route("/test_db", methods=["GET"])
def test_db():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT codigo_estudiante, nombre FROM estudiantes LIMIT 5")
        resultados = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(resultados)
    except Exception as e:
        print("❌ Error:", e)
        return jsonify({"error": "Error al conectar con la base de datos"}), 500


# Ruta para probar conexión con Node.js
@app.route("/test_nodejs", methods=["GET"])
def test_nodejs():
    try:
        response = requests.get("http://localhost:3000/", timeout=3)
        return jsonify({
            "status": "success",
            "message": "Conexión con Node.js exitosa",
            "nodejs_status": response.status_code
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"No se pudo conectar con Node.js: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.config["JSON_AS_ASCII"] = False
    print("\n🚀 Servidor Flask iniciado en http://localhost:5000")
    print("🔗 Conectándose a Node.js en http://localhost:3000")
    print("🖨️  Impresora configurada: XP-80\n")
    app.run(host="0.0.0.0", port=5000, debug=True)