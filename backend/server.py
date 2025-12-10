from flask import Flask, request, jsonify
import mysql.connector
from flask_cors import CORS
import requests
from datetime import datetime, time

app = Flask(__name__)
CORS(app)

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'root123',
    'database': 'cafeteria',
    'port': 3306,
    'charset': 'utf8mb4'
}

# =============================================================================
# BUSINESS RULES
# =============================================================================
BLOCKED_HOMEROOMS = ["K2", "K3", "K4", "K5", "1", "2"]
PRINTER_SERVER_URL = "http://localhost:3000/imprimir"

# Schedule definitions
SNACK_START = time(6, 0)      # 6:00 AM
SNACK_END = time(11, 20)      # 11:20 AM
LUNCH_START = time(11, 20)    # 11:20 AM
LUNCH_END = time(18, 0)       # 6:00 PM

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_current_service():
    """Determine which food service is currently available"""
    now = datetime.now().time()

    if SNACK_START <= now < SNACK_END:
        return "SNACK"
    elif LUNCH_START <= now < LUNCH_END:
        return "LUNCH"
    else:
        return None


def is_eligible_for_service(food_type, current_service):
    """Check if student's food type is eligible for current service"""
    food_type_upper = food_type.upper()

    if current_service == "SNACK":
        return "REFRIGERIO" in food_type_upper
    elif current_service == "LUNCH":
        return "ALMUERZO" in food_type_upper
    else:
        return False


def send_to_printer(student_data, service_type):
    """Send ticket data to Node.js printer server"""
    try:
        payload = {
            "contenido": {
                "codigo": student_data['codigo_estudiante'],
                "nombre": student_data['nombre'],
                "grado": student_data['grado'],
                "tipo_alimentacion": service_type
            }
        }

        print(f"📤 Sending to printer: {student_data['nombre']} - {service_type}")

        response = requests.post(PRINTER_SERVER_URL, json=payload, timeout=5)

        if response.status_code == 200:
            print("✅ Ticket sent successfully")
            return True
        else:
            print(f"❌ Printer error: {response.text}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"❌ Connection error with printer server: {e}")
        return False


def save_claim_record(cursor, conn, student_data, service_type):
    """Save the food claim record to database"""
    try:
        sql = """
            INSERT INTO registros_validacion
                (codigo_estudiante, nombre, tipo_alimentacion, fecha_hora, plan, estado)
            VALUES (%s, %s, %s, NOW(), %s, %s)
        """
        cursor.execute(sql, (
            student_data['codigo_estudiante'],
            student_data['nombre'],
            student_data['tipo_alimentacion'],
            service_type,
            'VALIDADO'
        ))
        conn.commit()
        print("✅ Claim record saved to database")
        return True

    except mysql.connector.Error as err:
        conn.rollback()
        print(f"❌ Database error: {err}")
        return False


def check_duplicate_claim(cursor, student_code, service_type):
    """Check if student already claimed this service today"""
    cursor.execute("""
        SELECT COUNT(*) AS count
        FROM registros_validacion
        WHERE codigo_estudiante = %s
          AND plan = %s
          AND DATE(fecha_hora) = CURDATE()
    """, (student_code, service_type))

    result = cursor.fetchone()
    return result['count'] > 0

# =============================================================================
# MAIN ENDPOINT: VERIFY STUDENT CODE
# =============================================================================
@app.route("/verificar", methods=["POST"])
def verificar_codigo():
    data = request.get_json()
    codigo = data.get("codigo")

    print(f"\n📥 Code received: {codigo}")

    if not codigo:
        return jsonify({"error": "No code provided"}), 400

    conn = None
    try:
        # Connect to database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Search for student
        cursor.execute("""
            SELECT codigo_estudiante, nombre, grado, tipo_alimentacion
            FROM estudiantes
            WHERE codigo_estudiante = %s
        """, (codigo,))

        estudiante = cursor.fetchone()

        # VALIDATION 1: Student not found
        if not estudiante:
            print("❌ Student not found")
            return jsonify({
                "error": "invalid_code",
                "message": "Code not found. Please go to treasury."
            }), 404

        nombre = estudiante['nombre']
        grado = estudiante['grado']
        tipo_alimentacion = estudiante['tipo_alimentacion']

        print(f"✅ Student found: {nombre} - Grade: {grado} - Food: {tipo_alimentacion}")

        # VALIDATION 2: Blocked homeroom
        if grado in BLOCKED_HOMEROOMS:
            print(f"🚫 Blocked homeroom: {grado}")
            return jsonify({
                **estudiante,
                "success": False,
                "message": f"{nombre} homeroom is not suitable to get a ticket"
            }), 403

        # VALIDATION 3: No food service (NINGUNO)
        if tipo_alimentacion.upper() == "NINGUNO" or not tipo_alimentacion:
            print(f"⚠️ No food service assigned")
            return jsonify({
                **estudiante,
                "success": False,
                "message": f"{nombre} doesn't have any food service, please go to treasury"
            }), 403

        # VALIDATION 4: Check current service time
        current_service = get_current_service()

        if not current_service:
            print("⏰ Outside service hours")
            return jsonify({
                **estudiante,
                "success": False,
                "message": "No food service available at this time (Service hours: 6:00 AM - 6:00 PM)"
            }), 403

        # VALIDATION 5: Check if student is eligible for current service
        if not is_eligible_for_service(tipo_alimentacion, current_service):
            service_name = "snack" if current_service == "SNACK" else "lunch"
            print(f"❌ Not eligible for {current_service}")
            return jsonify({
                **estudiante,
                "success": False,
                "message": f"{nombre} only has {tipo_alimentacion}, not eligible to take service at this time ({service_name})"
            }), 403

        # VALIDATION 6: Check for duplicate claim today
        if check_duplicate_claim(cursor, codigo, current_service):
            service_name = "snack" if current_service == "SNACK" else "lunch"
            print(f"⛔ Already claimed {current_service} today")
            return jsonify({
                **estudiante,
                "success": False,
                "message": f"{nombre} already claimed {service_name} today"
            }), 403

        # ALL VALIDATIONS PASSED - PROCESS TICKET
        print(f"✅ All validations passed - Processing ticket for {current_service}")

        # Send to printer
        print_success = send_to_printer(estudiante, current_service)

        if not print_success:
            return jsonify({
                **estudiante,
                "success": False,
                "message": "Printer error. Please try again."
            }), 500

        # Save claim record
        save_success = save_claim_record(cursor, conn, estudiante, current_service)

        if not save_success:
            return jsonify({
                **estudiante,
                "success": False,
                "message": "Ticket printed but failed to save record. Please contact administrator."
            }), 500

        # SUCCESS
        service_name = "snack" if current_service == "SNACK" else "lunch"
        return jsonify({
            **estudiante,
            "success": True,
            "service_claimed": current_service,
            "message": f"Ticket printed successfully! {nombre} can claim {service_name}."
        }), 200

    except Exception as e:
        print(f"❌ Server error: {e}")
        return jsonify({
            "error": "server_error",
            "message": "Internal server error. Please try again."
        }), 500

    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()


# =============================================================================
# TEST ENDPOINTS
# =============================================================================
@app.route("/test_db", methods=["GET"])
def test_db():
    """Test database connection"""
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT codigo_estudiante, nombre FROM estudiantes LIMIT 5")
        datos = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(datos)
    except Exception as e:
        print(f"❌ Database error: {e}")
        return jsonify({"error": "Database connection failed"}), 500


@app.route("/test_nodejs", methods=["GET"])
def test_nodejs():
    """Test Node.js printer server connection"""
    try:
        response = requests.get("http://localhost:3000/", timeout=3)
        return jsonify({
            "status": "success",
            "message": "Node.js connection successful",
            "nodejs_status": response.status_code
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Could not connect to Node.js: {str(e)}"
        }), 500


@app.route("/current_service", methods=["GET"])
def current_service():
    """Get current service time (for testing)"""
    service = get_current_service()
    now = datetime.now()
    return jsonify({
        "current_time": now.strftime("%I:%M %p"),
        "current_service": service,
        "snack_hours": "6:00 AM - 11:20 AM",
        "lunch_hours": "11:20 AM - 6:00 PM"
    })


# =============================================================================
# START SERVER
# =============================================================================
if __name__ == "__main__":
    app.config["JSON_AS_ASCII"] = False
    print("\n" + "="*60)
    print("🚀 CAFETERIA BACKEND SERVER")
    print("="*60)
    print(f"📍 Backend API: http://localhost:5000")
    print(f"🔗 Printer Server: {PRINTER_SERVER_URL}")
    print(f"🍎 Snack Hours: 6:00 AM - 11:20 AM")
    print(f"🍽️  Lunch Hours: 11:20 AM - 6:00 PM")
    print(f"🚫 Blocked Homerooms: {', '.join(BLOCKED_HOMEROOMS)}")
    print("="*60 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
