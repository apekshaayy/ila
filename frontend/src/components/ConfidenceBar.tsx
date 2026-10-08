interface ConfidenceBarProps {
  confidence: number
}

export function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const percentage = Math.round(confidence * 100)
  const filled = Math.round(confidence * 10)
  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-4">
        <span className="font-mono text-xs font-black uppercase tracking-widest">Confidence</span>
        <span className="font-display text-2xl font-black">{percentage}%</span>
      </div>
      <div
        className="grid grid-cols-10 gap-1 border-3 border-ink bg-white p-1.5"
        role="meter"
        aria-label={`Confidence ${percentage} percent`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <span key={index} className={`h-5 border border-ink ${index < filled ? 'bg-ink' : 'bg-paper'}`} aria-hidden="true" />
        ))}
      </div>
    </div>
  )
}
