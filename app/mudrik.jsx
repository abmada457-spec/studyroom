'use client'

import { useEffect, useRef, useState } from 'react'
import Studyroom from './studyroom'
import { accept } from './files'
import './mudrik.css'

const sources = [
  { id: 'upload', title: 'من جهازك', mark: '↑', detail: 'PDF والصور والنصوص', action: 'اختر ملفًا من جهازك' },
  { id: 'drive', title: 'Google Drive', mark: '△', detail: 'رابط من Google Drive', sample: 'https://drive.google.com/…' },
  { id: 'youtube', title: 'YouTube', mark: '▶', detail: 'رابط فيديو على YouTube', sample: 'https://www.youtube.com/…' },
  { id: 'zoom', title: 'Zoom', mark: '◉', detail: 'رابط تسجيل Zoom', sample: 'https://zoom.us/rec/…' },
]

const steps = [
  ['أضف المحاضرة', 'ارفع السلايدات بصيغة PDF أو أرفق صورة من ملاحظاتك.'],
  ['اسأل عمّا لم تفهمه', 'اطلب شرحًا خطوة بخطوة أو ملخصًا لأهم الأفكار.'],
  ['راجع ما تعلّمته', 'اطلب أسئلة مراجعة واختبر فهمك قبل الامتحان.'],
]

const reviews = [
  ['«وقت المراجعة صار للمواضيع اللي ما فهمتها، بدل ما أعيد المحاضرة من البداية.»', 'مثال لطالبة هندسة حاسوب'],
  ['«بعد قراءة الملخّص، أختبر نفسي بأسئلة قصيرة حتى أعرف أين أحتاج مزيدًا من المراجعة.»', 'مثال لطالب علوم'],
]

function Brand() {
  return <a href="#" className="md-brand" aria-label="مدرك، الرئيسية">
    <span className="md-mark" aria-hidden="true">م<span>✦</span></span>
    <span><strong>مدرك</strong><small>شرح المحاضرات بالذكاء الاصطناعي</small></span>
  </a>
}

export default function Mudrik({ connected, chatUrl }) {
  const [workspace, setWorkspace] = useState(false)
  const [incoming, setIncoming] = useState([])
  const [activeSource, setActiveSource] = useState('upload')
  const [revealed, setRevealed] = useState(false)
  const upload = useRef(null)
  const source = sources.find(entry => entry.id === activeSource)

  useEffect(() => {
    const sync = () => {
      const inChat = window.location.hash === '#chat'
      setWorkspace(inChat)
      if (!inChat) {
        setIncoming([])
        document.documentElement.lang = 'ar'
        document.documentElement.dir = 'rtl'
      }
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  function openChat(files = []) {
    setIncoming(files)
    setWorkspace(true)
    window.location.hash = 'chat'
    window.scrollTo(0, 0)
  }

  if (workspace) {
    return <Studyroom connected={connected} chatUrl={chatUrl} incoming={incoming}
      onHome={() => { window.location.hash = 'home' }} />
  }

  return <div className="mudrik" dir="rtl" lang="ar" id="home">
    <header className="md-header">
      <div className="md-shell md-header-inner">
        <Brand />
        <nav aria-label="التنقل الرئيسي">
          <a href="#product">المنتج</a>
          <a href="#how">كيف يعمل</a>
          <a href="#sources">المصادر</a>
          <a href="#reviews">التقييمات</a>
        </nav>
        <a href="#chat" className="md-button md-button-primary md-login">الدخول <span aria-hidden="true">↖</span></a>
      </div>
    </header>

    <main className="md-main">
      <section className="md-hero md-shell" aria-labelledby="mudrik-title" id="product">
        <p className="md-eyebrow"><span aria-hidden="true">✦</span> مساعدك لفهم المحاضرات</p>
        <h1 id="mudrik-title">محاضرة ساعتين؟<br /><em>افهمها في عشر دقائق.</em></h1>
        <p className="md-lede">ارفع محاضرتك، وافهم الأفكار الصعبة بأسئلة وأمثلة على قدر حاجتك.</p>
        <div className="md-actions">
          <a className="md-button md-button-primary" href="#chat">جرّبه الآن <span aria-hidden="true">←</span></a>
          <a className="md-button md-button-outline" href="#how"><span aria-hidden="true">▷</span> شاهد كيف يعمل</a>
        </div>

        <div className="md-workspace" id="sources">
          <div className="md-panel md-input">
            <div className="md-panel-title">
              <span className="md-section-icon" aria-hidden="true">↥</span>
              <div><h2>أضف محاضرتك</h2><p>اختر المصدر الذي تريد الدراسة منه.</p></div>
            </div>
            <div className="md-sources" role="group" aria-label="مصدر المحاضرة">
              {sources.map(entry => <button type="button" key={entry.id}
                aria-pressed={activeSource === entry.id} onClick={() => setActiveSource(entry.id)}>
                <span className={'md-source-symbol md-source-' + entry.id} aria-hidden="true">{entry.mark}</span>
                <strong dir="auto">{entry.title}</strong>
                <small>{entry.id === 'upload' ? 'متاح الآن' : 'قريبًا'}</small>
              </button>)}
            </div>
            <div className="md-upload">
              <input type="file" hidden ref={upload} multiple accept={accept} onChange={event => {
                const files = Array.from(event.target.files)
                if (files.length) openChat(files)
              }} />
              {source.id === 'upload' ? <>
                <div><strong>{source.action}</strong><small>{source.detail}</small></div>
                <button type="button" className="md-button md-button-primary" onClick={() => upload.current?.click()}>رفع ملف</button>
              </> : <>
                <div><strong>{source.detail}</strong><small dir="ltr">{source.sample}</small></div>
                <button type="button" className="md-button md-button-outline" disabled>تحليل قريبًا</button>
              </>}
            </div>
            <small className="md-file-note">حوّل سلايدات PowerPoint أو ملفات Word وExcel إلى PDF قبل رفعها.</small>
          </div>

          <div className="md-panel md-preview">
            <div className="md-preview-top"><span><i /> مثال على مخرجات مدرك</span><span dir="ltr">1:32:10</span></div>
            <div className="md-lecture"><span className="md-lecture-icon" aria-hidden="true">◈</span>
              <div><small>علم الأحياء 201</small><h2>المحاضرة 4 — الانقسام الخلوي</h2></div>
            </div>
            <div className="md-flash">
              <div className="md-flash-meta"><span>بطاقة مراجعة</span><span dir="ltr">01 / 04</span></div>
              <div className="md-flash-body">
                <div className="md-cell" aria-hidden="true"><i /><i /><i /><i /><i /></div>
                <div><h3>الطور الاستوائي</h3>
                  <p aria-live="polite">{revealed ? 'تصطف الكروموسومات في منتصف الخلية قبل أن تنفصل.' : 'أين تصطف الكروموسومات قبل أن تنفصل؟'}</p></div>
              </div>
              <button type="button" className="md-reveal" aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>
                {revealed ? 'إخفاء الإجابة' : 'أظهر الإجابة'} <span aria-hidden="true">←</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="md-section md-shell" id="how">
        <h2>من المحاضرة إلى المراجعة</h2>
        <div className="md-steps">
          {steps.map(([title, detail], index) => <article key={title}>
            <span>{['↥', '✦', '✓'][index]}</span><h3>{title}</h3><p>{detail}</p>
          </article>)}
        </div>
      </section>

      <section className="md-section md-review-section" id="reviews">
        <div className="md-shell">
          <div className="md-review-head"><div><h2>كيف قد يستفيد الطلاب؟</h2><p>أمثلة توضيحية على تجربة الاستخدام.</p></div><span>آراء الطلاب قريبًا</span></div>
          <div className="md-reviews">{reviews.map(([quote, author]) => <figure key={author}>
            <blockquote>{quote}</blockquote><figcaption>{author}</figcaption>
          </figure>)}</div>
          <small className="md-demo-metrics">مثال لعرض الإحصاءات · 4.9 من أكثر من 2,340 تقييم · 128,464 شرحًا</small>
        </div>
      </section>

      <section className="md-section md-shell md-faq" id="faq">
        <h2>أسئلة شائعة</h2>
        <details><summary>ما الملفات التي يمكنني رفعها؟</summary><p>يمكنك إرفاق ملفات PDF والصور والنصوص. صدّر السلايدات أو المستندات إلى PDF أولًا.</p></details>
        <details><summary>أين أجد محادثاتي؟</summary><p>تظهر المحادثات السابقة في مساحة الدراسة على المتصفح والجهاز اللذين استخدمتهما.</p></details>
      </section>

      <section className="md-final md-shell">
        <div><h2>جاهز لمراجعة محاضرتك؟</h2><p>ادخل إلى مساحة الدراسة وابدأ بسؤالك الأول.</p></div>
        <a href="#chat" className="md-button md-button-white">ابدأ بمحاضرتك الأولى <span aria-hidden="true">←</span></a>
      </section>
    </main>

    <footer className="md-footer">
      <div className="md-shell">
        <div className="md-footer-grid">
          <div><Brand /><a className="md-support" href="mailto:support@mudrik.app" dir="ltr">support@mudrik.app</a></div>
          <div><h2>المنتج</h2><a href="#how">كيف يعمل</a><a href="#sources">المصادر</a><a href="#reviews">التقييمات</a><a href="#chat">الدخول</a></div>
          <div><h2>الشركة</h2><a href="#product">عن مدرك</a><a href="#faq">الأسئلة الشائعة</a><a href="mailto:support@mudrik.app">تواصل معنا</a></div>
          <div><h2>قانوني</h2><span>سياسة الخصوصية · قريبًا</span><span>شروط الاستخدام · قريبًا</span><span>سياسة ملفات الارتباط · قريبًا</span></div>
        </div>
        <small className="md-copyright">© 2026 مدرك. جميع الحقوق محفوظة.</small>
      </div>
    </footer>
  </div>
}
