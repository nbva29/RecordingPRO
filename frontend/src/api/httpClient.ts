import axios from 'axios';

export class ApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const httpClient = axios.create({ baseURL: '/api', timeout: 15000 });
httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const message = status === 404
      ? 'Запрошенные данные не найдены.'
      : status === 422
        ? 'Проверьте параметры запроса: слишком длинное или некорректное значение.'
        : status
          ? 'Не удалось загрузить данные. Повторите попытку позже.'
          : 'Не удалось подключиться к API. Проверьте соединение и доступность сервера.';
    return Promise.reject(new ApiError(message, status));
  },
);
