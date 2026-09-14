export function notificationPagination(params) {
  const limit = Number(params.get('limit') ?? 20);
  const page = Number(params.get('page') ?? 1);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(page) || page < 1 || page > 100000) return null;
  return { limit, page };
}

export function notificationReadCommand(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (body.markAll === true) return body.id === undefined ? { all: true } : null;
  if (body.markAll !== undefined && body.markAll !== false) return null;
  if (typeof body.id !== 'number' && typeof body.id !== 'string') return null;
  const id = Number(body.id);
  return Number.isSafeInteger(id) && id > 0 ? { all: false, id } : null;
}
