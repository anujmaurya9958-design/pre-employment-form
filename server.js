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