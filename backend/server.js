const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt'); // For password hashing
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'credentials'
});

// Connect to the database
db.connect((err) => {
    if (err) throw err;
    console.log('Connected to the react_app database!');
});

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Signup Route
app.post('/signup', (req, res) => {
    const { name, email, password } = req.body;

    // Simple validation
    if (!name || !email || !password) {
        return res.status(400).json('All fields are required.');
    }

    // SQL Insert Query
    const sqlInsert = "INSERT INTO login (name, email, password) VALUES (?, ?, ?)";
    db.query(sqlInsert, [name, email, password], (err, result) => {
        if (err) {
            console.error("Error inserting data into database:", err);
            return res.status(500).json('Error during signup.');
        }
        return res.status(201).json('User created successfully.');
    });
});

// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Simple validation
    if (!email || !password) {
        return res.status(400).json('All fields are required.');
    }

    // SQL Select Query
    const sqlSelect = "SELECT * FROM login WHERE email = ? AND password = ?";
    db.query(sqlSelect, [email, password], (err, results) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json('Error during login.');
        }
        if (results.length > 0) {
            return res.status(200).json('Success');
        } else {
            return res.status(401).json('Invalid email or password.');
        }
    });
});


// Upload Route
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json('No file uploaded.');
        }

        let textContent = '';

        // Check for PDF file type
        if (file.mimetype === 'application/pdf') {
            const pdfData = await pdf(file.buffer);
            textContent = pdfData.text;
        } else {
            // For other file types, handle as needed
            textContent = file.buffer.toString('utf-8'); // Assuming it's a text or document file
        }

        // Extract links
        const links = extractLinks(textContent);

        // Get summary from Groq's LLaMA model (you need to implement this endpoint)
        const summary = await getSummaryFromGroq(textContent);

        res.json({ summary, links });
    } catch (err) {
        console.error('Error during file upload:', err);
        res.status(500).json('Error during file upload.');
    }
});

// Function to extract links
function extractLinks(text) {
    const dom = new JSDOM(text);
    const links = [...dom.window.document.querySelectorAll('a')].map(anchor => anchor.href);
    return links;
}

// Function to get summary from Groq's LLaMA model
async function getSummaryFromGroq(text) {
    try {
        const response = await axios.post('http://your-groq-api-url', { text });
        return response.data.summary; // Adjust according to your Groq API response structure
    } catch (error) {
        console.error('Error fetching summary from Groq:', error);
        throw error;
    }
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
