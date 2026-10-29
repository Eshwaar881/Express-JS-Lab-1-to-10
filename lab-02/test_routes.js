const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Route Tests ---');

  // Test 1: GET /books/
  console.log('\n[1] Testing GET /books/');
  const res1 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books/',
    method: 'GET',
  });
  console.log(`Status: ${res1.statusCode}`);
  const allBooks = JSON.parse(res1.body);
  console.log(`Retrieved ${allBooks.length} books. First book:`, allBooks[0]);

  // Test 2: GET /books/:bookId/ (ID = 2)
  console.log('\n[2] Testing GET /books/2/');
  const res2 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/books/2/',
    method: 'GET',
  });
  console.log(`Status: ${res2.statusCode}`);
  console.log('Book 2:', JSON.parse(res2.body));

  // Test 3: POST /books/
  console.log('\n[3] Testing POST /books/');
  const newBook = JSON.stringify({
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    price: 350,
    pages: 208,
  });
  const res3 = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/books/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(newBook),
      },
    },
    newBook
  );
  console.log(`Status: ${res3.statusCode}`);
  console.log('Response:', res3.body);
  const createdBookId = JSON.parse(res3.body).bookId;

  // Test 4: PUT /books/:bookId/
  console.log(`\n[4] Testing PUT /books/${createdBookId}/`);
  const updatedBook = JSON.stringify({
    title: 'The Alchemist (Special Edition)',
    author: 'Paulo Coelho',
    price: 499,
    pages: 220,
  });
  const res4 = await makeRequest(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/books/${createdBookId}/`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updatedBook),
      },
    },
    updatedBook
  );
  console.log(`Status: ${res4.statusCode}`);
  console.log('Response:', res4.body);

  // Verify updated book with GET
  const verifyUpdated = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdBookId}/`,
    method: 'GET',
  });
  console.log('Verified updated book:', JSON.parse(verifyUpdated.body));

  // Test 5: DELETE /books/:bookId/
  console.log(`\n[5] Testing DELETE /books/${createdBookId}/`);
  const res5 = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdBookId}/`,
    method: 'DELETE',
  });
  console.log(`Status: ${res5.statusCode}`);
  console.log('Response:', res5.body);

  // Verify deletion
  const verifyDeleted = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/books/${createdBookId}/`,
    method: 'GET',
  });
  console.log(`Status after delete (should be 404): ${verifyDeleted.statusCode}`);

  console.log('\n--- All Route Tests Completed Successfully! ---');
}

// Wait 1.5 seconds for server to start, then run tests
setTimeout(async () => {
  try {
    await runTests();
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit(0);
  }
}, 1500);

