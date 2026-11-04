# Faculty Debugging Exercise: Problem Analysis & Solutions

**Course:** Backend Development Frameworks (BDF) — Express.js  
**Lab:** Lab 3 — Clean REST API & Debugging Practice  
**Student Name:** Nambala Eshwaar  
**Registration Number:** 252U1R9106  
**Class:** CSE GEN-AI (2B)  

---

## Overview

In this exercise, faculty handed out a broken version of the Express + SQLite application (`broken_app.js`) containing 4 common, real-world development bugs. This report documents the symptoms, root causes, and systematic solutions applied to produce the fully working `fixed_app.js`.

---

## Bug 1: Port Conflict (`EADDRINUSE`)

### 1. Symptom / Terminal Error Message
```text
node:events:497
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1904:16)
    at listenInCluster (node:net:1961:12)
    at Server.listen (node:net:2066:7)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1940:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21) {
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '::',
  port: 3000
}
```

### 2. Root Cause
The broken code statically hardcodes `const PORT = 3000;`. If another process (such as a previous test run, an orphaned nodemon instance, or another application) is already bound to port 3000, the operating system kernel rejects the bind request with `EADDRINUSE` (Error: Address Already in Use).

### 3. Solution Applied
1. Allow dynamic port assignment via environment variables with a fallback:
   ```javascript
   const PORT = process.env.PORT || 3001;
   ```
2. Attach an `error` event listener to the HTTP server instance to gracefully fall back to an available dynamic port (`0` instructs the OS to bind to any free ephemeral port):
   ```javascript
   const server = app.listen(PORT, () => {
     console.log(`Server listening on port ${PORT}`);
   });

   server.on('error', (err) => {
     if (err.code === 'EADDRINUSE') {
       console.error(`⚠️ Port ${PORT} busy. Switching to dynamic port...`);
       server.listen(0, () => {
         console.log(`Server bound to port ${server.address().port}`);
       });
     }
   });
   ```
3. To kill any zombie process on Windows:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
   ```

---

## Bug 2: Wrong Import Path (`MODULE_NOT_FOUND`)

### 1. Symptom / Terminal Error Message
```text
node:internal/modules/cjs/loader:1228
  throw err;
  ^

Error: Cannot find module './sqlite'
Require stack:
- C:\Users\HOME\OneDrive\Desktop\BDF\Express Lab3\debugging_exercise\broken_app.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1225:15)
    at Module._load (node:internal/modules/cjs/loader:1051:27)
    at Module.require (node:internal/modules/cjs/loader:1311:19)
    at require (node:internal/modules/helpers:179:18) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    'C:\\Users\\HOME\\OneDrive\\Desktop\\BDF\\Express Lab3\\debugging_exercise\\broken_app.js'
  ]
}
```

### 2. Root Cause
In `broken_app.js`, line 15 used a relative path:
```javascript
const { open } = require('./sqlite'); // ❌ Looks for ./sqlite.js in the local folder
```
Because `sqlite` is an npm package installed in `node_modules`, prefixing it with `./` forces Node.js to search for a local file named `sqlite.js` or `sqlite/index.js` in the current working directory, which does not exist.

### 3. Solution Applied
Remove `./` so Node's CommonJS module resolution checks `node_modules`:
```javascript
// ✅ Correct package import from node_modules
const { open } = require('sqlite');
```

---

## Bug 3: Table-Name Typo (`SQLITE_ERROR: no such table`)

### 1. Symptom / Terminal Error Message
```text
[Database error]: SQLITE_ERROR: no such table: books
--> HTTP Status: 500 Internal Server Error
--> Response: { "message": "Database error: SQLITE_ERROR: no such table: books" }
```

### 2. Root Cause
The database schema initialized via `init_db.sql` creates the table using the singular noun `book`:
```sql
CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price REAL NOT NULL,
  pages INTEGER
);
```
However, the route query in `broken_app.js` queried the plural noun `books`:
```javascript
const query = 'SELECT * FROM books;'; // ❌ Table 'books' does not exist!
```

### 3. Solution Applied
Update the table identifier in the SQL statement to match the SQLite table name:
```javascript
// ✅ Matched with schema defined in init_db.sql
const query = 'SELECT * FROM book;';
```

---

## Bug 4: Missing `await` (`Promise { <pending> }`)

### 1. Symptom / Terminal Error Message
When hitting `GET /books`, the endpoint returns HTTP `200 OK`, but the response body is unexpectedly an empty JSON object `{}`:
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{}
```
Console log in handler:
```javascript
console.log(books); // Prints: Promise { <pending> }
```

### 2. Root Cause
`sqlite`'s `db.all()`, `db.get()`, and `db.run()` methods are asynchronous and return a JavaScript Promise. In `broken_app.js`:
```javascript
const books = db.all(query); // ❌ Missing await!
res.status(200).json(books);
```
Because `await` was omitted:
1. `books` holds an unresolved `Promise` instance rather than the retrieved data array.
2. Express calls `JSON.stringify(books)`. Since native `Promise` instances have zero enumerable own properties, `JSON.stringify(Promise)` evaluates to `"{}"`.
3. If the query encounters a SQL error later, it triggers an unhandled promise rejection outside the `try/catch` block.

### 3. Solution Applied
Add the `await` keyword before `db.all(query)`:
```javascript
// ✅ Await pauses handler execution until SQLite completes I/O and returns rows
const books = await db.all(query);
res.status(200).json(books);
```

---

## Verification Test Summary

Executing the diagnostic verification runner:
```bash
node debugging_exercise/test_debugging.js
```
Output:
```text
================================================================
🔍 FACULTY DEBUGGING EXERCISE: DEMONSTRATING BUGS & THEIR FIXES
================================================================

----------------------------------------------------------------
Bug 1: Port conflict (EADDRINUSE)
----------------------------------------------------------------
Problem:
  If another process is running on port 3000 (e.g. main server or ghost process),
  attempting app.listen(3000) throws:
  ❌ Error: listen EADDRINUSE: address already in use :::3000
Fix:
  1. Use configurable port: const PORT = process.env.PORT || 3001;
  2. Listen for "error" event and gracefully switch to an available port, or
  3. Free the port using PowerShell:
     Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

----------------------------------------------------------------
Bug 2: Wrong import path
----------------------------------------------------------------
Testing broken import: require("./sqlite")...
❌ Caught Expected Bug #2: MODULE_NOT_FOUND - Cannot find module './sqlite'
Fix:
  Change require("./sqlite") to require("sqlite") to import from node_modules.

----------------------------------------------------------------
Bug 3: Table-name typo in SQL query (no such table: books)
----------------------------------------------------------------
Testing broken SQL query: SELECT * FROM books;
❌ Caught Expected Bug #3: SQLITE_ERROR: no such table: books
Fix:
  Change "SELECT * FROM books;" to "SELECT * FROM book;" (singular matching schema).

----------------------------------------------------------------
Bug 4: Missing await on asynchronous query
----------------------------------------------------------------
Executing without await: const result = db.all("SELECT * FROM book;");
Value of result without await: Promise { <pending> }
When JSON.stringify(brokenResult) is called for res.json(): "{}"
❌ Symptom: Client receives an empty object {} instead of books array!

Executing WITH await: const result = await db.all("SELECT * FROM book;");
✅ Fixed! Retrieved 10 books. First item: "The Great Gatsby"

================================================================
🎯 ALL 4 DEBUGGING EXERCISE BUGS EXPLAINED AND VERIFIED!
================================================================
```

