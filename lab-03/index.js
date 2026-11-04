const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'books.db');

let db = null;

// Built-in middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS for Postman Web, frontend apps, and external API clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request Logger middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
  });
  next();
});

// Root Route: API Overview
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Books REST API (Lab 3)',
    documentation: {
      endpoints: {
        'GET /books': 'Search, filter by price, sort, and paginate books',
        'GET /books/:bookId': 'Retrieve a specific book by ID',
        'POST /books': 'Create a new book record (validation enforced)',
        'PUT /books/:bookId': 'Update an existing book record',
        'DELETE /books/:bookId': 'Delete a book record by ID'
      },
      queryParamsForGetBooks: {
        search_q: 'Partial title search string (default: "")',
        order_by: 'Sort column: id, title, author, price, pages (default: id)',
        order: 'Sort direction: ASC or DESC (default: ASC)',
        limit: 'Number of records per page (default: 10)',
        offset: 'Number of records to skip (default: 0)',
        min_price: 'Minimum price filter',
        max_price: 'Maximum price filter'
      }
    }
  });
});

// Helper: Validate request body for POST and PUT
const validateBookBody = (body) => {
  const { title, author, price } = body;

  if (title === undefined || typeof title !== 'string' || title.trim() === '') {
    return { isValid: false, message: "Invalid input: 'title' is required and must be a non-empty string." };
  }

  if (author === undefined || typeof author !== 'string' || author.trim() === '') {
    return { isValid: false, message: "Invalid input: 'author' is required and must be a non-empty string." };
  }

  if (price === undefined || price === null || typeof price === 'boolean' || isNaN(Number(price)) || Number(price) < 0) {
    return { isValid: false, message: "Invalid input: 'price' is required and must be a valid non-negative number." };
  }

  return { isValid: true };
};

// Route 1: GET /books - List books with search_q, price range, sorting, and pagination
app.get(['/books', '/books/'], async (req, res) => {
  try {
    const {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit = 10,
      offset = 0,
      min_price,
      max_price
    } = req.query;

    // Validate query parameters
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({ message: "Invalid query parameter: 'limit' must be a positive integer." });
    }

    const parsedOffset = parseInt(offset, 10);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({ message: "Invalid query parameter: 'offset' must be a non-negative integer." });
    }

    if (min_price !== undefined && (isNaN(Number(min_price)) || Number(min_price) < 0)) {
      return res.status(400).json({ message: "Invalid query parameter: 'min_price' must be a non-negative number." });
    }

    if (max_price !== undefined && (isNaN(Number(max_price)) || Number(max_price) < 0)) {
      return res.status(400).json({ message: "Invalid query parameter: 'max_price' must be a non-negative number." });
    }

    // Dynamic SQL Query Construction with Parametric Placeholders
    const conditions = [];
    const queryParams = [];

    // 1. Partial title match (LIKE)
    if (typeof search_q === 'string' && search_q.trim() !== '') {
      conditions.push('title LIKE ?');
      queryParams.push(`%${search_q.trim()}%`);
    }

    // 2. Price range filtering using BETWEEN or comparison operators
    if (min_price !== undefined && max_price !== undefined) {
      conditions.push('price BETWEEN ? AND ?');
      queryParams.push(Number(min_price), Number(max_price));
    } else if (min_price !== undefined) {
      conditions.push('price >= ?');
      queryParams.push(Number(min_price));
    } else if (max_price !== undefined) {
      conditions.push('price <= ?');
      queryParams.push(Number(max_price));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Whitelist order_by columns and sort directions to prevent SQL Injection
    const allowedColumns = ['id', 'title', 'author', 'price', 'pages'];
    const safeOrderBy = allowedColumns.includes(String(order_by).toLowerCase())
      ? String(order_by).toLowerCase()
      : 'id';

    const safeOrder = String(order).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const getBooksQuery = `
      SELECT
        *
      FROM
        book
      ${whereClause}
      ORDER BY
        ${safeOrderBy} ${safeOrder}
      LIMIT ? OFFSET ?;
    `;

    queryParams.push(parsedLimit, parsedOffset);

    const books = await db.all(getBooksQuery, queryParams);
    return res.status(200).json(books);
  } catch (error) {
    return res.status(500).json({ message: `Database error: ${error.message}` });
  }
});

// Route 2: GET /books/:bookId - Retrieve a single book by ID
app.get(['/books/:bookId', '/books/:bookId/'], async (req, res) => {
  try {
    const { bookId } = req.params;

    if (isNaN(Number(bookId))) {
      return res.status(400).json({ message: "Invalid book ID: must be an integer." });
    }

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
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json(book);
  } catch (error) {
    return res.status(500).json({ message: `Database error: ${error.message}` });
  }
});

// Route 3: POST /books - Create a new book
app.post(['/books', '/books/'], async (req, res) => {
  try {
    // Validate request body
    const validation = validateBookBody(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    const { title, author, price, pages = null } = req.body;

    const addBookQuery = `
      INSERT INTO
        book (title, author, price, pages)
      VALUES
        (?, ?, ?, ?);
    `;

    const dbResponse = await db.run(addBookQuery, [
      title.trim(),
      author.trim(),
      Number(price),
      pages !== null && !isNaN(Number(pages)) ? Number(pages) : null
    ]);

    return res.status(201).json({
      message: 'Book created successfully',
      bookId: dbResponse.lastID
    });
  } catch (error) {
    return res.status(500).json({ message: `Database error: ${error.message}` });
  }
});

// Route 4: PUT /books/:bookId - Update an existing book by ID
app.put(['/books/:bookId', '/books/:bookId/'], async (req, res) => {
  try {
    const { bookId } = req.params;

    if (isNaN(Number(bookId))) {
      return res.status(400).json({ message: "Invalid book ID: must be an integer." });
    }

    // Validate request body
    const validation = validateBookBody(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.message });
    }

    const { title, author, price, pages = null } = req.body;

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

    const dbResponse = await db.run(updateBookQuery, [
      title.trim(),
      author.trim(),
      Number(price),
      pages !== null && !isNaN(Number(pages)) ? Number(pages) : null,
      bookId
    ]);

    if (dbResponse.changes === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json({ message: 'Book updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: `Database error: ${error.message}` });
  }
});

// Route 5: DELETE /books/:bookId - Delete a book by ID
app.delete(['/books/:bookId', '/books/:bookId/'], async (req, res) => {
  try {
    const { bookId } = req.params;

    if (isNaN(Number(bookId))) {
      return res.status(400).json({ message: "Invalid book ID: must be an integer." });
    }

    const deleteBookQuery = `
      DELETE FROM
        book
      WHERE
        id = ?;
    `;

    const dbResponse = await db.run(deleteBookQuery, [bookId]);

    if (dbResponse.changes === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    return res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: `Database error: ${error.message}` });
  }
});

// 404 Fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global internal error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Initialize SQLite Database and start HTTP Server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Only start listening if not running under a test runner that manages server lifecycle
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}/`);
      });
    }
  } catch (error) {
    console.error(`DB Initialization Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

module.exports = app;

