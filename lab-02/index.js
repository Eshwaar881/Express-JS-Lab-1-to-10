const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'books.db');

let db = null;

// Built-in middleware to parse JSON bodies
app.use(express.json());

// Enable CORS for Postman Web and external API clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logger middleware to track incoming requests and responses
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode}`);
  });
  next();
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Book Management API! Use /books/ to explore endpoints.');
});

// Route 1: GET /books/ - Retrieve all books
app.get(['/books', '/books/'], async (req, res) => {
  try {
    const getBooksQuery = `
      SELECT
        *
      FROM
        book
      ORDER BY
        id;
    `;
    const booksArray = await db.all(getBooksQuery);
    res.status(200).send(booksArray);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Route 2: GET /books/:bookId/ - Retrieve a specific book by ID
app.get(['/books/:bookId', '/books/:bookId/'], async (req, res) => {
  try {
    const { bookId } = req.params;
    const getBookQuery = `
      SELECT
        *
      FROM
        book
      WHERE
        id = ?;
    `;
    const book = await db.get(getBookQuery, [bookId]);
    if (!book) {
      return res.status(404).send({ error: 'Book not found' });
    }
    res.status(200).send(book);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Route 3: POST /books/ - Add a new book
app.post(['/books', '/books/'], async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;
    if (!title || !author) {
      return res.status(400).send({ error: 'Title and author are required fields.' });
    }
    const addBookQuery = `
      INSERT INTO
        book (title, author, price, pages)
      VALUES
        (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(addBookQuery, [title, author, price, pages]);
    const bookId = dbResponse.lastID;
    res.status(201).send({
      message: 'Book Added Successfully',
      bookId: bookId,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Route 4: PUT /books/:bookId/ - Update an existing book by ID
app.put(['/books/:bookId', '/books/:bookId/'], async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, author, price, pages } = req.body;
    const updateBookQuery = `
      UPDATE
        book
      SET
        title = ?,
        author = ?,
        price = ?,
        pages = ?
      WHERE
        id = ?;
    `;
    const result = await db.run(updateBookQuery, [title, author, price, pages, bookId]);
    if (result.changes === 0) {
      return res.status(404).send({ error: 'Book not found' });
    }
    res.status(200).send('Book Updated Successfully');
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Route 5: DELETE /books/:bookId/ - Delete a book by ID
app.delete(['/books/:bookId', '/books/:bookId/'], async (req, res) => {
  try {
    const { bookId } = req.params;
    const deleteBookQuery = `
      DELETE FROM
        book
      WHERE
        id = ?;
    `;
    const result = await db.run(deleteBookQuery, [bookId]);
    if (result.changes === 0) {
      return res.status(404).send({ error: 'Book not found' });
    }
    res.status(200).send('Book Deleted Successfully');
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).send({ error: '404 Not Found: The requested route does not exist.' });
});

// Task 3: initializeDBAndServer() async function
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

module.exports = app;

