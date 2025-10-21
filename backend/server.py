from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "12345",
    "database": "cafeteria",
    "charset": "utf8mb4"
}

# Ruta para verificar el código del estudiante
@app.route("/verificar", methods=["POST"])
def verificar_codigo():
    data = request.get_json()
    codigo = data.get("codigo")

    # Mostrar en consola el código recibido desde el frontend
    print("Código recibido del frontend:", codigo)

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
            print("Estudiante encontrado:", estudiante)  # 👈 Para depurar también
            return jsonify(estudiante)
        else:
            print("No se encontró estudiante con ese código.")  # 👈 Para depurar
            return jsonify({"error": "Código no válido o estudiante no encontrado"}), 404

    except Exception as e:
        print("Error al conectar con la base de datos:", e)
        return jsonify({"error": "Error al conectar con la base de datos"}), 500


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
        print("Error:", e)
        return jsonify({"error": "Error al conectar con la base de datos"}), 500


if __name__ == "__main__":
    app.config["JSON_AS_ASCII"] = False  # Para mostrar acentos correctamente
    app.run(host="0.0.0.0", port=5000, debug=True)
