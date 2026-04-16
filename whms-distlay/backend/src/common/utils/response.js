function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function created(res, data) {
  return ok(res, data, 201);
}

function noContent(res) {
  return res.status(204).send();
}

function paginated(res, { data, total, page, limit }) {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
}

function fail(res, message, statusCode = 400, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

function unauthorized(res, message = 'Unauthorized') {
  return fail(res, message, 401);
}

function forbidden(res, message = 'Forbidden') {
  return fail(res, message, 403);
}

function notFound(res, message = 'Resource not found') {
  return fail(res, message, 404);
}

module.exports = { ok, created, noContent, paginated, fail, unauthorized, forbidden, notFound };
