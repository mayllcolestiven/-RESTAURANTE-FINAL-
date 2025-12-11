# School Cafeteria Management System

A comprehensive cafeteria management system designed for educational institutions to manage student food services (snacks and lunches) with barcode validation, automated ticket printing, and service time controls.

## Overview

This system validates student codes, manages food service eligibility, tracks daily claims, and prints tickets through an integrated thermal printer system. It consists of three main components:

- **Frontend (React + Vite)**: User interface for code validation and student management
- **Backend (Python + Flask)**: API server handling business logic and database operations
- **Printer Server (Node.js + Express)**: Thermal printer controller using ESC/POS commands

## Features

- **Student Code Validation**: Barcode scanner integration for quick student identification
- **Service Time Management**: Automatic detection of snack time (6:00 AM - 11:20 AM) and lunch time (11:20 AM - 6:00 PM)
- **Eligibility Validation**: Checks student food plans and homeroom restrictions
- **Duplicate Prevention**: Prevents students from claiming the same service twice in one day
- **Thermal Ticket Printing**: Automated ticket generation with ESC/POS commands
- **Daily Keywords**: Displays rotating motivational keywords on tickets
- **Real-time Database**: MySQL integration for student records and claim history

## Project Structure

```
-RESTAURANTE-FINAL-/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Principal.jsx
│   │   │   ├── ValidadorGrado.jsx
│   │   │   ├── ValidarComida.jsx
│   │   │   └── Particles.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/                  # Python Flask backend
│   ├── server.py            # Main Flask application
│   ├── requirements.txt     # Python dependencies
│   └── venv/                # Virtual environment
├── server.js                 # Node.js printer server
├── package.json             # Node.js dependencies (printer server)
└── README.md                # This file
```

## Prerequisites

### Required Software

- **Node.js**: v18.0.0 or higher
- **Python**: 3.8 or higher
- **MySQL**: 8.0 or higher
- **Git**: For version control

### Hardware Requirements

- Thermal printer (ESC/POS compatible)
- Barcode scanner (optional but recommended)
- Network printer or USB printer with shared access

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/mayllcolestiven/cafeteria.git
cd -RESTAURANTE-FINAL-
```

### 2. Database Setup

Create the MySQL database and tables:

```sql
CREATE DATABASE cafeteria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cafeteria;

-- Students table
CREATE TABLE estudiantes (
    codigo_estudiante VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    grado VARCHAR(20) NOT NULL,
    tipo_alimentacion VARCHAR(50) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Validation records table
CREATE TABLE registros_validacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo_estudiante VARCHAR(50) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    tipo_alimentacion VARCHAR(50) NOT NULL,
    fecha_hora DATETIME NOT NULL,
    plan VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    INDEX idx_fecha (fecha_hora),
    INDEX idx_codigo (codigo_estudiante)
);
```

### 3. Backend Setup (Python Flask)

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Configure database connection** in `backend/server.py`:

```python
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'your_password',  # Change this
    'database': 'cafeteria',
    'port': 3306,
    'charset': 'utf8mb4'
}
```

### 4. Printer Server Setup (Node.js)

```bash
# Install dependencies (from root directory)
npm install
```

**Configure printer** in `server.js`:

```javascript
const PRINTER_SHARE_NAME = 'TICKET';  // Your printer name
const COMPUTER_NAME = 'localhost';    // Computer hosting the printer
const testMode = false;               // Set to false for production
```

### 5. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Configure API endpoint if needed
# Update API_URL in your components if backend is not on localhost:5000
```

## Running the Application

You need to start all three servers:

### 1. Start MySQL Database

Ensure MySQL server is running on port 3306.

### 2. Start Backend Server (Python Flask)

```bash
cd backend
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux
python server.py
```

Backend will run on: `http://localhost:5000`

### 3. Start Printer Server (Node.js)

```bash
# From root directory
node server.js
```

Printer server will run on: `http://localhost:3000`

### 4. Start Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

Frontend will run on: `http://localhost:5173`

## Configuration

### Backend Environment (`backend/server.py`)

```python
# Database configuration
db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': 'your_password',
    'database': 'cafeteria',
    'port': 3306
}

# Business rules
BLOCKED_HOMEROOMS = ["K2", "K3", "K4", "K5", "1", "2"]
PRINTER_SERVER_URL = "http://localhost:3000/imprimir"

# Service hours
SNACK_START = time(6, 0)      # 6:00 AM
SNACK_END = time(11, 20)      # 11:20 AM
LUNCH_START = time(11, 20)    # 11:20 AM
LUNCH_END = time(18, 0)       # 6:00 PM
```

### Printer Configuration (`server.js`)

```javascript
const PRINTER_SHARE_NAME = 'TICKET';
const COMPUTER_NAME = 'localhost';
const testMode = false;  // Set to true for testing without printing
```

## API Endpoints

### Backend API (Flask - Port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/verificar` | Validate student code and process ticket |
| GET | `/test_db` | Test database connection |
| GET | `/test_nodejs` | Test Node.js printer server connection |
| GET | `/current_service` | Get current service time information |

### Printer Server API (Node.js - Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server status check |
| POST | `/imprimir` | Send ticket to thermal printer |

## Dependencies

### Backend (Python)

```
Flask==3.1.0
flask-cors==5.0.0
mysql-connector-python==9.1.0
requests==2.32.3
```

### Printer Server (Node.js)

```
express==5.1.0
cors==2.8.5
node-thermal-printer==4.5.0
pdf-to-printer==5.6.1
pdfkit==0.17.2
```

### Frontend (React)

```
react==19.1.1
react-dom==19.1.1
vite==7.1.7
sweetalert2==11.26.2
tsparticles==3.9.1
@tsparticles/react==3.0.0
```

## Business Rules

1. **Blocked Homerooms**: Students in grades K2, K3, K4, K5, 1, and 2 cannot receive printed tickets
2. **Service Times**:
   - Snack: 6:00 AM - 11:20 AM
   - Lunch: 11:20 AM - 6:00 PM
3. **Food Types**:
   - Students with "REFRIGERIO" can claim during snack time
   - Students with "ALMUERZO" can claim during lunch time
   - Students with "NINGUNO" cannot claim any service
4. **Duplicate Prevention**: Students can only claim each service once per day

## Testing

### Test Mode

The printer server includes a test mode. Set `testMode = true` in `server.js` to simulate printing without sending to the physical printer:

```javascript
const testMode = true;  // Enable test mode
```

### Test Endpoints

```bash
# Test database connection
curl http://localhost:5000/test_db

# Test printer server connection
curl http://localhost:5000/test_nodejs

# Check current service time
curl http://localhost:5000/current_service
```

## Troubleshooting

### Common Issues

**Database Connection Error**
- Verify MySQL is running
- Check credentials in `backend/server.py`
- Ensure database `cafeteria` exists

**Printer Not Responding**
- Verify printer is shared with name 'TICKET'
- Check printer is online and has paper
- Test with `testMode = true` first
- Verify printer drivers are installed

**CORS Errors**
- Ensure backend has flask-cors installed
- Check frontend is making requests to correct backend URL

**Port Already in Use**
- Change port in respective server files
- Kill process using the port: `netstat -ano | findstr :5000` (Windows)

## Production Deployment

### For Production Use:

1. **Disable Flask Debug Mode**:
   ```python
   app.run(host="0.0.0.0", port=5000, debug=False)
   ```

2. **Disable Printer Test Mode**:
   ```javascript
   const testMode = false;
   ```

3. **Use Environment Variables**: Store sensitive data (DB passwords) in environment variables

4. **Use Production Web Server**: Consider using Gunicorn or uWSGI for Flask

5. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- GitHub Issues: https://github.com/mayllcolestiven/cafeteria/issues
- Email: Contact the development team

## Acknowledgments

- Built for educational institution cafeteria management
- ESC/POS thermal printing integration
- Designed for daily food service operations
