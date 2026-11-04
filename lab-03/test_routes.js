const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Starting Express Lab 3 Automated REST API Tests');
  console.log('====================================================\n');

  // 1. GET /books with defaults
  console.log('--- Test 1: GET /books (Default params) ---');
  const res1 = await makeRequest({ hostname: '127.0.0.1', port: 3000, path: '/books', method: 'GET' });
  assert(res1.statusCode === 200, 'Status code is 200');
  assert(Array.isArray(res1.data), 'Response is an array');
  assert(res1.data.length <= 10, 'Default limit of 10 respected');
  console.log(`Retrieved ${res1.data.length} books. First item: ID ${res1.data[0]?.id} "${res1.data[0]?.title}"\n`);

  // 2. GET /books?search_q=Gatsby (Partial Title Match with LIKE)
  console.log('--- Test 2: GET /books?search_q=Gatsby (Partial LIKE Search) ---');
  const res2 = await makeRequest({ hostname: '127.0.0.1', port: 3000, path: '/books?search_q=Gatsby', method: 'GET' });
  assert(res2.statusCode === 200, 'Status code is 200');
  assert(res2.data.length === 1, 'Found exactly 1 book');
  assert(res2.data[0].title.includes('Gatsby'), 'Title contains "Gatsby"');
  console.log(`Found: "${res2.data[0].title}" by ${res2.data[0].author}\n`);

  // 3. GET /books?order_by=price&order=DESC (Sorting)
  console.log('--- Test 3: GET /books?order_by=price&order=DESC (Sorting) ---');
  const res3 = await makeRequest({ hostname: '127.0.0.1', port: 3000, path: '/books?order_by=price&order=DESC&limit=3', method: 'GET' });
  assert(res3.statusCode === 200, 'Status code is 200');
  assert(res3.data[0].price >= res3.data[1].price, 'Order is descending by price');
  console.log(`Top priced book: "${res3.data[0].title}" at $${res3.data[0].price}\n`);

  // 4. GET /books?min_price=250&max_price=350 (Price Range Filter with BETWEEN)
  console.log('--- Test 4: GET /books?min_price=250&max_price=350 (Price Range) ---');
  const res4 = await makeRequest({ hostname: '127.0.0.1', port: 3000, path: '/books?min_price=250&max_price=350', method: 'GET' });
  assert(res4.statusCode === 200, 'Status code is 200');
  res4.data.forEach((b) => {
    assert(b.price >= 250 && b.price <= 350, `Book "${b.title}" price $${b.price} is within [250, 350]`);
  });
  console.log(`Retrieved ${res4.data.length} books within price range $250 - $350\n`);

  // 5. GET /books?limit=2&offset=2 (Pagination)
  console.log('--- Test 5: GET /books?limit=2&offset=2 (Pagination) ---');
  const res5 = await makeRequest({ hostname: '127.0.0.1', port: 3000, path: '/books?limit=2&offset=2', method: 'GET' });
  assert(res5.statusCode === 200, 'Status code is 200');
  assert(res5.data.length === 2, 'Page size is 2');
  console.log(`Page 2 books: ${res5.data.map(b => b.title).join(', ')}\n`);

  // 6. Validation POST /books - Missing title (400)
  console.log('--- Test 6: POST /books with missing title (Validation Error 400) ---');
  const res6 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: '/books', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { author: 'Unknown Author', price: 199 }
  );
  assert(res6.statusCode === 400, 'Status code is 400');
  assert(res6.data.message.includes('title'), 'Consistent error message mentions title');
  console.log('Received expected 400 response:', res6.data, '\n');

  // 7. Validation POST /books - Non-numeric price (400)
  console.log('--- Test 7: POST /books with non-numeric price (Validation Error 400) ---');
  const res7 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: '/books', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { title: 'Test Book', author: 'Test Author', price: 'Free' }
  );
  assert(res7.statusCode === 400, 'Status code is 400');
  assert(res7.data.message.includes('price'), 'Consistent error message mentions price');
  console.log('Received expected 400 response:', res7.data, '\n');

  // 8. Successful POST /books (201 Created)
  console.log('--- Test 8: POST /books valid creation (201 Created) ---');
  const res8 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: '/books', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { title: 'Clean Code', author: 'Robert C. Martin', price: 450, pages: 464 }
  );
  assert(res8.statusCode === 201, 'Status code is 201');
  assert(res8.data.bookId !== undefined, 'Generated bookId returned');
  const createdBookId = res8.data.bookId;
  console.log(`Created new book with ID ${createdBookId}:`, res8.data, '\n');

  // 9. Successful PUT /books/:bookId (200 OK)
  console.log(`--- Test 9: PUT /books/${createdBookId} (200 OK) ---`);
  const res9 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: `/books/${createdBookId}`, method: 'PUT', headers: { 'Content-Type': 'application/json' } },
    { title: 'Clean Code (2nd Edition)', author: 'Robert C. Martin', price: 499, pages: 480 }
  );
  assert(res9.statusCode === 200, 'Status code is 200');
  assert(res9.data.message === 'Book updated successfully', 'Consistent success message');
  console.log('Updated successfully:', res9.data, '\n');

  // 10. PUT /books/:bookId with non-existent ID (404 Not Found)
  console.log('--- Test 10: PUT /books/99999 non-existent ID (404 Not Found) ---');
  const res10 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: '/books/99999', method: 'PUT', headers: { 'Content-Type': 'application/json' } },
    { title: 'Ghost Book', author: 'Nobody', price: 100, pages: 100 }
  );
  assert(res10.statusCode === 404, 'Status code is 404');
  assert(res10.data.message === 'Book not found', 'Consistent not found message');
  console.log('Received expected 404 response:', res10.data, '\n');

  // 11. Successful DELETE /books/:bookId (200 OK)
  console.log(`--- Test 11: DELETE /books/${createdBookId} (200 OK) ---`);
  const res11 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: `/books/${createdBookId}`, method: 'DELETE' }
  );
  assert(res11.statusCode === 200, 'Status code is 200');
  assert(res11.data.message === 'Book deleted successfully', 'Consistent delete message');
  console.log('Deleted successfully:', res11.data, '\n');

  // 12. DELETE /books/:bookId with non-existent ID (404 Not Found)
  console.log('--- Test 12: DELETE /books/99999 non-existent ID (404 Not Found) ---');
  const res12 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: '/books/99999', method: 'DELETE' }
  );
  assert(res12.statusCode === 404, 'Status code is 404');
  assert(res12.data.message === 'Book not found', 'Consistent not found message');
  console.log('Received expected 404 response:', res12.data, '\n');

  // 13. GET /books/:bookId non-existent ID (404 Not Found)
  console.log(`--- Test 13: GET /books/${createdBookId} verify deleted (404 Not Found) ---`);
  const res13 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: `/books/${createdBookId}`, method: 'GET' }
  );
  assert(res13.statusCode === 404, 'Status code is 404');
  assert(res13.data.message === 'Book not found', 'Consistent not found message');
  console.log('Received expected 404 response:', res13.data, '\n');

  // 14. Unknown Route Fallback (404 Not Found)
  console.log('--- Test 14: GET /unknown-endpoint (404 Not Found) ---');
  const res14 = await makeRequest(
    { hostname: '127.0.0.1', port: 3000, path: '/invalid-path', method: 'GET' }
  );
  assert(res14.statusCode === 404, 'Status code is 404');
  assert(res14.data.message === 'Route not found', 'Consistent route not found message');
  console.log('Received expected 404 response:', res14.data, '\n');

  console.log('====================================================');
  console.log('🎉 ALL 14 REST API TEST CASES PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

module.exports = { runTests };

if (require.main === module) {
  // If run directly with node test_routes.js after starting index.js
  runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
} else {
  // If required alongside index.js: node -e "require('./index.js'); require('./test_routes.js');"
  setTimeout(async () => {
    try {
      await runTests();
    } catch (err) {
      console.error('Test failed:', err);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  }, 1500);
}
