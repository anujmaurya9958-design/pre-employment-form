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
if (!fs.existsSync(uploadDir)) {            // check if folder exists
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

// multer middleware instance with our storage configuration
const upload = multer({ storage });


// mySQL connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Satyam2308@',
    database: process.env.DB_NAME || 'employeeDB',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// verify that the database is reachable
async function testDbConnection() {
    try {
        const conn = await pool.getConnection(); // get a connection from the pool
        await conn.ping();                // simple ping to test connectivity
        conn.release();                          // give the connection back to the pool
        console.log('Database connection successful');
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
}


// handle form submission with file uploads at /api/employees
app.post(
    '/api/employees',
    upload.fields([
        { name: 'photo', maxCount: 1 },
        { name: 'resume', maxCount: 1 },
        { name: 'experienceLetters', maxCount: 10 },
        { name: 'relievingLetter', maxCount: 1 },
        { name: 'salarySlips', maxCount: 10 }
    ]),
    async (req, res) => {
        try {
            const body = req.body;
            const files = req.files || {};

            const getSingleFileName = (field) =>                //safely read a single uploaded file name
                files[field] && files[field][0] ? files[field][0].filename : null;

            const getMultiFileNames = (field) =>                   //join multiple file names into a single string
                files[field] ? files[field].map((f) => f.filename).join(',') : null;

            // map incoming form fields + file names into a clean data object
            const data = {
                full_name: body.fullName || null,
                dob: body.dob || null,
                gender: body.gender || null,
                mobile: body.mobile || null,
                email: body.email || null,
                current_address: body.currentAddress || null,
                permanent_address: body.permanentAddress || null,
                emergency_contact: body.emergencyContact || null,
                driving_license: body.drivingLicense || null,
                bike: body.bike || null,
                aadhaar: body.aadhaar || null,
                pan: body.pan || null,
                photo: getSingleFileName('photo'),
                resume: getSingleFileName('resume'),
                education_list: body.educationList || null,
                experience_letters: getMultiFileNames('experienceLetters'),
                relieving_letter: getSingleFileName('relievingLetter'),
                salary_slips: getMultiFileNames('salarySlips'),
                bank_account: body.bankAccount || null,
                bank_name: body.bankName || null,
                ifsc: body.ifsc || null,
                tax_details: body.taxDetails || null
            };

            // parameterized INSERT to protect against SQL injection
            const sql = `
        INSERT INTO employees (
          full_name, dob, gender, mobile, email,
          current_address, permanent_address, emergency_contact,
          driving_license, bike, aadhaar, pan,
          photo, resume, education_list,
          experience_letters, relieving_letter, salary_slips,
          bank_account, bank_name, ifsc, tax_details
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `;

            // values must align with the order of columns above
            const params = [
                data.full_name,
                data.dob,
                data.gender,
                data.mobile,
                data.email,
                data.current_address,
                data.permanent_address,
                data.emergency_contact,
                data.driving_license,
                data.bike,
                data.aadhaar,
                data.pan,
                data.photo,
                data.resume,
                data.education_list,
                data.experience_letters,
                data.relieving_letter,
                data.salary_slips,
                data.bank_account,
                data.bank_name,
                data.ifsc,
                data.tax_details
            ];

            const [result] = await pool.execute(sql, params);

            // send a json response back to the frontend
            return res.json({
                success: true,
                id: result.insertId,
                message: 'Employee data saved successfully'
            });
        } catch (err) {
            console.error('Error saving employee:', err);
            res
                .status(500)
                .json({ success: false, message: 'Server / DB error', error: err.message });
        }
    }
);

// return all saved employee records for review
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM employees ORDER BY created_at DESC'
        );
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Error fetching employees:', err);
        res
            .status(500)
            .json({ success: false, message: 'Server / DB error', error: err.message });
    }
});

// export all employee records as a CSV file open in Excel
app.get('/api/employees/export', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM employees ORDER BY created_at DESC'
        );

        // define CSV column order
        const headers = [
            'id',
            'full_name',
            'dob',
            'gender',
            'mobile',
            'email',
            'current_address',
            'permanent_address',
            'emergency_contact',
            'driving_license',
            'bike',
            'aadhaar',
            'pan',
            'photo',
            'resume',
            'education_list',
            'experience_letters',
            'relieving_letter',
            'salary_slips',
            'bank_account',
            'bank_name',
            'ifsc',
            'tax_details',
            'created_at'
        ];

        // escape commas, quotes, and newlines so CSV stays valid
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // build the CSV string: header row + one row per employee
        let csv = headers.join(',') + '\n';
        for (const row of rows) {
            const line = headers.map((h) => escapeCSV(row[h])).join(',');
            csv += line + '\n';
        }

        // tell the browser to download the response as a CSV file
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="prejoining_employees.csv"'
        );
        res.send(csv);
    } catch (err) {
        console.error('Error exporting CSV:', err);
        res.status(500).send('Server / DB error');
    }
});

// start the HTTP server and immediately test the DB connection
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open http://localhost:4000/form.html in your browser.');
    testDbConnection();
});