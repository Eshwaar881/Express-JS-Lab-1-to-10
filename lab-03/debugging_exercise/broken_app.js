/**
 * BROKEN VERSION (As handed out by Faculty for Debugging Exercise)
 * 
 * This file contains 4 intentional bugs that students must identify and fix:
 * 1. Port conflict / hardcoded static port (EADDRINUSE)
 * 2. Wrong import path for SQLite library (Cannot find module)
 * 3. Table-name typo in SQL query (SQLITE_ERROR: no such table: books)
 * 4. Missing await on asynchronous database query (Unresolved Promise serialized as {})
 */

const express = require('express');
const path = require('path');

// ❌ BUG #2: Wrong import path!
// Faculty handed out './sqlite' (relative path looking for a local file)
// instead of the installed package 'sqlite' from node_modules.
const { open } = require('./sqlite'); 
const sqlite3 = require('sqlite3');

const app = express();

// ❌ BUG #1: Port conflict / inflexible hardcoded port
// Hardcoding 3000 without process.env.PORT prevents running multiple instances
// or dynamic ports, easily triggering Error: listen EADDRINUSE: address already in use :::3000
const PORT = 3000; 

const dbPath = path.join(__dirname, '..', 'books.db');
let db = null;

app.use(express.json());

// GET /books endpoint
app.get('/books', async (req, res) => {
  try {
    // ❌ BUG #3: Table-name typo!
    // The database table created in init_db.sql is 'book' (singular),
    // but the query asks for 'books' (plural) -> SQLITE_ERROR: no such table: books.
    const query = 'SELECT * FROM books;';

    // ❌ BUG #4: Missing await!
    // db.all() is asynchronous and returns a Promise. Without `await`,
    // `books` is Promise { <pending> }. Express res.json() serializes
    // an empty object '{}' instead of the array of books!
    const books = db.all(query); 

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
    app.listen(PORT, () => {
      console.log(`Broken server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(`Startup Error: ${err.message}`);
  }
};

startServer();

