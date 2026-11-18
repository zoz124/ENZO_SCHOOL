'use client'

import { useState } from 'react'
import { Icon } from './Icon'

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-[#721b3b] px-4 py-3 text-xs font-black text-white transition hover:bg-[#5d1530]"
    >
      <Icon name={copied ? 'check' : 'copy'} className="size-4" />
      {copied ? 'تم النسخ' : 'نسخ الرابط'}
    </button>
  )
}
