const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;
const secret = 'YOUR_SECRET_KEY'; 
const ADMIN_TOKEN = "ADMIN_TOKEN";

app.use(bodyParser.json());

let users = [
  {
    username: 'sampleUser',
    password: 'samplePass', // В реальной ситуации пароли должны быть захешированы!
    email: 'sample@example.com', // Новое поле, необязательное
    firstName: 'Sample', // Новое поле, необязательное
    lastName: 'User', // Новое поле, необязательное
  }
];

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  if (!token) return res.status(401).json({ error: 'Token not provided' });

  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token not valid' });

    // Теперь проверяем, есть ли у пользователя специальные права
    if (user.specialAccess) {
      req.specialAccess = user.specialAccess;
    }
    req.user = user;
    next();
  });
}


function requireAdminToken(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token === ADMIN_TOKEN) {
    next();
  } else {
    res.status(403).json({ error: 'Requires admin token' });
  }
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IT Switcher API',
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
        AdminToken: { 
          type: 'apikey',
          in: 'header',
          name: 'x-admin-token', // Имя заголовка, который будет использоваться для передачи токена
          description: 'Admin token required for this operation'
        },
        BearerAuth: { 
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: "Enter 'Bearer' [space] and then your token in the text input below."
        },
      },
    },
    security: [
      {
        AdminToken: [], 
        BearerAuth: []  
      }
    ],
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
 *            properties:
 *              username:
 *                type: string
 *                required: true
 *              password:
 *                type: string
 *                required: true
 *              email:
 *                type: string
 *                format: email
 *              firstName:
 *                type: string
 *              lastName:
 *                type: string
 *    responses:
 *      '201':
 *        description: User registered successfully
 *      '400':
 *        description: Bad request if username or password is missing
 */
 app.post('/register', (req, res) => {
  const { username, password, email, firstName, lastName } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Проверка на существование пользователя
  if (users.some(u => u.username === username)) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  // Добавление нового пользователя
  users.push({ username, password, email, firstName, lastName }); // Хэширование пароля в реальном приложении
  res.status(201).json({ message: 'User registered successfully' });
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
 * @openapi
 * /users:
 *   get:
 *     summary: Get a list of the users 
 *     security:
 *       - AdminToken: []
 *     tags:
 *       - Users
 *     responses:
 *       200: 
 *        description: A list of users
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                $ref: '#/components/schemas/User'
 *      '403':
 *        description: Forbidden - Requires special access rights
 *
 * components:
 *  schemas:
 *    User:
 *      type: object
 *      properties:
 *        username:
 *          type: string
 *        email:
 *          type: string
 *          format: email
 *        firstName:
 *          type: string
 *        lastName:
 *          type: string
 */
 app.get('/users', authenticateToken, requireAdminToken, (req, res) => {
  const publicUsers = users.map(({ password, ...user }) => user); // Исключаем пароль из вывода
  res.json(publicUsers);
});

/**
 * @swagger
 * /users/{username}:
 *  get:
 *    summary: Get a single user by username
 *    security:
 *      - AdminToken: []
 *    tags:
 *      - Users
 *    parameters:
 *      - in: path
 *        name: username
 *        required: true
 *        schema:
 *          type: string
 *        description: The username to get information for
 *    responses:
 *      '200':
 *        description: User data retrieved successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/User'
 *      '403':
 *        description: Forbidden - Requires special access rights
 *      '404':
 *        description: User not found
 */
 app.get('/users/:username', authenticateToken, requireAdminToken, (req, res) => {
  const user = users.find(u => u.username === req.params.username);
  if (user) {
    res.json({ username: user.username });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});


/**
 * @swagger
 * /users/me:
 *  get:
 *    summary: Get the current user's data
 *    security:
 *       - BearerAuth: []
 *    tags:
 *      - Users
 *    responses:
 *      '200':
 *        description: User data retrieved successfully
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/User'
 *      '404':
 *        description: User not found
 */
// Эндпоинт для получения данных залогиненного пользователя
app.get('/users/me', authenticateToken, (req, res) => {
  // Пользователь может получить только свои данные
  const user = users.find(u => u.username === req.user.username);
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

/**
 * @swagger
 * /users/{username}/password:
 *  put:
 *    summary: Update user's password
 *    tags:
 *      - Users
 *    security:
 *      - BearerAuth: []
 *    parameters:
 *      - in: path
 *        name: username
 *        schema:
 *          type: string
 *        required: true
 *        description: Username of the user to update
 *    requestBody:
 *      description: New password
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              newPassword:
 *                type: string
 *    responses:
 *      '200':
 *        description: Password updated successfully
 *      '400':
 *        description: New password not provided
 *      '404':
 *        description: User not found
 */
 app.put('/users/:username/password', authenticateToken, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: 'New password required' });
  }
  const userIndex = users.findIndex(u => u.username === req.params.username);
  if (userIndex !== -1) {
    users[userIndex].password = newPassword; // In a real-world scenario, hash and salt the password before storing
    res.json({ message: 'Password updated successfully' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

/**
 * @swagger
 * /users/{username}:
 *  delete:
 *    summary: Delete a user by username
 *    tags:
 *      - Users
 *    security:
 *      - BearerAuth: []
 *    parameters:
 *      - in: path
 *        name: username
 *        schema:
 *          type: string
 *        required: true
 *        description: Username of the user to delete
 *    responses:
 *      '200':
 *        description: User deleted successfully
 *      '404':
 *        description: User not found
 */
 app.delete('/users/:username', authenticateToken, (req, res) => {
  const userIndex = users.findIndex(u => u.username === req.params.username);
  if (userIndex !== -1) {
    users.splice(userIndex, 1);
    res.json({ message: 'User deleted successfully' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});


app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
