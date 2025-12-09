// (You already have the top portion in your snippet. Paste/replace below accordingly.)

// importing necessary modules //
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mysql = require('mysql2/promise');
require('dotenv').config();

// setting up express app //
const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// serve static files from current directory like form.html //
app.use(express.static(path.join(__dirname)));

// file upload setup using multer //
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// create a connection pool (recommended)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Satyam2308@',
  database: process.env.DB_NAME || 'employeeDB',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// health check
app.get('/ping', (req, res) => res.json({ ok: true }));

// form submit route
// - expects form fields: fullName, dob, email, phone, address
// - expects an uploaded file field named 'resume' (optional)
app.post('/submit', upload.single('resume'), async (req, res) => {
  try {
    // Basic validation (add more as needed)
    const { fullName, dob, email, phone, address } = req.body;
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ error: 'fullName is required and must be at least 2 characters' });
    }

    // file info (if uploaded)
    let resumePath = null;
    if (req.file) {
      // store a relative path so you can serve or move later
      resumePath = path.join('uploads', req.file.filename);
    }

    // Insert into DB (use prepared statement)
    const sql = `
      INSERT INTO employees (fullName, dob, email, phone, address, resume_path)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [fullName, dob || null, email || null, phone || null, address || null, resumePath];

    const [result] = await pool.execute(sql, params);

    return res.status(201).json({
      message: 'Form submitted successfully',
      insertId: result.insertId
    });
  } catch (err) {
    console.error('Error in /submit:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Example: Serve uploaded files (careful in production — restrict / protect as needed)
app.use('/uploads', express.static(uploadDir));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
