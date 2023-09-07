const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;
const secret = 'YOUR_SECRET_KEY'; // Ideally, use a more secure key and store it in a secure manner

app.use(bodyParser.json());

let users = [
  {
    username: 'sampleUser',
    password: 'samplePass', // Remember, in a real-world scenario, you'd never store passwords in plaintext!
  },
];

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Token not provided' });

  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token not valid' });
    req.user = user;
    next();
  });
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management API',
      version: '1.0.0',
      description: 'A simple Express API for user management',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: "Enter 'Bearer' [space] and then your token in the text input below.",
        },
      },
    },
  },
  apis: ['server.js'],
};


const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /register:
 *  post:
 *    summary: Register a new user
 *    tags:
 *      - Users
 *    requestBody:
 *      description: User credentials
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - username
 *              - password
 *            properties:
 *              username:
 *                type: string
 *              password:
 *                type: string
 *    responses:
 *      '200':
 *        description: Successfully registered
 */
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  users.push({ username, password }); // In a real-world scenario, hash and salt the password before storing
  res.status(200).json({ message: 'User registered successfully' });
});

/**
 * @swagger
 * /login:
 *  post:
 *    summary: Login with username and password
 *    tags:
 *      - Users
 *    requestBody:
 *      description: User credentials
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - username
 *              - password
 *            properties:
 *              username:
 *                type: string
 *              password:
 *                type: string
 *    responses:
 *      '200':
 *        description: Login successful
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                token:
 *                  type: string
 *      '401':
 *        description: Invalid credentials
 */
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    const token = jwt.sign({ username: user.username }, secret);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

/**
 * @swagger
 * /users:
 *  get:
 *    summary: Get list of users
 *    tags:
 *      - Users
 *    security:
 *      - BearerAuth: []
 *    responses:
 *      '200':
 *        description: Success
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  username:
 *                    type: string
 *      '401':
 *        description: Not authenticated
 */

app.get('/users', authenticateToken, (req, res) => {
  res.json(users.map((user) => ({ username: user.username })));
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
