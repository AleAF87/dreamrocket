import { useEffect, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  Eye,
  Globe,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Phone,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  User,
  X,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import {
  getVisits,
  dedupeVisits,
  formatLocation,
  normalizeCountry,
  type VisitRecord,
} from '@/services/visits'
import { getLeads, type LeadRecord } from '@/services/leads'

export function AdminVisits() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('todos')
  const [conversionFilter, setConversionFilter] = useState('todos')
  const [isDeduping, setIsDeduping] = useState(false)

  // Modal para exibir os leads do visitante associado
  const [selectedVisitForModal, setSelectedVisitForModal] = useState<{
    visit: VisitRecord
    leads: LeadRecord[]
  } | null>(null)

  /**
   * Executa a verificação e remoção de duplicados (mesmo IP no mesmo dia),
   * e em seguida recarrega os dados de visitas e leads para atualizar tabela e cards.
   */
  const fetchData = async () => {
    setLoading(true)
    setIsDeduping(true)
    try {
      // 1. Sempre verifica e remove duplicados ao acessar a tela e ao clicar em atualizar
      try {
        await dedupeVisits()
      } catch (dedupErr) {
        console.debug('Falha silenciosa na deduplicação prévia:', dedupErr)
      }

      // 2. Busca listagem de visitas e leads atualizados pós-limpeza
      const [visitsRes, leadsRes] = await Promise.allSettled([getVisits(1, 150), getLeads(1, 300)])

      if (visitsRes.status === 'fulfilled') {
        setVisits(visitsRes.value.items)
        setTotal(visitsRes.value.totalItems)
      }

      if (leadsRes.status === 'fulfilled') {
        setLeads(leadsRes.value.items)
      }
    } catch (err) {
      console.error('Erro ao carregar dados de visitas e leads:', err)
    } finally {
      setIsDeduping(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Mapa de Leads por IP
  const leadsByIp = leads.reduce<Record<string, LeadRecord[]>>((acc, lead) => {
    const ip = (lead.visitor_ip || '').trim()
    if (ip) {
      if (!acc[ip]) acc[ip] = []
      acc[ip].push(lead)
    }
    return acc
  }, {})

  // Visitas com conversão Lead (mesmo IP com pelo menos 1 lead registrado)
  const convertedVisits = visits.filter((v) => {
    const ip = (v.ip || '').trim()
    return Boolean(ip && leadsByIp[ip] && leadsByIp[ip].length > 0)
  })

  // Visitas com clique no WhatsApp
  const whatsappConvertedVisits = visits.filter((v) => Boolean(v.whatsapp_click))

  // Quantidade de conversões e taxas
  const conversionCount = convertedVisits.length
  const conversionRate = total > 0 ? ((conversionCount / total) * 100).toFixed(1) : '0.0'

  const whatsappCount = whatsappConvertedVisits.length
  const whatsappRate = total > 0 ? ((whatsappCount / total) * 100).toFixed(1) : '0.0'

  // Métricas agregadas simples
  const desktopCount = visits.filter((v) => (v.device || '').toLowerCase() === 'desktop').length
  const mobileCount = visits.filter((v) => (v.device || '').toLowerCase() === 'mobile').length
  const tabletCount = visits.filter((v) => (v.device || '').toLowerCase() === 'tablet').length

  // Cidades mais frequentes a partir das visitas carregadas
  const locationStats = visits.reduce<Record<string, number>>((acc, item) => {
    const loc = formatLocation(item.city, item.region, item.country)
    acc[loc] = (acc[loc] || 0) + 1
    return acc
  }, {})

  const topLocations = Object.entries(locationStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  // Filtros em memória
  const filteredVisits = visits.filter((item) => {
    const term = searchTerm.toLowerCase()
    const formattedLoc = formatLocation(item.city, item.region, item.country).toLowerCase()
    const itemIp = (item.ip || '').trim()
    const itemLeads = itemIp ? leadsByIp[itemIp] || [] : []
    const hasConversion = itemLeads.length > 0

    // Também permite buscar pelo nome ou telefone do lead associado ao IP
    const leadNames = itemLeads.map((l) => l.name.toLowerCase()).join(' ')
    const leadPhones = itemLeads.map((l) => l.phone.toLowerCase()).join(' ')

    const matchesSearch =
      formattedLoc.includes(term) ||
      (item.city && item.city.toLowerCase().includes(term)) ||
      (item.region && item.region.toLowerCase().includes(term)) ||
      (item.browser && item.browser.toLowerCase().includes(term)) ||
      (item.referrer && item.referrer.toLowerCase().includes(term)) ||
      (item.ip && item.ip.toLowerCase().includes(term)) ||
      leadNames.includes(term) ||
      leadPhones.includes(term)

    const matchesDevice =
      deviceFilter === 'todos' || (item.device || '').toLowerCase() === deviceFilter.toLowerCase()

    const hasWhatsAppClick = Boolean(item.whatsapp_click)
    const hasAnyConversion = hasConversion || hasWhatsAppClick

    const matchesConversion =
      conversionFilter === 'todos' ||
      (conversionFilter === 'converteu' && hasConversion) ||
      (conversionFilter === 'whatsapp' && hasWhatsAppClick) ||
      (conversionFilter === 'qualquer_conversao' && hasAnyConversion) ||
      (conversionFilter === 'sem_conversao' && !hasAnyConversion)

    return matchesSearch && matchesDevice && matchesConversion
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c2996b] uppercase tracking-widest">
              <Activity className="w-4 h-4" />
              <span>Telemetria & Tráfego</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-light text-white tracking-tight mt-1">
              Registro de Visitas Anônimas
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitoramento estatístico de tráfego em estrita conformidade com a LGPD (sem dados
              pessoais).
            </p>
            <p className="text-[11px] text-[#dfba8f]/80 mt-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 text-[#c2996b]" />
              <span>
                Precisão de localização no nível de cidade/UF (geolocalização aproximada por IP do
                provedor, sem identificação de rua ou bairro).
              </span>
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            title="Atualizar dados e verificar/remover registros duplicados"
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-[#151e2a] hover:bg-[#1f2b3b] border border-slate-700/80 rounded-sm transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isDeduping ? 'Verificando...' : 'Atualizar'}</span>
          </button>
        </div>

        {/* Métricas Rápidas incluindo Conversões Leads e WhatsApp */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-medium">
                Visitantes Únicos (IP/Dia)
              </span>
              <Globe className="w-3.5 h-3.5 text-[#c2996b]" />
            </div>
            <div className="text-2xl font-semibold text-white mt-1">{total}</div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {topLocations.length > 0 ? `Principal: ${topLocations[0][0]}` : 'Visitantes únicos'}
            </div>
          </div>

          {/* Card Resumo de Conversões Leads */}
          <div className="bg-[#0d1117] border border-emerald-500/30 p-4 rounded-sm bg-gradient-to-br from-[#0d1117] to-emerald-950/20">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[10px] uppercase tracking-wider font-medium">
                Conversões (Leads)
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-semibold text-emerald-300 mt-1 flex items-baseline gap-2">
              <span>{conversionCount}</span>
              <span className="text-xs font-normal text-emerald-400/80">({conversionRate}%)</span>
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-1 truncate">
              {conversionCount === 1
                ? '1 IP gerou formulário'
                : `${conversionCount} IPs geraram formulário`}
            </div>
          </div>

          {/* Card Resumo de Conversões WhatsApp */}
          <div className="bg-[#0d1117] border border-amber-600/40 p-4 rounded-sm bg-gradient-to-br from-[#0d1117] to-amber-950/25">
            <div className="flex items-center justify-between text-[#dfba8f]">
              <span className="text-[10px] uppercase tracking-wider font-medium">
                Conversões (WhatsApp)
              </span>
              <MessageCircle className="w-3.5 h-3.5 text-[#dfba8f]" />
            </div>
            <div className="text-2xl font-semibold text-[#f0d4b3] mt-1 flex items-baseline gap-2">
              <span>{whatsappCount}</span>
              <span className="text-xs font-normal text-[#dfba8f]/80">({whatsappRate}%)</span>
            </div>
            <div className="text-[10px] text-[#dfba8f]/70 mt-1 truncate">
              {whatsappCount === 1
                ? '1 visitante clicou no WhatsApp'
                : `${whatsappCount} visitantes clicaram`}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-medium">Desktop</span>
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-white mt-1">{desktopCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              {total > 0 ? `${Math.round((desktopCount / total) * 100)}% do tráfego` : '—'}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-medium">Mobile</span>
              <Smartphone className="w-3.5 h-3.5 text-[#dfba8f]" />
            </div>
            <div className="text-2xl font-semibold text-white mt-1">{mobileCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              {total > 0 ? `${Math.round((mobileCount / total) * 100)}% do tráfego` : '—'}
            </div>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] uppercase tracking-wider font-medium">
                Tablet / Outros
              </span>
              <Tablet className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-semibold text-white mt-1">{tabletCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">
              {total > 0 ? `${Math.round((tabletCount / total) * 100)}% do tráfego` : '—'}
            </div>
          </div>
        </div>

        {/* Resumo de Cidades Principais */}
        {topLocations.length > 0 && (
          <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-3.5 h-3.5 text-[#dfba8f]" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">
                Principais Cidades de Origem (Aproximação por IP)
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {topLocations.map(([locName, count]) => (
                <span
                  key={locName}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-sm bg-[#151e2a] border border-slate-700/80 text-white"
                >
                  <span className="font-medium">{locName}</span>
                  <span className="text-[10px] text-[#dfba8f] bg-[#070b10] px-1.5 py-0.2 rounded">
                    {count} {count === 1 ? 'acesso' : 'acessos'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filtros e Busca */}
        <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cidade, IP, navegador, nome do lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c2996b]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider">
                Conversão:
              </label>
              <select
                value={conversionFilter}
                onChange={(e) => setConversionFilter(e.target.value)}
                className="text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white px-2.5 py-1.5 focus:outline-none focus:border-[#c2996b]"
              >
                <option value="todos">Todas as Visitas</option>
                <option value="qualquer_conversao">Qualquer Conversão (Lead ou WhatsApp)</option>
                <option value="converteu">Apenas Leads (Formulário) ✓</option>
                <option value="whatsapp">Apenas WhatsApp ✓</option>
                <option value="sem_conversao">Sem Nenhuma Conversão</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider">
                Dispositivo:
              </label>
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white px-2.5 py-1.5 focus:outline-none focus:border-[#c2996b]"
              >
                <option value="todos">Todos</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela de Registros */}
        <div className="bg-[#0d1117] border border-slate-800 rounded-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Carregando registros de acessos...
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Nenhuma visita encontrada para os critérios informados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0f16] text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Última Visita</th>
                    <th className="py-3 px-4">Localização (IP Geolocation)</th>
                    <th className="py-3 px-4">Status / Conversão</th>
                    <th className="py-3 px-4">Dispositivo</th>
                    <th className="py-3 px-4">Navegador & SO</th>
                    <th className="py-3 px-4">Página</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4 text-right">IP & Lead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredVisits.map((v) => {
                    const lastVisitDate = v.updated || v.created
                    const cleanIp = (v.ip || '').trim()
                    const matchedLeads = cleanIp ? leadsByIp[cleanIp] || [] : []
                    const hasConverted = matchedLeads.length > 0

                    return (
                      <tr
                        key={v.id}
                        className={`transition ${
                          hasConverted && v.whatsapp_click
                            ? 'bg-gradient-to-r from-emerald-950/20 to-amber-950/20 hover:from-emerald-950/35 hover:to-amber-950/35'
                            : hasConverted
                              ? 'bg-emerald-950/15 hover:bg-emerald-950/30'
                              : v.whatsapp_click
                                ? 'bg-amber-950/15 hover:bg-amber-950/30'
                                : 'hover:bg-[#151e2a]/50'
                        }`}
                      >
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          <div className="font-medium text-white">
                            {new Date(lastVisitDate).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(lastVisitDate).toLocaleTimeString('pt-BR')}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-300">
                          <div className="font-medium text-white">
                            {formatLocation(v.city, v.region, v.country)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {normalizeCountry(v.country)}
                          </div>
                        </td>

                        {/* Indicador Visual Claro de Conversão (Lead e/ou WhatsApp) */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {hasConverted && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>Converteu ✓</span>
                                {matchedLeads.length > 1 && (
                                  <span className="bg-emerald-600/40 text-emerald-200 px-1 py-0.2 rounded text-[9px] font-bold">
                                    {matchedLeads.length}
                                  </span>
                                )}
                              </span>
                            )}

                            {v.whatsapp_click && (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold bg-amber-500/15 text-[#dfba8f] border border-amber-600/40 shadow-xs"
                                title={
                                  v.whatsapp_clicked_at
                                    ? `Clicou no WhatsApp em: ${new Date(v.whatsapp_clicked_at).toLocaleString('pt-BR')}`
                                    : 'Clicou no WhatsApp'
                                }
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-[#dfba8f] shrink-0" />
                                <span>WhatsApp ✓</span>
                              </span>
                            )}

                            {!hasConverted && !v.whatsapp_click && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-500 bg-slate-900 border border-slate-800">
                                <span>Apenas Visita</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {v.device === 'Mobile' ? (
                              <Smartphone className="w-3 h-3 text-[#dfba8f]" />
                            ) : (
                              <Monitor className="w-3 h-3 text-cyan-400" />
                            )}
                            <span>{v.device || 'Desktop'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          <div>{v.browser || 'Web'}</div>
                          <div className="text-[10px] text-slate-500">{v.os || ''}</div>
                        </td>

                        <td className="py-3 px-4 text-[#dfba8f] font-mono text-[11px] whitespace-nowrap">
                          {v.path || '/'}
                        </td>

                        <td
                          className="py-3 px-4 text-slate-400 text-[11px] max-w-[180px] truncate"
                          title={v.referrer}
                        >
                          {v.referrer || 'Direto'}
                        </td>

                        {/* IP + Botão Olho se tiver lead associado */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2.5">
                            <span className="text-slate-500 font-mono text-[10px]">
                              {v.ip ? `${v.ip.slice(0, 7)}***` : 'Anônimo'}
                            </span>

                            {hasConverted ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedVisitForModal({
                                    visit: v,
                                    leads: matchedLeads,
                                  })
                                }
                                title="Ver dados completos do lead (Converteu)"
                                aria-label="Ver dados do lead associado"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/60 rounded transition hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[11px]">Ver lead</span>
                              </button>
                            ) : (
                              <span className="w-16" />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal / Dialog de Detalhes dos Leads Associados à Visita (Botão Olho) */}
        {selectedVisitForModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-conversion-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div className="relative w-full max-w-xl bg-[#0d1117] border border-emerald-500/40 shadow-2xl rounded-sm p-6 text-white max-h-[90vh] flex flex-col">
              {/* Barra superior de destaque */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-[#c2996b] to-emerald-500" />

              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Visitante Converteu em Lead</span>
                  </div>
                  <h3 id="modal-conversion-title" className="text-lg font-light text-white mt-1">
                    Dados Completos do Lead ({selectedVisitForModal.leads.length})
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span>
                      IP:{' '}
                      <strong className="font-mono text-slate-300">
                        {selectedVisitForModal.visit.ip}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Origem:{' '}
                      <strong className="text-slate-300">
                        {formatLocation(
                          selectedVisitForModal.visit.city,
                          selectedVisitForModal.visit.region,
                          selectedVisitForModal.visit.country,
                        )}
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVisitForModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                  aria-label="Fechar janela"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de Leads (caso haja mais de um do mesmo IP) */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {selectedVisitForModal.leads.map((lead, idx) => {
                  const cleanPhone = lead.phone.replace(/\D/g, '')
                  const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                    `Olá ${lead.name}! Aqui é da Aurea Engenharia sobre sua solicitação para o imóvel ${lead.property_type}.`,
                  )}`

                  return (
                    <div
                      key={lead.id}
                      className="bg-[#151e2a] border border-slate-700/80 rounded-sm p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#dfba8f]" />
                          <span className="font-medium text-white text-sm">{lead.name}</span>
                          {selectedVisitForModal.leads.length > 1 && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {new Date(lead.created).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
                            Telefone / WhatsApp
                          </span>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-medium transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>{lead.phone}</span>
                            <span className="text-[10px] bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-700/50">
                              Chamar
                            </span>
                          </a>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
                            Tipo de Imóvel
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] capitalize bg-[#0d1117] text-[#dfba8f] border border-[#c2996b]/30">
                            {lead.property_type}
                          </span>
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-0.5">
                            E-mail
                          </span>
                          {lead.email.includes('@popup.aurea.com.br') ? (
                            <span className="text-[11px] text-slate-400 italic">
                              Contato via Popup de Diagnóstico Rápido
                            </span>
                          ) : (
                            <a
                              href={`mailto:${lead.email}`}
                              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{lead.email}</span>
                            </a>
                          )}
                        </div>

                        <div className="sm:col-span-2">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">
                            Mensagem / Solicitação
                          </span>
                          <div className="p-3 bg-[#0d1117] border border-slate-800 rounded-sm text-slate-200 text-xs leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {lead.message || '(Sem mensagem informada)'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Rodapé do Modal */}
              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Total de {selectedVisitForModal.leads.length}{' '}
                  {selectedVisitForModal.leads.length === 1 ? 'registro' : 'registros'} deste IP
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedVisitForModal(null)}
                  className="px-4 py-2 bg-[#151e2a] hover:bg-[#1f2b3b] text-white rounded-sm border border-slate-700 transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
