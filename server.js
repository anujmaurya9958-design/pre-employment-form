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
// serve static files from current directory like form.html //
app.use(express.static(path.join(__dirname)));

//  file upload setup using multer //
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){            // check if folder exists
    fs.mkdirSync(uploadDir);                // create folder if not
}

 // configure storage for multer //
const storage = multer.diskStorage({
    destination: function (req, file, cb) {    // set destination to uploads folder //
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {        // set filename with unique suffix //
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({storage });

// mysql database connection pool //
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Satyam2308@',
    database: process.env.DB_NAME || 'pre_employment_form',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// test database connection //
async function testDbConnection() {
    try {
        const conn = await pool.getConnection();  // get connection from pool //
        await conn.ping();             // ping database to test connection //
        conn. release();          // release connection back to pool //
        console.log('Database connection successful');
     }
    catch (err) {
        console.error('Database connection failed:', err.message);
    }
}

  // call testDbConnection on server start //
app.post(
    '/api/employees', 
    upload.fields([                   // handle multiple file uploads //
        { name: 'photo', maxCount: 1 },
        { name: 'resume', maxCount: 1 },
        { name: 'experienceLetters', maxCount: 1 },
        { name: 'relievingLetter', maxCount: 1 },
        { name: 'salarySlips', maxCount: 10 }
    ]),

    // route handler for form submission //
async (req, res) => {
        try {
            const body = req.body;        // form fields from request body //
            const files = req.files || {};

            const getSingleFileName = (field) =>        // helper to get single file name //
                files[field] && files[field][0] ? files[field][0].filename : null;

            const getMultipleFileNames = (field) =>          // helper to get multiple file names //
                files[field] ? files[field].map((f) => f.filename).join(',') : null;
        } 
}      
