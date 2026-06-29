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

export function getProfile(token) {
  return request(`${API_URL}/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
