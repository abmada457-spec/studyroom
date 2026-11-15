import { maxBytes, maxFiles, supportedFile } from '../../files'

export const runtime = 'nodejs'

const maxRequestBytes = maxBytes + 2 * 1024 * 1024

export async function POST(request) {
  const { STUDY_AI_URL: url, STUDY_AI_KEY: key } = process.env
  if (!url || !key) return Response.json({ error: 'not_configured' }, { status: 503 })

  const origin = request.headers.get('origin')
  const siteOrigin = process.env.STUDY_SITE_ORIGIN || new URL(request.url).origin
  if (origin !== siteOrigin) return Response.json({ error: 'forbidden' }, { status: 403 })

  try {
    // Cap the streamed body before asking the multipart parser to materialize it.
    const reader = request.body?.getReader()
    if (!reader) return Response.json({ error: 'invalid_request' }, { status: 400 })
    const chunks = []
    let bytes = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxRequestBytes) {
        await reader.cancel()
        return Response.json({ error: 'too_large' }, { status: 413 })
      }
      chunks.push(value)
    }
    const body = await new Response(new Blob(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData()
    const language = body.get('language')
    const messages = JSON.parse(body.get('messages') || 'null')
    const files = body.getAll('files')
    if (
      !['ar', 'en'].includes(language) || !Array.isArray(messages) ||
      messages.length === 0 || messages.length > 40 || messages.at(-1)?.role !== 'user' ||
      messages.some(message => !message || !['user', 'assistant'].includes(message.role) ||
        typeof message.content !== 'string' || message.content.length > 20000) ||
      files.length > maxFiles || files.some(file => typeof file === 'string' || !supportedFile(file)) ||
      files.reduce((total, file) => total + file.size, 0) > maxBytes
    ) return Response.json({ error: 'invalid_request' }, { status: 400 })

    const payload = new FormData()
    payload.set('language', language)
    payload.set('messages', JSON.stringify(messages))
    for (const file of files) payload.append('files', file)
    const response = await fetch(url, {
      method: 'POST', headers: { Authorization: 'Bearer ' + key },
      body: payload, signal: AbortSignal.timeout(45000), redirect: 'error', cache: 'no-store',
    })
    if (!response.ok) return Response.json({ error: 'upstream_failed' }, { status: 502 })
    const { answer } = await response.json()
    if (typeof answer !== 'string' || !answer.trim()) {
      return Response.json({ error: 'invalid_answer' }, { status: 502 })
    }
    return Response.json({ answer })
  } catch (error) {
    if (error.name === 'TimeoutError') return Response.json({ error: 'timeout' }, { status: 504 })
    if (error instanceof SyntaxError) return Response.json({ error: 'invalid_json' }, { status: 400 })
    return Response.json({ error: 'chat_failed' }, { status: 502 })
  }
}
