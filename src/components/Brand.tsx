import Link from 'next/link'
import { Icon } from './Icon'

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="ENZO SCHOOL">
      <span
        className={`grid size-11 place-items-center rounded-2xl ${inverse ? 'bg-white text-[#721b3b]' : 'bg-[#721b3b] text-white'}`}
      >
        <Icon name="graduation" className="size-6" />
      </span>
      <span className="text-right leading-none">
        <strong
          className={`block text-lg tracking-[0.08em] ${inverse ? 'text-white' : 'text-[#721b3b]'}`}
        >
          ENZO
        </strong>
        <span
          className={`text-[10px] font-bold tracking-[0.32em] ${inverse ? 'text-white/65' : 'text-[#9c7e87]'}`}
        >
          SCHOOL
        </span>
      </span>
    </Link>
  )
}
