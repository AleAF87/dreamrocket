import { FormEvent, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Crosshair,
  FileCheck2,
  Flame,
  HardHat,
  Landmark,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Store,
  Target,
  UserRound,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createLead, type LeadPayload } from '@/services/leads'
import { trackVisit, trackWhatsAppClick } from '@/services/visits'
import { AureaLogo } from '@/components/AureaLogo'

const whatsappMessage = encodeURIComponent(
  'Olá! Vi o site da Aurea Engenharia e gostaria de saber mais sobre a regularização de AVCB para meu imóvel.',
)
const whatsappUrl = `https://wa.me/5511999061190?text=${whatsappMessage}`

const navigation = [
  { label: 'INÍCIO', href: '#inicio' },
  { label: 'A EMPRESA', href: '#empresa' },
  { label: 'SOLUÇÕES', href: '#solucoes' },
  { label: 'PROJETOS', href: '#processo' },
  { label: 'CONTEÚDO', href: '#avcb' },
]

const values = [
  {
    title: 'Segurança',
    text: 'Projetos desenvolvidos para atender às exigências técnicas e normativas.',
    icon: ShieldCheck,
  },
  {
    title: 'Precisão',
    text: 'Análise criteriosa das características de cada imóvel e empreendimento.',
    icon: Crosshair,
  },
  {
    title: 'Visão',
    text: 'Soluções pensadas não apenas para atender uma exigência, mas para agregar valor ao projeto.',
    icon: Landmark,
  },
]

const audiences = [
  {
    title: 'PARA SÍNDICOS',
    icon: Building2,
    bullets: [
      'Segurança jurídica e conformidade com todas as exigências.',
      'Processos estruturados, transparentes e sem surpresas.',
      'Tranquilidade para o condomínio e para o síndico.',
    ],
  },
  {
    title: 'PARA PEQUENOS COMERCIANTES',
    icon: Store,
    bullets: [
      'Agilidade na regularização para não parar o seu negócio.',
      'Seu negócio continua funcionando enquanto regularizamos.',
      'Soluções práticas e acessíveis para o seu dia a dia.',
    ],
  },
]

const steps = [
  {
    number: '01',
    title: 'DIAGNÓSTICO',
    text: 'Analisamos o imóvel, sua utilização e as condições existentes.',
    icon: Search,
  },
  {
    number: '02',
    title: 'ESTUDO TÉCNICO',
    text: 'Identificamos as adequações e medidas de segurança necessárias.',
    icon: ClipboardList,
  },
  {
    number: '03',
    title: 'PROJETO',
    text: 'Desenvolvemos a documentação técnica necessária.',
    icon: FileCheck2,
  },
  {
    number: '04',
    title: 'APROVAÇÃO',
    text: 'Conduzimos o processo técnico junto aos órgãos competentes.',
    icon: ClipboardCheck,
  },
  {
    number: '05',
    title: 'ADEQUAÇÃO',
    text: 'Quando necessário, acompanhamos a execução das medidas previstas.',
    icon: HardHat,
  },
  {
    number: '06',
    title: 'REGULARIZAÇÃO',
    text: 'Entrega da documentação e conclusão do processo.',
    icon: ShieldCheck,
  },
]

const services = [
  {
    title: 'Vistoria Técnica',
    text: 'Diagnóstico completo das condições e necessidades do imóvel.',
    icon: Search,
  },
  {
    title: 'Laudos e Pareceres',
    text: 'Documentação técnica fundamentada para decisões seguras.',
    icon: ClipboardList,
  },
  {
    title: 'Avaliações e Credenciamentos',
    text: 'Análises especializadas e conformidade junto aos órgãos.',
    icon: Landmark,
  },
  {
    title: 'Acompanhamento e Gestão de Obras',
    text: 'Controle técnico de qualidade, prazos e execução.',
    icon: HardHat,
  },
  {
    title: 'AVCB e Segurança contra Incêndio',
    text: 'Suporte completo até a aprovação do Corpo de Bombeiros.',
    icon: Flame,
  },
  {
    title: 'Consultoria Técnica',
    text: 'Orientação estratégica para proteger e valorizar seu patrimônio.',
    icon: Target,
  },
]

const initialForm: LeadPayload = {
  name: '',
  email: '',
  phone: '',
  property_type: 'residencial',
  message: '',
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <AureaLogo
      href="#inicio"
      variant="card"
      height={compact ? 44 : 56}
      className={compact ? 'py-1 px-3' : 'py-2 px-4'}
      alt="AUREA Engenharia Consultiva"
    />
  )
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(element)
        }
      },
      { threshold: 0.14 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-inner">
        <Brand compact />
        <nav className="desktop-nav" aria-label="Navegação principal">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a href="#contato" className="header-contact">
          CONTATO
        </a>
        <button
          className="menu-trigger"
          type="button"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <div className={`mobile-nav ${open ? 'is-open' : ''}`}>
        {navigation.map((item) => (
          <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
            {item.label}
          </a>
        ))}
        <a href="#contato" onClick={() => setOpen(false)}>
          CONTATO
        </a>
      </div>
    </header>
  )
}

function Index() {
  const { toast } = useToast()
  const [form, setForm] = useState<LeadPayload>(initialForm)
  const [submitting, setSubmitting] = useState(false)

  // Rastreia visita anônima automaticamente ao carregar a página
  useEffect(() => {
    trackVisit('/')
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      // createLead captura automaticamente o IP do visitante do serviço de visitas
      await createLead({
        ...form,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      })
      setForm(initialForm)
      toast({
        title: 'Mensagem enviada com sucesso!',
        description: 'Recebemos seus dados. Um engenheiro da Aurea entrará em contato em breve.',
        className: 'border-[#C2996B]/50 bg-[#111923] text-white',
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Não foi possível enviar agora.',
        description: 'Tente novamente ou fale diretamente conosco pelo WhatsApp.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="site-shell">
      <Header />

      <main>
        <section id="inicio" className="hero">
          <img
            className="hero-image"
            src={`${import.meta.env.BASE_URL}images/residencia-anoitecer.jpg`}
            alt="Residência moderna iluminada ao anoitecer"
          />
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-line-art" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="container hero-content">
            <Reveal className="hero-copy">
              <p className="eyebrow">ENGENHARIA CIVIL • SÃO PAULO</p>
              <h1>
                Engenharia que
                <br />
                <span>sustenta decisões.</span>
              </h1>
              <p className="hero-description">
                Soluções de engenharia desenvolvidas com rigor técnico, visão estratégica e
                compromisso em cada etapa do projeto.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#empresa">
                  CONHEÇA A AUREA <ArrowRight />
                </a>
                <a className="button button-outline" href="#contato">
                  QUERO REGULARIZAR MEU IMÓVEL <ArrowRight />
                </a>
              </div>
            </Reveal>
          </div>
          <a href="#empresa" className="scroll-hint" aria-label="Rolar para conhecer a Aurea">
            <span>DESCUBRA</span>
            <i />
          </a>
        </section>

        <section id="empresa" className="values-section" aria-label="Nossos valores">
          <div className="container values-grid">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <Reveal className="value-item" key={value.title} delay={index * 100}>
                  <Icon strokeWidth={1.4} />
                  <div>
                    <h2>{value.title}</h2>
                    <p>{value.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </section>

        <section id="avcb" className="fire-section section-border">
          <div className="fire-image-panel">
            <img
              src={`${import.meta.env.BASE_URL}images/escada-emergencia.jpg`}
              alt="Escada de emergência e equipamentos de combate a incêndio em edifício"
              loading="lazy"
            />
          </div>
          <div className="container fire-layout">
            <div className="fire-content">
              <Reveal>
                <p className="eyebrow">ENGENHARIA DE SEGURANÇA CONTRA INCÊNDIO</p>
                <h2 className="section-title">
                  Regularizar é mais do que uma exigência.{' '}
                  <span>É proteger pessoas e patrimônios.</span>
                </h2>
                <p className="section-lead">
                  Cuide da segurança do seu imóvel e evite multas, interdições e responsabilidades.
                  Cuidamos de todo o processo para você.
                </p>
              </Reveal>
              <div className="audience-grid">
                {audiences.map((audience, index) => {
                  const Icon = audience.icon
                  return (
                    <Reveal className="audience-card" key={audience.title} delay={index * 120}>
                      <div className="audience-title">
                        <Icon />
                        <h3>{audience.title}</h3>
                      </div>
                      <ul>
                        {audience.bullets.map((bullet) => (
                          <li key={bullet}>
                            <CheckCircle2 /> <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  )
                })}
              </div>
              <Reveal className="fire-actions" delay={160}>
                <a href="#contato" className="button button-primary">
                  FALE COM UM ENGENHEIRO <ArrowRight />
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-outline"
                  onClick={() => trackWhatsAppClick('/#avcb')}
                >
                  <MessageCircle /> FALE AGORA NO WHATSAPP <ArrowRight />
                </a>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="processo" className="process-section section-border">
          <div className="container">
            <Reveal className="section-heading centered">
              <p className="eyebrow">UM CAMINHO CLARO E SEGURO</p>
              <h2>
                DO DIAGNÓSTICO À <span>REGULARIZAÇÃO</span>
              </h2>
            </Reveal>
            <div className="timeline">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <Reveal className="timeline-item" key={step.number} delay={index * 90}>
                    <div className="timeline-icon">
                      <Icon />
                    </div>
                    <div className="timeline-copy">
                      <strong>{step.number}</strong>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        <section id="solucoes" className="services-section section-border">
          <div className="container">
            <Reveal className="section-heading centered">
              <p className="eyebrow">EXPERIÊNCIA TÉCNICA A SERVIÇO DO SEU PATRIMÔNIO</p>
              <h2>
                O QUE A AUREA FAZ <span>POR VOCÊ</span>
              </h2>
            </Reveal>
            <div className="services-grid">
              {services.map((service, index) => {
                const Icon = service.icon
                return (
                  <Reveal className="service-card" key={service.title} delay={(index % 3) * 100}>
                    <span className="service-number">0{index + 1}</span>
                    <Icon strokeWidth={1.35} />
                    <h3>{service.title}</h3>
                    <p>{service.text}</p>
                    <a href="#contato" aria-label={`Solicitar ${service.title}`}>
                      SAIBA MAIS <ArrowRight />
                    </a>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container">
            <Reveal className="cta-banner">
              <div className="cta-icon">
                <MessageCircle />
              </div>
              <div>
                <h2>Seu imóvel precisa de AVCB?</h2>
                <p>Fale agora com um engenheiro e regularize com segurança.</p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="button button-dark"
                onClick={() => trackWhatsAppClick('/#cta')}
              >
                <MessageCircle /> FALE AGORA NO WHATSAPP <ArrowRight />
              </a>
            </Reveal>
          </div>
        </section>

        <section id="contato" className="contact-section section-border">
          <div className="container contact-layout">
            <Reveal className="contact-copy">
              <p className="eyebrow">VAMOS CONVERSAR</p>
              <div className="mb-4">
                <AureaLogo
                  variant="card"
                  height={42}
                  className="py-1 px-3 !rounded-sm opacity-90"
                  alt="AUREA Engenharia Consultiva"
                />
              </div>
              <h2 className="section-title">
                Regularize seu imóvel com <span>segurança e tranquilidade.</span>
              </h2>
              <p className="section-lead">
                Conte brevemente sobre o seu imóvel. Nossa equipe analisará sua necessidade e
                retornará com a orientação mais adequada.
              </p>
              <div className="contact-list">
                <a href="tel:+5511999061190">
                  <Phone />
                  <span>
                    <small>TELEFONE E WHATSAPP</small>11 99906-1190
                  </span>
                </a>
                <a href="mailto:contato@aureaengenharia.com.br">
                  <Mail />
                  <span>
                    <small>E-MAIL</small>contato@aureaengenharia.com.br
                  </span>
                </a>
                <div>
                  <MapPin />
                  <span>
                    <small>ATENDIMENTO</small>São Paulo e Litoral Norte
                  </span>
                </div>
              </div>
            </Reveal>

            <Reveal className="form-panel" delay={120}>
              <div className="form-heading">
                <span>ATENDIMENTO ESPECIALIZADO</span>
                <h3>Fale com um engenheiro</h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="field-grid">
                  <label>
                    <span>Nome *</span>
                    <div className="input-wrap">
                      <UserRound />
                      <input
                        required
                        minLength={2}
                        autoComplete="name"
                        placeholder="Seu nome completo"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                  </label>
                  <label>
                    <span>E-mail *</span>
                    <div className="input-wrap">
                      <Mail />
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com.br"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </label>
                  <label>
                    <span>Telefone *</span>
                    <div className="input-wrap">
                      <Phone />
                      <input
                        required
                        minLength={8}
                        type="tel"
                        autoComplete="tel"
                        placeholder="(11) 99999-9999"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </label>
                  <label>
                    <span>Tipo de imóvel *</span>
                    <div className="input-wrap">
                      <Building2 />
                      <select
                        required
                        value={form.property_type}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            property_type: e.target.value as LeadPayload['property_type'],
                          })
                        }
                      >
                        <option value="residencial">Residencial</option>
                        <option value="comercial">Comercial</option>
                        <option value="industrial">Industrial</option>
                      </select>
                    </div>
                  </label>
                </div>
                <label>
                  <span>Como podemos ajudar?</span>
                  <textarea
                    rows={5}
                    maxLength={3000}
                    placeholder="Conte brevemente sobre seu imóvel e a regularização necessária."
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </label>
                <button
                  className="button button-primary submit-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'ENVIANDO...' : 'SOLICITAR ATENDIMENTO'} <ArrowRight />
                </button>
                <p className="privacy-note">
                  <ShieldCheck /> Seus dados serão usados apenas para este atendimento.
                </p>
              </form>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Brand />
            <p>
              Engenharia consultiva com rigor técnico, proximidade e compromisso com cada decisão.
            </p>
          </div>
          <div>
            <h3>CONTATO</h3>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackWhatsAppClick('/#footer')}
            >
              <Phone /> 11 99906-1190
            </a>
            <p>
              <MapPin /> Atendimento em todo o Estado de São Paulo e Litoral Norte.
            </p>
          </div>
          <div>
            <h3>ATUAÇÃO</h3>
            <p>
              Engenharia consultiva com foco em segurança, conformidade e valorização de imóveis e
              empreendimentos.
            </p>
          </div>
          <div className="footer-links">
            <h3>NAVEGAÇÃO</h3>
            <a href="#empresa">A Empresa</a>
            <a href="#solucoes">Soluções</a>
            <a href="#processo">Nosso processo</a>
            <a href="#contato">Contato</a>
            <Link
              to="/admin/login"
              className="opacity-40 hover:opacity-100 transition text-[9px] uppercase tracking-wider text-slate-400"
            >
              Acesso Restrito
            </Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} AUREA ENGENHARIA CONSULTIVA. TODOS OS DIREITOS RESERVADOS.
          </span>
          <span>CREA-SP 5071494842</span>
        </div>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="floating-whatsapp"
        aria-label="Falar com a Aurea pelo WhatsApp"
        onClick={() => trackWhatsAppClick('/#floating-whatsapp')}
      >
        <MessageCircle />
        <span>WHATSAPP</span>
      </a>
    </div>
  )
}

export default Index
