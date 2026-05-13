import Link from 'next/link'

const LightningIcon = ({ size }: { size: 'sm' | 'md' }) => (
  <svg
    width={size === 'sm' ? 14 : 17}
    height={size === 'sm' ? 14 : 17}
    viewBox="0 0 24 24"
    fill="#06b6d4"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
  </svg>
)

interface BrandLogoProps {
  href?: string | null
  size?: 'sm' | 'md'
}

export function BrandLogo({ href = '/', size = 'md' }: BrandLogoProps) {
  const iconSize = size === 'sm' ? { width: 28, height: 28 } : { width: 34, height: 34 }
  const svgEl = <LightningIcon size={size} />

  const inner = (
    <div className="flex items-center gap-2">
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          ...iconSize,
          background: '#060a0d',
          border: '1px solid #06b6d4',
          borderRadius: 7,
        }}
      >
        {svgEl}
      </div>
      <span
        className="tracking-tight"
        style={{ fontWeight: 800, fontSize: size === 'sm' ? 13 : 14 }}
      >
        <span className="text-slate-100">ref</span>
        <span className="text-cyan-400">log</span>
      </span>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}
