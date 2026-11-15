'use client'

import { useEffect, useRef, useState } from 'react'
import { copy } from './copy'
import { accept, maxBytes, maxFiles, readWorkspace, saveWorkspace, supportedFile } from './files'

const shapes = {
  brand: 'M3 19V5l9-2 9 2v14l-9 2-9-2Zm9-16v18M6.5 8l2 .5m-2 3 2 .5m7-3.5 2-.5m-2 4 2-.5',
  plus: 'M12 5v14M5 12h14',
  copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  check: 'm5 12 4 4L19 6',
  chat: 'M20 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-5 2 1.5-4.5A7.5 7.5 0 1 1 20 11.5Z',
  disk: 'M5 16h14M6 19h12M7 5h10l3 9H4l3-9Z',
  globe: 'M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Zm0 0h18M12 3c4 4 4 14 0 18-4-4-4-14 0-18Z',
  book: 'M12 6c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v13',
  layers: 'm3 8 9-5 9 5-9 5-9-5Zm0 4 9 5 9-5M3 16l9 5 9-5',
  quiz: 'M9 3h6v4H9zM7 5H5v16h14V5h-2M8 13l2 2 5-5',
  clip: 'm9 13 5.5-5.5a2.1 2.1 0 0 1 3 3L10 18a4 4 0 0 1-5.7-5.7l8-8',
  send: 'M12 19V5m-6 6 6-6 6 6',
  x: 'm6 6 12 12M18 6 6 18',
  menu: 'M4 6h16M4 12h16M4 18h16',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 13h6m-6 4h6',
  spark: 'M12 3c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9Z',
  chevron: 'm9 6 6 6-6 6',
}
function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={shapes[name]} />
  </svg>
}

function Attachment({ file, remove, label }) {
  return <span className="attachment" title={file.name}>
    <Icon name="file" size={16} /><b dir="auto">{file.name}</b>
    {remove && <button type="button" onClick={remove} title={label} aria-label={label}><Icon name="x" size={14} /></button>}
  </span>
}

function CopyMessage({ message, t }) {
  const [status, setStatus] = useState('copy')
  const timer = useRef(null)
  const text = [message.content, ...(message.files ?? [])].filter(Boolean).join('\n')

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copyMessage() {
    let result = 'copied'
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      result = 'copyFailed'
    }
    setStatus(result)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('copy'), 1800)
  }

  return <button type="button" className="copy-message" onClick={copyMessage}>
    <Icon name={status === 'copied' ? 'check' : 'copy'} size={15} />
    <span aria-live="polite">{t[status]}</span>
  </button>
}

export default function Studyroom({ connected, chatUrl = '/api/chat' }) {
  const [language, setLanguage] = useState('ar')
  const [chats, setChats] = useState([])
  const [selected, setSelected] = useState(null)
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [pending, setPending] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const picker = useRef(null)
  const field = useRef(null)
  const viewport = useRef(null)
  const inFlight = useRef(false)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const t = copy[language]
  const chat = chats.find(item => item.id === selected)
  const completedFiles = chat?.files ?? []

  useEffect(() => {
    let canceled = false
    readWorkspace().then(data => {
      if (canceled || !data) return
      if (data.language === 'en') setLanguage('en')
      setChats(data.chats)
      setSelected(data.selected)
    }).catch(() => { if (!canceled) setStorageError(true) }).finally(() => {
      if (!canceled) setReady(true)
    })
    return () => { canceled = true }
  }, [])

  useEffect(() => {
    if (ready) saveWorkspace({ language, chats, selected }).catch(() => setStorageError(true))
  }, [ready, language, chats, selected])

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  useEffect(() => {
    if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight
  }, [chat?.messages.length, selected, pending])

  function openChat(id) {
    setSelected(id)
    setDraft('')
    setAttachments([])
    setNotice('')
    setMobileOpen(false)
  }

  function addFiles(list) {
    const incoming = Array.from(list)
    const all = [...completedFiles, ...attachments, ...incoming]
    if (incoming.some(file => !supportedFile(file))) return setNotice('badFile')
    if (all.length > maxFiles || all.reduce((sum, file) => sum + file.size, 0) > maxBytes) {
      return setNotice('tooMany')
    }
    setAttachments(previous => [...previous, ...incoming])
    setNotice('')
  }

  function storeChat(updated) {
    setChats(previous => [updated, ...previous.filter(item => item.id !== updated.id)])
  }

  async function answer(updated) {
    inFlight.current = true
    setPending(updated.id)
    try {
      let reply = t.previewReply
      if (connected) {
        const body = new FormData()
        body.set('language', language)
        const history = updated.messages.filter(message => !message.demo && !message.preview).slice(-40)
        body.set('messages', JSON.stringify(history.map(({ role, content }) => ({ role, content: content.slice(0, 7000) }))))
        for (const file of updated.files) body.append('files', file)
        const result = await fetch(chatUrl, { method: 'POST', body })
        if (!result.ok) throw new Error(result.status === 429 ? 'quota' : 'failure')
        reply = (await result.json()).answer
      }
      storeChat({ ...updated, failed: false, messages: [...updated.messages, { role: 'assistant', content: reply, preview: !connected }] })
    } catch (error) {
      storeChat({ ...updated, failed: error.message === 'quota' ? 'quota' : true })
    } finally {
      inFlight.current = false
      setPending(null)
    }
  }

  function send(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!ready || inFlight.current || (!content && !attachments.length)) return
    const title = content || attachments[0].name
    const updated = {
      id: chat?.id ?? crypto.randomUUID(), title: chat?.title ?? title.slice(0, 75), failed: false,
      files: [...completedFiles, ...attachments],
      messages: [...(chat?.messages ?? []), { role: 'user', content, files: attachments.map(file => file.name) }],
    }
    storeChat(updated)
    setSelected(updated.id)
    setDraft('')
    setAttachments([])
    setNotice('')
    void answer(updated)
  }

  function sample() {
    if (!ready) return
    const id = crypto.randomUUID()
    storeChat({ id, title: t.sampleLabel, files: [], messages: [
      { role: 'user', content: t.sampleQuestion, demo: true },
      { role: 'assistant', content: t.sampleAnswer, demo: true },
    ] })
    openChat(id)
  }

  return <div className="app">
    {mobileOpen && <button className="shade" aria-label={t.menu} onClick={() => setMobileOpen(false)} />}
    <aside className={'sidebar ' + (mobileOpen ? 'open' : '')}>
      <div className="brand">
        <span className="logo"><Icon name="brand" size={23} /></span>
        <div><strong>{t.brand}</strong><small>{t.workspace}</small></div>
      </div>
      <button className="new-chat" onClick={() => openChat(null)}><Icon name="plus" size={19} />{t.newChat}</button>
      <div className="history-title">{t.history}</div>
      <div className="history">
        {!chats.length && <p>{t.empty}</p>}
        {chats.map(item => <div className={'chat-row ' + (item.id === selected ? 'selected' : '')} key={item.id}>
          <button className="chat-link" onClick={() => openChat(item.id)} title={item.title}>
            <Icon name="chat" size={17} /><span dir="auto">{item.title}</span>
          </button>
          <button className="delete" aria-label={t.delete} title={t.delete} disabled={item.id === pending} onClick={() => {
            if (item.id === selected) openChat(null)
            setChats(previous => previous.filter(entry => entry.id !== item.id))
          }}><Icon name="x" size={15} /></button>
        </div>)}
      </div>
      <div className="local"><Icon name="disk" size={18} />{t.local}</div>
    </aside>
    <main>
      <header className="top">
        <div className="top-start">
          <button className="menu" onClick={() => setMobileOpen(true)} aria-label={t.menu}><Icon name="menu" /></button>
          <span className="section"><Icon name="chat" size={18} />{t.workspace}</span>
          <div className="mode" title={connected ? t.active : t.modeHelp}><i className={connected ? 'live' : ''} />{connected ? t.active : t.appMode}</div>
        </div>
        <button className="language" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
          <Icon name="globe" size={17} /><span>{t.switchTo}</span>
        </button>
      </header>
      <div className="viewport" ref={viewport}>
        {!chat ? <section className="welcome">
          <div className="hero-icon"><Icon name="brand" size={35} /><span><Icon name="spark" size={17} /></span></div>
          <h1>{t.title}</h1>
          <p>{t.description}</p>
          <div className="suggestions">
            {t.suggestions.map(([icon, title, caption, prompt]) =>
              <button key={icon} onClick={() => { setDraft(prompt); field.current?.focus() }}>
                <span className={'tile-icon ' + icon}><Icon name={icon} /></span>
                <strong>{title}</strong><small>{caption}</small>
                <span className="arrow"><Icon name="chevron" size={15} /></span>
              </button>)}
          </div>
          {!connected && <button className="sample" onClick={sample}>{t.demo}<Icon name="chevron" size={14} /></button>}
        </section> : <section className="messages" aria-live="polite">
          {chat.messages.map((message, index) => <article className={'message ' + message.role} key={index}>
            {message.role === 'assistant' && <span className="avatar"><Icon name="brand" size={20} /></span>}
            <div className="message-body">
              {message.role === 'assistant' && <b>{message.demo ? t.sampleLabel : t.brand}</b>}
              {!!message.files?.length && <div className="file-list">{message.files.map((name, i) => <Attachment key={i} file={{ name }} />)}</div>}
              {message.content && <p dir="auto">{message.content}</p>}
              <CopyMessage key={chat.id} message={message} t={t} />
            </div>
          </article>)}
          {pending === chat.id && <div className="typing" role="status">{t.typing}</div>}
          {chat.failed && pending !== chat.id && <div className="error" role="alert">{chat.failed === 'quota' ? t.quota : t.failure}{' '}
            <button disabled={Boolean(pending)} onClick={() => { if (!inFlight.current) void answer(chat) }}>{t.retry}</button>
          </div>}
        </section>}
      </div>
      <div className="compose-wrap">
        <form className={'compose ' + (dragging ? 'dragging' : '')} onSubmit={send}
          onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true) }}
          onDragOver={event => event.preventDefault()}
          onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false) }}
          onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); addFiles(event.dataTransfer.files) }}>
          {!!attachments.length && <div className="file-list">
            {attachments.map((file, index) => <Attachment key={index} file={file} label={t.remove}
              remove={() => setAttachments(previous => previous.filter((_, i) => i !== index))} />)}
          </div>}
          <textarea ref={field} dir="auto" value={draft} maxLength={7000} aria-label={t.placeholder} placeholder={t.placeholder}
            rows={2} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                event.currentTarget.form.requestSubmit()
              }
            }} />
          <div className="compose-actions">
            <input type="file" ref={picker} hidden multiple accept={accept} onChange={event => {
              addFiles(event.target.files)
              event.target.value = ''
            }} />
            <button className="attach" type="button" onClick={() => picker.current?.click()}><Icon name="clip" size={18} />{t.attach}</button>
            <button className="send" type="submit" disabled={!ready || Boolean(pending) || (!draft.trim() && !attachments.length)}
              title={t.send} aria-label={t.send}><Icon name="send" size={20} /></button>
          </div>
        </form>
        {(notice || storageError) && <div className="error" role="alert">{notice ? t[notice] : t.storage}</div>}
        <div className="formats">{t.formats}</div>
      </div>
    </main>
  </div>
}
