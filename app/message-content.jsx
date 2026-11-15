import Markdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// Gemini also uses LaTeX delimiters. Preserve fenced and inline code literally.
export function normalizeMathDelimiters(text) {
  const segments = /(^[ \t]{0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]{0,3}\2[\t ]*(?=\n|$)|(?![\s\S])))|(`+)[^\n]*?\3|\\\[([\s\S]*?)\\\]|\\\(([^\n]*?)\\\)/gm
  return text.replace(segments, (match, fence, marker, inlineCode, display, inline) => {
    if (display !== undefined) return '\n\n$$\n' + display.trim() + '\n$$\n\n'
    if (inline !== undefined) return '$' + inline + '$'
    return match
  })
}

export default function MessageContent({ text }) {
  return <div className="message-content" dir="auto">
    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} skipHtml>
      {normalizeMathDelimiters(text)}
    </Markdown>
  </div>
}
