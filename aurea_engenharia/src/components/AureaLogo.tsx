import aureaLogoOfficial from '@/assets/1-c6d09.png'

interface AureaLogoProps {
  /**
   * 'card': container branco refinado com borda e sombra sutil, preservando 100% das cores originais da marca sobre temas escuros
   * 'clean': imagem da logo pura sem container
   */
  variant?: 'card' | 'clean'
  /** Tamanho da imagem da logo em pixels de altura */
  height?: number
  /** Se deve exibir o link para início */
  href?: string
  className?: string
  alt?: string
  priority?: boolean
}

/**
 * Componente oficial da marca AUREA Engenharia Consultiva.
 * Utiliza o asset oficial atualizado (1-c6d09.png - símbolo de torres/setas ascendentes em gradiente cobre rose-gold,
 * a palavra "AUREA" em azul-marinho com fonte elegante, e abaixo "ENGENHARIA CONSULTIVA" em cinza escuro espaçado com traços cobre nas laterais sobre fundo branco).
 * Preserva proporções e legibilidade sobre temas escuros através de um container
 * sofisticado ("card") ou exibição limpa.
 */
export function AureaLogo({
  variant = 'card',
  height = 46,
  href,
  className = '',
  alt = 'AUREA Engenharia Consultiva',
}: AureaLogoProps) {
  const content = (
    <div
      className={`inline-flex items-center justify-center transition-all ${
        variant === 'card'
          ? 'bg-white hover:bg-white rounded-[6px] px-3 py-1.5 shadow-sm border border-[#c2996b]/30 hover:border-[#c2996b]/60 hover:shadow-[0_4px_16px_rgba(194,153,107,0.22)]'
          : ''
      } ${className}`}
    >
      <img
        src={aureaLogoOfficial}
        alt={alt}
        style={{ height: `${height}px`, width: 'auto' }}
        className="object-contain max-w-full block rounded-[2px]"
        loading="eager"
        decoding="async"
      />
    </div>
  )

  if (href) {
    return (
      <a
        href={href}
        className="inline-flex items-center focus:outline-none focus:ring-2 focus:ring-[#c2996b]/50 rounded-[6px] transition-transform hover:scale-[1.01]"
        aria-label="Aurea Engenharia Consultiva - início"
      >
        {content}
      </a>
    )
  }

  return content
}

/**
 * Ícone / Símbolo da logo da AUREA em SVG vetorial de alta definição com gradiente cobre rose-gold,
 * ideal para badges, favicons e marcações compactas no painel admin e mobile.
 */
export function AureaSymbol({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="aurea-sym-copper-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E5BE99" />
          <stop offset="50%" stopColor="#D7A47B" />
          <stop offset="100%" stopColor="#9C5E35" />
        </linearGradient>
        <linearGradient id="aurea-sym-copper-2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D7A47B" />
          <stop offset="60%" stopColor="#A86E45" />
          <stop offset="100%" stopColor="#7B4722" />
        </linearGradient>
      </defs>
      <g transform="translate(6, 4) scale(0.81)">
        {/* Esquerda */}
        <path d="M 28 0 L 10 17 L 18 17 L 18 52 L 28 52 Z" fill="url(#aurea-sym-copper-1)" />
        <path
          d="M 8 20 L 0 28 L 5 28 L 5 62 L 0 74 L 10 74 L 10 24 Z"
          fill="url(#aurea-sym-copper-2)"
        />
        {/* Direita */}
        <path d="M 36 0 L 54 17 L 46 17 L 46 52 L 36 52 Z" fill="url(#aurea-sym-copper-1)" />
        <path
          d="M 56 20 L 64 28 L 59 28 L 59 62 L 64 74 L 54 74 L 54 24 Z"
          fill="url(#aurea-sym-copper-2)"
        />
      </g>
    </svg>
  )
}

export default AureaLogo
