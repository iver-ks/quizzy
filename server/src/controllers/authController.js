const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

function createToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function buildAuthResponse(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    token: createToken(user),
  };
}

function validateName(name) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) {
    return 'Введите имя';
  }

  if (trimmedName.length < 2) {
    return 'Имя должно содержать минимум 2 символа';
  }

  if (trimmedName.length > 50) {
    return 'Имя должно содержать не более 50 символов';
  }

  return null;
}

function validateEmail(email) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    return 'Введите email';
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return 'Введите корректный email';
  }

  return null;
}

function validatePassword(password) {
  if (!password) {
    return 'Введите пароль';
  }

  if (password.length < 6) {
    return 'Пароль должен содержать минимум 6 символов';
  }

  if (!PASSWORD_REGEX.test(password)) {
    return 'Пароль должен содержать хотя бы одну букву и одну цифру';
  }

  return null;
}

async function register(req, res) {
  const { name, email, password, confirmPassword } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Заполните все поля' });
  }

  const nameError = validateName(name);
  if (nameError) {
    return res.status(400).json({ message: nameError, field: 'name' });
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ message: emailError, field: 'email' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError, field: 'password' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Пароли не совпадают', field: 'confirmPassword' });
  }

  try {
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1 LIMIT 1', [
      normalizedEmail,
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'Пользователь с таким email уже существует',
        field: 'email',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, name, email`,
      [trimmedName, normalizedEmail, passwordHash]
    );

    return res.status(201).json(buildAuthResponse(result.rows[0]));
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при регистрации' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!email) {
    return res.status(400).json({ message: 'Введите email', field: 'email' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Введите пароль', field: 'password' });
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ message: emailError, field: 'email' });
  }

  try {
    const result = await pool.query(
      'SELECT user_id, name, email, password_hash FROM users WHERE email = $1 LIMIT 1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при входе' });
  }
}

async function getCurrentUser(req, res) {
  try {
    const result = await pool.query(
      'SELECT user_id, name, email FROM users WHERE user_id = $1 LIMIT 1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Ошибка сервера при получении пользователя' });
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
};
