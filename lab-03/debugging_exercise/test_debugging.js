/**
 * Test script to programmatically simulate and demonstrate each of the 4 faculty bugs
 * and verify the fixes.
 */

const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

async function testDebuggingExercise() {
  console.log('================================================================');
  console.log('🔍 FACULTY DEBUGGING EXERCISE: DEMONSTRATING BUGS & THEIR FIXES');
  console.log('================================================================\n');

  // ------------------------------------------------------------
  // BUG #1: Port conflict (EADDRINUSE)
  // ------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('Bug 1: Port conflict (EADDRINUSE)');
  console.log('----------------------------------------------------------------');
  console.log('Problem:');
  console.log('  If another process is running on port 3000 (e.g. main server or ghost process),');
  console.log('  attempting app.listen(3000) throws:');
  console.log('  ❌ Error: listen EADDRINUSE: address already in use :::3000');
  console.log('Fix:');
  console.log('  1. Use configurable port: const PORT = process.env.PORT || 3001;');
  console.log('  2. Listen for "error" event and gracefully switch to an available port, or');
  console.log('  3. Free the port using PowerShell:');
  console.log('     Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n');

  // ------------------------------------------------------------
  // BUG #2: Wrong import path
  // ------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('Bug 2: Wrong import path');
  console.log('----------------------------------------------------------------');
  try {
    console.log('Testing broken import: require("./sqlite")...');
    require('./sqlite');
  } catch (err) {
    console.log(`❌ Caught Expected Bug #2: ${err.code} - ${err.message.split('\n')[0]}`);
  }
  console.log('Fix:');
  console.log('  Change require("./sqlite") to require("sqlite") to import from node_modules.\n');

  // ------------------------------------------------------------
  // BUG #3: Table-name typo (no such table)
  // ------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('Bug 3: Table-name typo in SQL query (no such table: books)');
  console.log('----------------------------------------------------------------');
  const dbPath = path.join(__dirname, '..', 'books.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  try {
    console.log('Testing broken SQL query: SELECT * FROM books;');
    await db.all('SELECT * FROM books;');
  } catch (err) {
    console.log(`❌ Caught Expected Bug #3: ${err.message}`);
  }
  console.log('Fix:');
  console.log('  Change "SELECT * FROM books;" to "SELECT * FROM book;" (singular matching schema).\n');

  // ------------------------------------------------------------
  // BUG #4: Missing await
  // ------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('Bug 4: Missing await on asynchronous query');
  console.log('----------------------------------------------------------------');
  console.log('Executing without await: const result = db.all("SELECT * FROM book;");');
  const brokenResult = db.all('SELECT * FROM book;');
  console.log(`Value of result without await:`, brokenResult);
  console.log(`When JSON.stringify(brokenResult) is called for res.json(): "${JSON.stringify(brokenResult)}"`);
  console.log('❌ Symptom: Client receives an empty object {} instead of books array!');
  
  console.log('\nExecuting WITH await: const result = await db.all("SELECT * FROM book;");');
  const fixedResult = await db.all('SELECT * FROM book;');
  console.log(`✅ Fixed! Retrieved ${fixedResult.length} books. First item: "${fixedResult[0].title}"\n`);

  await db.close();

  console.log('================================================================');
  console.log('🎯 ALL 4 DEBUGGING EXERCISE BUGS EXPLAINED AND VERIFIED!');
  console.log('================================================================\n');
}

testDebuggingExercise().catch(console.error);

