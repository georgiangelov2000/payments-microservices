export function send(res, responseDef, extraBody = null) {
  const { status, body } = responseDef

  if (body && extraBody) {
    return res.status(status).json({ ...body, ...extraBody })
  }

  if (body) {
    return res.status(status).json(body)
  }

  return res.sendStatus(status)
}
