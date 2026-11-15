import 'katex/dist/katex.min.css'
import './style.css'

export const metadata = {
  title: 'مدرك | شرح المحاضرات بالذكاء الاصطناعي',
  description: 'A bilingual workspace for studying lecture slides, notes, and images.',
}

export default function RootLayout({ children }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>
}
