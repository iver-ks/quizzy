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

export function startQuizSession(quizId, token) {
  return request(`${API_URL}/quizzes/${quizId}/start-session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getSessionById(sessionId, token) {
  return request(`${API_URL}/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function joinSessionByCode(roomCode, token) {
  return request(`${API_URL}/sessions/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ room_code: roomCode }),
  });
}

export function joinSessionById(sessionId, token) {
  return request(`${API_URL}/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getParticipantSession(sessionId, token) {
  return request(`${API_URL}/sessions/${sessionId}/participant`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function leaveSession(sessionId, token, keepalive = false) {
  return request(`${API_URL}/sessions/${sessionId}/leave`, {
    method: 'DELETE',
    keepalive,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function cancelSession(sessionId, token, keepalive = false) {
  return request(`${API_URL}/sessions/${sessionId}/cancel`, {
    method: 'DELETE',
    keepalive,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
