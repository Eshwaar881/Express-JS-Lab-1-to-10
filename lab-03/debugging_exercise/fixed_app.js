/**
 * FIXED VERSION (Solved by Students for Debugging Exercise)
 * 
 * Solutions to the 4 Faculty Bugs:
 * 1. Port conflict fix: Use process.env.PORT || 3001 with graceful EADDRINUSE handling.
 * 2. Wrong import path fix: Import package directly from 'sqlite' instead of './sqlite'.
 * 3. Table-name typo fix: Query the correct table name 'book' (singular).
 * 4. Missing await fix: Add 'await' keyword before db.all(query).
 */

const express = require('express');
const path = require('path');

// ✅ FIX #2: Correct package import from node_modules ('sqlite', not './sqlite')
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();

// ✅ FIX #1: Flexible port assignment via process.env.PORT with fallback
const PORT = process.env.PORT || 3001;

const dbPath = path.join(__dirname, '..', 'books.db');
let db = null;

app.use(express.json());

// GET /books endpoint
app.get('/books', async (req, res) => {
  try {
    // ✅ FIX #3: Corrected table name to 'book' (singular matching schema in init_db.sql)
    const query = 'SELECT * FROM book;';

    // ✅ FIX #4: Added 'await' so the Promise resolves to the actual array of book records
    const books = await db.all(query);

    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const startServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    const server = app.listen(PORT, () => {
      console.log(`✅ Fixed server successfully running at http://localhost:${PORT}/books`);
    });

    // Graceful error handling for port conflicts (EADDRINUSE)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`⚠️ Port ${PORT} is already in use. Retrying on dynamic port...`);
        server.listen(0, () => {
          console.log(`✅ Server bound to available port: ${server.address().port}`);
        });
      } else {
        throw err;
      }
    });
  } catch (err) {
    console.error(`Startup Error: ${err.message}`);
  }
};

startServer();

module.exports = app;

