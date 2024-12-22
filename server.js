const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

app.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT id, role_type FROM users WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) {
            return res.status(500).json({ status: 500, message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ status: 401, message: 'Invalid credentials' });
        }

        const user = results[0];
        const token = jwt.sign({ userId: user.id, roleType: user.role_type }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({
            status: 200,
            message: 'Logged in',
            result: {
                user_id: user.id,
                access_token: token,
                token_type: 'Bearer',
                role_type: user.role_type,
                expires_at: new Date(Date.now() + 3600000).toISOString()
            }
        });
    });
});

app.get('/listing/get', (req, res) => {
    const { id, access_token } = req.query;

    jwt.verify(access_token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ status: 401, message: 'Invalid token' });
        }

        if (decoded.userId != id) {
            return res.status(403).json({ status: 403, message: 'Forbidden' });
        }

        const query = 'SELECT id, name, latitude, longitude, created_at, updated_at FROM listings WHERE user_id = ?';
        db.query(query, [id], (err, results) => {
            if (err) {
                return res.status(500).json({ status: 500, message: 'Database error' });
            }

            const listings = results.map(listing => {
                return {
                    id: listing.id,
                    name: listing.name,
                    distance: '0.0', // Placeholder for distance calculation
                    created_at: listing.created_at,
                    updated_at: listing.updated_at
                };
            });

            res.json({
                status: 200,
                message: 'Success',
                result: {
                    current_page: 1,
                    data: listings
                }
            });
        });
    });
});