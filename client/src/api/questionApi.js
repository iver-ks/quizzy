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

export function getQuizQuestions(quizId, token) {
  return request(`${API_URL}/quizzes/${quizId}/questions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function createQuestion(quizId, payload, token) {
  return request(`${API_URL}/quizzes/${quizId}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function updateQuestion(questionId, payload, token) {
  return request(`${API_URL}/questions/${questionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function deleteQuestion(questionId, token) {
  return request(`${API_URL}/questions/${questionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function uploadQuestionImage(file, token) {
  const formData = new FormData();
  formData.append('image', file);

  return request(`${API_URL}/uploads/question-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
}
