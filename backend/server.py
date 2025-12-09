from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS
import requests
from datetime import date # Importamos 'date' para el control de día

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------
# CONFIGURACIÓN BASE DE DATOS
# ---------------------------------------------------------
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': '12345',
    'database': 'cafeteria',
    'port': 3306,
    'charset': 'utf8mb4'
}

# ---------------------------------------------------------
# GRADOS QUE NO PUEDEN IMPRIMIR
# ---------------------------------------------------------
GRADOS_NO_PERMITIDOS = ["K2", "K3", "K4", "K5", "1", "2"]

# ---------------------------------------------------------
# URL DEL SERVIDOR DE IMPRESIÓN NODE.JS
# ---------------------------------------------------------
NODE_SERVER_URL = "http://localhost:3000/imprimir"


# ---------------------------------------------------------
# FUNCIÓN PARA MANDAR A IMPRIMIR EN NODE
# ---------------------------------------------------------
def imprimir_ticket_nodejs(estudiante):
    """Envía los datos del estudiante al servidor Node.js para imprimir"""

    codigo_impresion = estudiante.get('codigo_estudiante') or estudiante.get('codigo')

    if not all([codigo_impresion, estudiante.get('nombre'),
                estudiante.get('grado'), estudiante.get('tipo_alimentacion')]):
        print("❌ Error: faltan datos esenciales del estudiante.")
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


# ---------------------------------------------------------
# ENDPOINT PRINCIPAL: VERIFICAR CÓDIGO Y (GUARDAR/IMPRIMIR)
# ---------------------------------------------------------
@app.route("/verificar", methods=["POST"])
def verificar_codigo():
    data = request.get_json()
    codigo = data.get("codigo")

    print("📥 Código recibido del frontend:", codigo)

    if not codigo:
        return jsonify({"error": "No se recibió ningún código"}), 400

    conn = None # La conexión se inicializa aquí
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # 1. BUSCAR ESTUDIANTE EN TABLA 'estudiantes'
        cursor.execute("""
            SELECT codigo_estudiante, nombre, grado, tipo_alimentacion
            FROM estudiantes
            WHERE codigo_estudiante = %s
        """, (codigo,))
        estudiante = cursor.fetchone()
        
        if not estudiante:
            print("❌ Estudiante no encontrado")
            return jsonify({"error": "Código no válido o estudiante no encontrado"}), 404

        print("✅ Estudiante encontrado:", estudiante)
        
        grado_estudiante = estudiante.get('grado')
        tipo_alimento = estudiante.get('tipo_alimentacion')
        impresion_exitosa = False
        mensaje_impresion = "" # Inicializar mensaje

        # ---------------------------------------------------------
        # VALIDACIÓN DE GRADO BLOQUEADO
        # ---------------------------------------------------------
        if grado_estudiante in GRADOS_NO_PERMITIDOS:
            mensaje_impresion = (
                f"🚫 ACCESO DENEGADO: El grado {grado_estudiante} NO puede imprimir ticket."
            )
            print(mensaje_impresion)

        else:
            # =========================================================
            # MODIFICACIÓN 1: CONTROL DE DOBLE RECLAMO HOY
            # =========================================================
            cursor.execute("""
                SELECT COUNT(*) AS conteo_reclamos
                FROM registros_validacion
                WHERE codigo_estudiante = %s
                  AND plan = %s
                  AND DATE(fecha_hora) = CURDATE()
            """, (codigo, tipo_alimento))
            
            conteo = cursor.fetchone()['conteo_reclamos']
            
            if conteo > 0:
                mensaje_impresion = (
                    f"⛔ RECLAMO DUPLICADO: El estudiante ya reclamó {tipo_alimento} hoy ({str(date.today())})."
                )
                print(mensaje_impresion)
                return jsonify({
                    **estudiante,
                    "impreso": False,
                    "mensaje_impresion": mensaje_impresion
                }), 403 
            
            # ---------------------------------------------------------
            # PROCEDER A IMPRIMIR (Si no hay reclamo duplicado)
            # ---------------------------------------------------------
            impresion_exitosa = imprimir_ticket_nodejs(estudiante)
            
            if impresion_exitosa:
                # =========================================================
                # MODIFICACIÓN 2: INSERCIÓN DEL REGISTRO Y COMMIT 💾
                # =========================================================
                try:
                    sql_insert = """
                        INSERT INTO registros_validacion 
                            (codigo_estudiante, nombre, tipo_alimentacion, fecha_hora, plan, estado)
                        VALUES (%s, %s, %s, NOW(), %s, %s)
                    """
                    datos_reclamo = (
                        estudiante.get('codigo_estudiante'),
                        estudiante['nombre'],
                        tipo_alimento,
                        tipo_alimento, # Usamos el tipo_alimentacion como 'plan'
                        'VALIDADO'
                    )

                    cursor.execute(sql_insert, datos_reclamo)
                    conn.commit() # <--- ¡GUARDA EL REGISTRO PERMANENTEMENTE!
                    mensaje_impresion = "Ticket impreso y registro guardado correctamente."
                    print("✅ Registro de reclamación guardado con éxito.")
                
                except mysql.connector.Error as err:
                    conn.rollback()
                    print(f"❌ ERROR CRÍTICO al guardar registro en DB: {err}")
                    mensaje_impresion = f"Ticket impreso, pero FALLÓ AL GUARDAR REGISTRO: {err.msg}"
                    impresion_exitosa = False 
            else:
                mensaje_impresion = "⚠️ Error al imprimir"

        # ---------------------------------------------------------
        # RESPUESTA AL FRONTEND
        # ---------------------------------------------------------
        return jsonify({
            **estudiante,
            "impreso": impresion_exitosa,
            "mensaje_impresion": mensaje_impresion
        })

    except Exception as e:
        print("❌ Error general en la ruta /verificar:", e)
        return jsonify({"error": "Error interno del servidor o de base de datos"}), 500
    
    finally:
        # Cierre final de la conexión
        if conn and conn.is_connected():
            cursor.close()
            conn.close()


# ---------------------------------------------------------
# TEST: VERIFICAR BASE DE DATOS (SIN CAMBIOS)
# ---------------------------------------------------------
@app.route("/test_db", methods=["GET"])
def test_db():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT codigo_estudiante, nombre FROM estudiantes LIMIT 5")
        datos = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(datos)
    except Exception as e:
        print("❌ Error:", e)
        return jsonify({"error": "Error al conectar con la BD"}), 500


# ---------------------------------------------------------
# TEST: VERIFICAR CONEXIÓN CON NODE.JS (SIN CAMBIOS)
# ---------------------------------------------------------
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


# ---------------------------------------------------------
# INICIAR SERVIDOR FLASK
# ---------------------------------------------------------
if __name__ == "__main__":
    app.config["JSON_AS_ASCII"] = False
    print("\n🚀 Servidor Flask iniciado en http://localhost:5000")
    print("🔗 Conectándose a Node.js en http://localhost:3000")
    print("🖨️ Impresora configurada: POS-80C\n")
    app.run(host="0.0.0.0", port=5000, debug=True)