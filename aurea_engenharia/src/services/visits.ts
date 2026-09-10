import pb from '@/lib/pocketbase/client'

export interface VisitRecord {
  id: string
  ip?: string
  city?: string
  region?: string
  country?: string
  device?: string
  browser?: string
  os?: string
  path?: string
  referrer?: string
  user_agent?: string
  screen_resolution?: string
  whatsapp_click?: boolean
  whatsapp_clicked_at?: string
  created: string
  updated: string
}

export interface VisitPayload {
  ip?: string
  city?: string
  region?: string
  country?: string
  device?: string
  browser?: string
  os?: string
  path?: string
  referrer?: string
  user_agent?: string
  screen_resolution?: string
  whatsapp_click?: boolean
  whatsapp_clicked_at?: string
}

function detectDevice(): string {
  const ua = navigator.userAgent.toLowerCase()
  if (/mobile|android|iphone|ipad|ipod|windows phone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) return 'Tablet'
    return 'Mobile'
  }
  return 'Desktop'
}

function detectBrowser(): string {
  const ua = navigator.userAgent
  if (/edg/i.test(ua)) return 'Edge'
  if (/chrome|crios/i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari'
  if (/opera|opr/i.test(ua)) return 'Opera'
  return 'Navegador Web'
}

function detectOS(): string {
  const ua = navigator.userAgent
  if (/windows/i.test(ua)) return 'Windows'
  if (/macintosh|mac os x/i.test(ua)) return 'macOS'
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/linux/i.test(ua)) return 'Linux'
  return 'Outro'
}

/**
 * Normaliza o nome do país para português ("Brasil") quando for Brasil/Brazil
 */
export function normalizeCountry(country?: string): string {
  if (!country) return 'Brasil'
  const trimmed = country.trim()
  if (/^(brazil|brasil|br)$/i.test(trimmed)) {
    return 'Brasil'
  }
  return trimmed
}

/**
 * Mapeia nomes de estados e códigos brasileiros para a sigla UF padrão (ex: "Sao Paulo" -> "SP").
 */
const BRAZIL_STATE_UFS: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  'espírito santo': 'ES',
  goias: 'GO',
  goiás: 'GO',
  maranhao: 'MA',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  pará: 'PA',
  paraiba: 'PB',
  paraíba: 'PB',
  parana: 'PR',
  paraná: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
}

const VALID_UFS = new Set([
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
])

/**
 * Remove acentuação e converte para minúsculas para correspondência flexível.
 */
function normalizeKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * Converte o nome ou código de estado em sigla (UF), se reconhecido.
 */
export function getStateUf(region?: string): string {
  if (!region) return ''
  const trimmed = region.trim()
  const upper = trimmed.toUpperCase()
  if (VALID_UFS.has(upper)) {
    return upper
  }
  const key = normalizeKey(trimmed)
  return BRAZIL_STATE_UFS[key] || trimmed
}

/**
 * Normaliza nomes de cidades muito frequentes para correta acentuação (ex: Sao Paulo -> São Paulo).
 */
export function normalizeCity(city?: string): string {
  if (!city) return ''
  const trimmed = city.trim()
  const key = normalizeKey(trimmed)
  if (key === 'sao paulo') return 'São Paulo'
  if (key === 'rio de janeiro') return 'Rio de Janeiro'
  if (key === 'brasilia') return 'Brasília'
  if (key === 'curitiba') return 'Curitiba'
  if (key === 'belo horizonte') return 'Belo Horizonte'
  if (key === 'porto alegre') return 'Porto Alegre'
  if (key === 'salvador') return 'Salvador'
  if (key === 'fortaleza') return 'Fortaleza'
  if (key === 'recife') return 'Recife'
  if (key === 'florianopolis') return 'Florianópolis'
  if (key === 'goiania') return 'Goiânia'
  if (key === 'santos') return 'Santos'
  if (key === 'campinas') return 'Campinas'
  if (key === 'sao jose dos campos') return 'São José dos Campos'
  if (key === 'santo andre') return 'Santo André'
  if (key === 'sao bernardo do campo') return 'São Bernardo do Campo'
  if (key === 'guarulhos') return 'Guarulhos'
  if (key === 'osasco') return 'Osasco'
  if (key === 'sorocaba') return 'Sorocaba'
  if (key === 'ribeirao preto') return 'Ribeirão Preto'
  return trimmed
}

/**
 * Formata a localização amigável no formato "São Paulo – SP".
 * Caso city esteja vazio, retorna "Não identificada".
 */
export function formatLocation(city?: string, region?: string, country?: string): string {
  const normCity = normalizeCity(city)
  if (!normCity) {
    return 'Não identificada'
  }

  const uf = getStateUf(region)
  const normCountry = normalizeCountry(country)

  // Se for Brasil ou não informado, mostra "Cidade – UF" ou só a cidade
  if (normCountry === 'Brasil') {
    if (uf) {
      return `${normCity} – ${uf}`
    }
    return normCity
  }

  // Se for país estrangeiro, exibe "Cidade, País"
  if (region && region.trim()) {
    return `${normCity}, ${region} (${normCountry})`
  }
  return `${normCity} (${normCountry})`
}

interface GeoResult {
  ip: string
  city: string
  region: string
  country: string
}

/**
 * Tenta obter geolocalização aproximada por IP via ipapi.co.
 * Timeout curto de 2s.
 */
async function fetchFromIpapi(): Promise<GeoResult | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2000)
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.error) return null

    const city = (data.city || '').trim()
    const ip = (data.ip || '').trim()
    if (!city && !ip) return null

    return {
      ip,
      city,
      region: (data.region || data.region_code || '').trim(),
      country: normalizeCountry(data.country_name || data.country),
    }
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

/**
 * Serviço fallback gratuito de geolocalização com suporte HTTPS (ipwho.is).
 * Timeout curto de 2s.
 */
async function fetchFromIpwhois(): Promise<GeoResult | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2000)
  try {
    const res = await fetch('https://ipwho.is/', {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    const data = await res.json()
    // ipwho.is retorna { success: true, ip, city, region, region_code, country, ... }
    if (!data || data.success === false) return null

    const city = (data.city || '').trim()
    const ip = (data.ip || '').trim()
    if (!city && !ip) return null

    return {
      ip,
      city,
      region: (data.region || data.region_code || '').trim(),
      country: normalizeCountry(data.country),
    }
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

let cachedGeo: GeoResult | null = null

/**
 * Obtém a geolocalização de forma resiliente, tentando o serviço primário
 * e fazendo fallback automático caso falhe ou retorne vazio.
 */
export async function getApproximateLocation(): Promise<GeoResult> {
  // Tenta restaurar da memória ou do sessionStorage se existir na sessão atual
  if (cachedGeo && (cachedGeo.city || cachedGeo.ip)) {
    return cachedGeo
  }

  try {
    const storedIp = sessionStorage.getItem('aurea_client_ip')
    if (storedIp && !cachedGeo) {
      cachedGeo = { ip: storedIp, city: '', region: '', country: 'Brasil' }
    }
  } catch {
    /* intentionally ignored */
  }

  // Tentativa primária: ipapi.co
  const primary = await fetchFromIpapi()
  if (primary && (primary.city || primary.ip)) {
    cachedGeo = primary
    try {
      if (primary.ip) sessionStorage.setItem('aurea_client_ip', primary.ip)
    } catch {
      /* intentionally ignored */
    }
    return primary
  }

  // Tentativa de fallback: ipwho.is
  const fallback = await fetchFromIpwhois()
  if (fallback && (fallback.city || fallback.ip)) {
    cachedGeo = fallback
    try {
      if (fallback.ip) sessionStorage.setItem('aurea_client_ip', fallback.ip)
    } catch {
      /* intentionally ignored */
    }
    return fallback
  }

  if (cachedGeo && cachedGeo.ip) {
    return cachedGeo
  }

  return {
    ip: '',
    city: '',
    region: '',
    country: 'Brasil',
  }
}

/**
 * Obtém o IP público aproximado atual do visitante (usando cache local se já resolvido).
 */
export async function getVisitorIp(): Promise<string> {
  try {
    const geo = await getApproximateLocation()
    return geo.ip ? geo.ip.trim() : ''
  } catch {
    return ''
  }
}

/**
 * Registra a visita de forma anônima e assíncrona, sem bloquear a interface.
 * Obtém geolocalização aproximada por IP via serviços públicos gratuitos resilientes com timeout rápido.
 */
// Semáforo em memória para evitar corrida se trackVisit / trackWhatsAppClick forem disparados simultaneamente
let trackOperationInProgress: Promise<void> | null = null

export async function trackVisit(customPath?: string): Promise<void> {
  // Enfileira a operação se houver outra em andamento para evitar race condition na criação
  if (trackOperationInProgress) {
    try {
      await trackOperationInProgress
    } catch {
      /* ignore */
    }
  }

  const op = (async () => {
    try {
      // Evita loop ou registro duplicado muito rápido na mesma sessão para a mesma rota
      const currentPath = customPath || window.location.pathname || '/'
      const sessionKey = `aurea_visit_${currentPath}`
      const lastTracked = sessionStorage.getItem(sessionKey)
      if (lastTracked && Date.now() - Number(lastTracked) < 60000) {
        // Já registrou este caminho nos últimos 60 segundos nesta sessão
        return
      }
      sessionStorage.setItem(sessionKey, String(Date.now()))

      // Busca localização com fallback e timeouts de 2s
      const geo = await getApproximateLocation()

      const detectedIp = (geo.ip || '').trim().slice(0, 80)
      const detectedCity = (geo.city || '').trim().slice(0, 120)
      const detectedRegion = (geo.region || '').trim().slice(0, 120)
      const detectedCountry = normalizeCountry(geo.country).slice(0, 120)
      const detectedDevice = detectDevice()
      const detectedBrowser = detectBrowser()
      const detectedOs = detectOS()
      const detectedReferrer = (document.referrer || 'Direto').slice(0, 500)
      const detectedUserAgent = (navigator.userAgent || '').slice(0, 500)
      const detectedResolution = `${window.screen.width}x${window.screen.height}`

      // 1. Deduplicação por IP + dia (chave primária) ou fallback por user_agent + device + screen_resolution
      const now = new Date()
      // Janela UTC e local para cobrir fuso horário brasileiro (UTC-3)
      const todayIsoPrefix = now.toISOString().substring(0, 10)
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
      const startWindow = yesterday.toISOString().replace('T', ' ').substring(0, 19)

      let existingVisit: VisitRecord | null = null

      if (detectedIp) {
        // 1.1 IP identificado: buscar visitas do dia corrente
        // Busca com filtro simples de data recente e compara IP e dia em memória (100% à prova de IPv6 com dois-pontos)
        try {
          const listRes = await pb.collection('visits').getList<VisitRecord>(1, 100, {
            filter: `created >= "${startWindow}"`,
            sort: '-created',
          })

          const matched = listRes.items.find((item) => {
            const sameIp = (item.ip || '').trim().toLowerCase() === detectedIp.toLowerCase()
            const itemDay = (item.created || '').substring(0, 10)
            return sameIp && itemDay === todayIsoPrefix
          })
          if (matched) {
            existingVisit = matched
          }
        } catch (err) {
          console.debug('[Visit Tracker IP Dedup]', err)
        }
      } else {
        // 1.2 Visitante SEM IP identificado:
        // Fallback de dedup para o mesmo dia pelo trio: user_agent + device + screen_resolution
        try {
          const listRes = await pb.collection('visits').getList<VisitRecord>(1, 100, {
            filter: `created >= "${startWindow}"`,
            sort: '-created',
          })

          const matched = listRes.items.find((item) => {
            const hasNoIp = !(item.ip && item.ip.trim() !== '')
            const itemDay = (item.created || '').substring(0, 10)
            const sameDevice =
              (item.device || '').trim().toLowerCase() === detectedDevice.toLowerCase()
            const sameResolution =
              (item.screen_resolution || '').trim() === detectedResolution.trim()
            const sameUa = (item.user_agent || '').trim() === detectedUserAgent.trim()
            return hasNoIp && itemDay === todayIsoPrefix && sameDevice && sameResolution && sameUa
          })

          if (matched) {
            existingVisit = matched
          }
        } catch (err) {
          console.debug('[Visit Tracker Anonymous Fallback Dedup]', err)
        }
      }

      if (existingVisit) {
        // Atualiza o registro existente:
        // - Atualiza caminho recente, dispositivo/navegador atual
        // - Enriquecimento de IP/city/region/country se estavam vazios e agora foram resolvidos
        const updatePayload: Partial<VisitPayload> = {
          path: currentPath.slice(0, 300),
          device: detectedDevice,
          browser: detectedBrowser,
          os: detectedOs,
          screen_resolution: detectedResolution,
        }

        if (detectedIp && (!existingVisit.ip || existingVisit.ip.trim() === '')) {
          updatePayload.ip = detectedIp
        }
        if (detectedReferrer && detectedReferrer !== 'Direto') {
          updatePayload.referrer = detectedReferrer
        }
        if (detectedCity && (!existingVisit.city || existingVisit.city.trim() === '')) {
          updatePayload.city = detectedCity
        }
        if (detectedRegion && (!existingVisit.region || existingVisit.region.trim() === '')) {
          updatePayload.region = detectedRegion
        }
        if (detectedCountry && (!existingVisit.country || existingVisit.country.trim() === '')) {
          updatePayload.country = detectedCountry
        }

        await pb.collection('visits').update(existingVisit.id, updatePayload)
        return
      }

      const payload: VisitPayload = {
        ip: detectedIp,
        city: detectedCity,
        region: detectedRegion,
        country: detectedCountry,
        device: detectedDevice,
        browser: detectedBrowser,
        os: detectedOs,
        path: currentPath.slice(0, 300),
        referrer: detectedReferrer,
        user_agent: detectedUserAgent,
        screen_resolution: detectedResolution,
      }

      await pb.collection('visits').create(payload)
    } catch (err) {
      // Não interrompe nada caso a gravação de visita falhe (ex: adblocker ou offline)
      console.debug('[Visit Tracker]', err)
    }
  })()

  trackOperationInProgress = op
  await op
}

/**
 * Registra o clique em qualquer link/botão para o WhatsApp.
 * Localiza ou cria a visita do IP para o dia atual e adiciona whatsapp_click = true e whatsapp_clicked_at.
 * NUNCA lança erro nem bloqueia o visitante.
 */
export async function trackWhatsAppClick(customPath?: string): Promise<void> {
  // Aguarda trackVisit em andamento para evitar criar novo registro concorrente
  if (trackOperationInProgress) {
    try {
      await trackOperationInProgress
    } catch {
      /* ignore */
    }
  }

  const op = (async () => {
    try {
      const currentPath = customPath || window.location.pathname || '/'
      const clickIso = new Date().toISOString()
      const detectedIp = await getVisitorIp()

      const now = new Date()
      const todayIsoPrefix = now.toISOString().substring(0, 10)
      const yesterday = new Date(Date.now() - 24 * 3600 * 1000)
      const startWindow = yesterday.toISOString().replace('T', ' ').substring(0, 19)

      let existingWhatsAppVisit: VisitRecord | null = null

      if (detectedIp) {
        try {
          const existingList = await pb.collection('visits').getList<VisitRecord>(1, 100, {
            filter: `created >= "${startWindow}"`,
            sort: '-created',
          })

          const matched = existingList.items.find((item) => {
            const sameIp = (item.ip || '').trim().toLowerCase() === detectedIp.toLowerCase()
            const itemDay = (item.created || '').substring(0, 10)
            return sameIp && itemDay === todayIsoPrefix
          })
          if (matched) {
            existingWhatsAppVisit = matched
          }
        } catch (err) {
          console.debug('[WhatsApp Tracker Dedup Check]', err)
        }
      }

      if (existingWhatsAppVisit) {
        await pb.collection('visits').update(existingWhatsAppVisit.id, {
          whatsapp_click: true,
          whatsapp_clicked_at: clickIso,
        })
        return
      }

      // Se não encontrou registro do dia para o IP ou IP ainda não resolvido, cria o registro
      const geo = await getApproximateLocation()
      const effectiveIp = detectedIp || (geo.ip || '').trim().slice(0, 80)
      const detectedCity = (geo.city || '').trim().slice(0, 120)
      const detectedRegion = (geo.region || '').trim().slice(0, 120)
      const detectedCountry = normalizeCountry(geo.country).slice(0, 120)
      const detectedDevice = detectDevice()
      const detectedBrowser = detectBrowser()
      const detectedOs = detectOS()
      const detectedReferrer = (document.referrer || 'Direto').slice(0, 500)
      const detectedUserAgent = (navigator.userAgent || '').slice(0, 500)
      const detectedResolution = `${window.screen.width}x${window.screen.height}`

      // Verificação defensiva de última chance para anônimo ou IP recém descoberto
      try {
        const lastCheckList = await pb.collection('visits').getList<VisitRecord>(1, 100, {
          filter: `created >= "${startWindow}"`,
          sort: '-created',
        })
        const matchedLast = lastCheckList.items.find((item) => {
          const itemDay = (item.created || '').substring(0, 10)
          if (itemDay !== todayIsoPrefix) return false
          if (effectiveIp) {
            return (item.ip || '').trim().toLowerCase() === effectiveIp.toLowerCase()
          }
          const hasNoIp = !(item.ip && item.ip.trim() !== '')
          const sameDevice =
            (item.device || '').trim().toLowerCase() === detectedDevice.toLowerCase()
          const sameResolution = (item.screen_resolution || '').trim() === detectedResolution.trim()
          const sameUa = (item.user_agent || '').trim() === detectedUserAgent.trim()
          return hasNoIp && sameDevice && sameResolution && sameUa
        })

        if (matchedLast) {
          await pb.collection('visits').update(matchedLast.id, {
            whatsapp_click: true,
            whatsapp_clicked_at: clickIso,
          })
          return
        }
      } catch {
        /* ignore */
      }

      const payload: VisitPayload = {
        ip: effectiveIp,
        city: detectedCity,
        region: detectedRegion,
        country: detectedCountry,
        device: detectedDevice,
        browser: detectedBrowser,
        os: detectedOs,
        path: currentPath.slice(0, 300),
        referrer: detectedReferrer,
        user_agent: detectedUserAgent,
        screen_resolution: detectedResolution,
        whatsapp_click: true,
        whatsapp_clicked_at: clickIso,
      }

      await pb.collection('visits').create(payload)
    } catch (err) {
      // Falha silenciosa para nunca quebrar o clique do usuário
      console.debug('[WhatsApp Tracker]', err)
    }
  })()

  trackOperationInProgress = op
  await op
}

/**
 * Busca listagem de visitas (requer login com nível 1)
 */
/**
 * Executa a deduplicação de visitas no backend:
 * 1. Tenta chamar o endpoint customizado do hook /api/custom/dedupe-visits (operações atômicas em SQL no PB)
 * 2. Em caso de falha ou fallback de ambiente, faz deduplicação em memória via SDK da collection 'visits'
 *
 * Regras:
 * - Agrupa por IP + Dia (ou user_agent + device + screen_resolution + Dia para anônimos)
 * - Preserva o registro mais recente (por created) de cada grupo
 * - Propaga whatsapp_click = true e whatsapp_clicked_at para o registro preservado caso algum duplicado tenha clicado
 * - Remove todas as duplicatas mais antigas do banco
 *
 * Retorna a quantidade de registros duplicados removidos.
 */
export async function dedupeVisits(): Promise<{ removedCount: number }> {
  // 1. Tenta endpoint customizado do hook primeiro
  try {
    const res = await pb.send<{ success: boolean; message?: string }>('/api/custom/dedupe-visits', {
      method: 'POST',
    })
    if (res && res.success) {
      return { removedCount: 0 }
    }
  } catch (err) {
    console.debug('[dedupeVisits] Endpoint hook falhou ou indisponível, usando fallback SDK:', err)
  }

  // 2. Fallback resiliente via SDK (executado no cliente autenticado como admin)
  let removedCount = 0
  try {
    // Busca até 500 visitas mais recentes para verificar duplicatas
    const allVisits = await pb.collection('visits').getFullList<VisitRecord>({
      sort: '-created',
    })

    // Mapeia por chave única:
    // Se IP presente: `ip:${normalizedIp}::day:${day}`
    // Se sem IP: `anon:${ua}::${dev}::${res}::day:${day}`
    const groups = new Map<string, VisitRecord[]>()

    for (const v of allVisits) {
      const createdStr = v.created || ''
      const day = createdStr.substring(0, 10)
      const ip = (v.ip || '').trim().toLowerCase()

      let key = ''
      if (ip) {
        key = `ip:${ip}::day:${day}`
      } else {
        const ua = (v.user_agent || '').trim().toLowerCase()
        const dev = (v.device || '').trim().toLowerCase()
        const res = (v.screen_resolution || '').trim()
        key = `anon:${ua}::${dev}::${res}::day:${day}`
      }

      const list = groups.get(key) || []
      list.push(v)
      groups.set(key, list)
    }

    // Para cada grupo com mais de 1 registro, preserva o mais recente e remove os demais
    for (const [_groupKey, records] of groups.entries()) {
      if (records.length <= 1) continue

      // Ordena por created decrescente: o primeiro é o mais recente
      records.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      const [newest, ...duplicates] = records

      // Se algum duplicado tem whatsapp_click = true e o newest não tem, mescla
      const anyWhatsApp = records.find((r) => r.whatsapp_click)
      if (anyWhatsApp && !newest.whatsapp_click) {
        try {
          await pb.collection('visits').update(newest.id, {
            whatsapp_click: true,
            whatsapp_clicked_at: anyWhatsApp.whatsapp_clicked_at || newest.created,
          })
          newest.whatsapp_click = true
        } catch (e) {
          console.debug('[dedupeVisits SDK merge WA error]', e)
        }
      }

      // Remove as duplicatas
      for (const dup of duplicates) {
        try {
          await pb.collection('visits').delete(dup.id)
          removedCount++
        } catch (delErr) {
          console.debug('[dedupeVisits SDK delete error]', delErr)
        }
      }
    }
  } catch (err) {
    console.error('[dedupeVisits SDK Fallback]', err)
  }

  return { removedCount }
}

export async function getVisits(page = 1, perPage = 50) {
  return pb.collection('visits').getList<VisitRecord>(page, perPage, {
    sort: '-updated',
  })
}

/**
 * Estatísticas resumidas de visitas
 */
export async function getVisitStats() {
  const result = await pb.collection('visits').getList<VisitRecord>(1, 200, {
    sort: '-updated',
  })

  const total = result.totalItems
  const items = result.items

  const deviceCounts: Record<string, number> = {}
  const cityCounts: Record<string, number> = {}
  let whatsappClicks = 0

  items.forEach((item) => {
    const dev = item.device || 'Outro'
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1

    const loc = formatLocation(item.city, item.region, item.country)
    cityCounts[loc] = (cityCounts[loc] || 0) + 1

    if (item.whatsapp_click) {
      whatsappClicks += 1
    }
  })

  return {
    total,
    items,
    whatsappClicks,
    deviceCounts,
    cityCounts,
  }
}
