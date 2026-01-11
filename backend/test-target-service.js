/**
 * Dummy target service for testing the API Gateway
 * Run this on port 4000: node test-target-service.js
 */
import express from 'express';

const app = express();
const PORT = 4000;

app.use(express.json());

// Test endpoints
app.get('/users', (req, res) => {
  res.json({
    message: 'GET /users - Success',
    method: 'GET',
    query: req.query,
    headers: req.headers
  });
});

app.post('/users', (req, res) => {
  res.json({
    message: 'POST /users - Success',
    method: 'POST',
    body: req.body,
    query: req.query
  });
});

app.get('/users/:id', (req, res) => {
  res.json({
    message: `GET /users/${req.params.id} - Success`,
    method: 'GET',
    id: req.params.id,
    query: req.query
  });
});

app.get('/products', (req, res) => {
  res.json({
    message: 'GET /products - Success',
    method: 'GET',
    query: req.query
  });
});

app.listen(PORT, () => {
  console.log(`🎯 Target service running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/users`);
  console.log(`  POST http://localhost:${PORT}/users`);
  console.log(`  GET  http://localhost:${PORT}/users/:id`);
  console.log(`  GET  http://localhost:${PORT}/products`);
});