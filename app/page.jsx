import Studyroom from './studyroom'

export const dynamic = 'force-dynamic'

export default function Page() {
  const connected = Boolean(process.env.STUDY_AI_URL && process.env.STUDY_AI_KEY)
  return <Studyroom connected={connected} />
}
