const express = require('express');

const app = express();
const PORT = 3000;

// Middleware to log incoming requests and responses
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> Status: ${res.statusCode}`);
  });
  next();
});

// Route 1: GET / (Welcome text)
app.get('/', (req, res) => {
  res.status(200).send('Welcome to the Express Lab 1 Web Server!');
});

// Route 2: GET /about (JSON with name and section)
app.get('/about', (req, res) => {
  res.status(200).json({
    name: 'Nambala Eshwaar',
    registrationNumber: '252U1R9106',
    section: 'CSE GEN-AI(2B)'
  });
});

// Route 3: GET /time (Current date and time using new Date())
app.get('/time', (req, res) => {
  res.status(200).send(`Current Date and Time: ${new Date().toString()}`);
});

// 404 handler for any unknown path
app.use((req, res) => {
  res.status(404).send('404 Not Found: The requested route does not exist.');
});

// Listen on port 3000
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
