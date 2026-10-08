import type { ModerationCategory } from '../types/moderation'

const labels: Record<ModerationCategory, string> = {
  misinformation: 'Misinformation',
  spam_scam: 'Spam / Scam',
  hate_speech: 'Hate Speech',
  harassment: 'Harassment',
  violence: 'Violence',
  sexual_content: 'Sexual Content',
  rape_threat: 'Rape Threat',
  child_sexual_abuse: 'Child Sexual Abuse',
  self_harm: 'Self Harm',
  animal_abuse: 'Animal Abuse',
}

export function CategoryTags({ categories }: { categories: ModerationCategory[] }) {
  if (categories.length === 0) {
    return <p className="font-mono text-sm font-bold uppercase text-ink/60">No policy categories detected</p>
  }
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Detected categories">
      {categories.map((category) => (
        <li key={category} className="border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#111]">
          {labels[category]}
        </li>
      ))}
    </ul>
  )
}
