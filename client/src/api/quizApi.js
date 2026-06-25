const API_URL = 'http://localhost:5000/api';
const NETWORK_ERROR_MESSAGE = 'Сервер временно недоступен. Попробуйте позже.';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Ошибка запроса');
    error.field = data.field;
    error.status = response.status;
    throw error;
  }

  return data;
}

async function request(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return await parseResponse(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(NETWORK_ERROR_MESSAGE);
    }

    throw error;
  }
}

export function getCategories() {
  return request(`${API_URL}/categories`);
}

export function createQuiz(payload, token) {
  return request(`${API_URL}/quizzes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function getMyQuizzes(token) {
  return request(`${API_URL}/quizzes/my`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getQuizById(quizId, token) {
  return request(`${API_URL}/quizzes/${quizId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
