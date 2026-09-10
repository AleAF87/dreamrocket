import pb from '@/lib/pocketbase/client'
import { getVisitorIp } from '@/services/visits'

export type PropertyType = 'residencial' | 'comercial' | 'industrial'

export interface LeadPayload {
  name: string
  email: string
  phone: string
  property_type: PropertyType
  message: string
  visitor_ip?: string
}

export interface LeadRecord {
  id: string
  name: string
  email: string
  phone: string
  property_type: PropertyType
  message: string
  visitor_ip?: string
  created: string
  updated: string
}

export async function createLead(payload: LeadPayload) {
  // Se o visitor_ip não tiver sido passado explicitamente, busca o IP capturado pelo serviço de visitas
  let visitorIp = payload.visitor_ip
  if (!visitorIp) {
    try {
      visitorIp = await getVisitorIp()
    } catch {
      visitorIp = ''
    }
  }

  const finalPayload: LeadPayload = {
    ...payload,
    visitor_ip: visitorIp || undefined,
  }

  return pb.collection('leads').create<LeadRecord>(finalPayload)
}

/**
 * Busca leads com base no IP do visitante
 */
export async function getLeadsByIp(ip: string): Promise<LeadRecord[]> {
  if (!ip || !ip.trim()) return []
  try {
    const res = await pb.collection('leads').getList<LeadRecord>(1, 50, {
      filter: `visitor_ip = "${ip.trim()}"`,
      sort: '-created',
    })
    return res.items
  } catch (err) {
    console.error('Erro ao buscar leads por IP:', err)
    return []
  }
}

export async function getLeads(page = 1, perPage = 50) {
  return pb.collection('leads').getList<LeadRecord>(page, perPage, {
    sort: '-created',
  })
}

export async function deleteLead(id: string) {
  return pb.collection('leads').delete(id)
}
