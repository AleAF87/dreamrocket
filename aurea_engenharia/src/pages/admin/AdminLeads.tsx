import { useEffect, useState } from 'react'
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getLeads, deleteLead, type LeadRecord } from '@/services/leads'
import { useToast } from '@/hooks/use-toast'

export function AdminLeads() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('todos')
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await getLeads(1, 100)
      setLeads(res.items)
    } catch (err) {
      console.error('Erro ao carregar leads:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar solicitações',
        description: 'Verifique se seu usuário possui permissão de Nível 1.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deseja remover o registro de "${name}"?`)) return
    try {
      await deleteLead(id)
      setLeads((prev) => prev.filter((item) => item.id !== id))
      if (selectedLead?.id === id) {
        setSelectedLead(null)
      }
      toast({
        title: 'Registro removido',
        description: `A solicitação de ${name} foi excluída com sucesso.`,
      })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Não foi possível excluir',
        description: 'Tente novamente.',
      })
    }
  }

  const filteredLeads = leads.filter((item) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      item.name.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.phone.toLowerCase().includes(term) ||
      (item.message && item.message.toLowerCase().includes(term))

    const matchesProperty =
      propertyFilter === 'todos' ||
      item.property_type.toLowerCase() === propertyFilter.toLowerCase()

    return matchesSearch && matchesProperty
  })

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c2996b] uppercase tracking-widest">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Gestão de Oportunidades</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-light text-white tracking-tight mt-1">
              Solicitações de Atendimento (Leads)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Pessoas e empresas que solicitaram contato via formulário ou popup de conversão.
            </p>
          </div>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-[#151e2a] hover:bg-[#1f2b3b] border border-slate-700/80 rounded-sm transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c2996b]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <label className="text-[11px] text-slate-400 uppercase tracking-wider">
              Tipo de Imóvel:
            </label>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white px-2.5 py-1.5 focus:outline-none focus:border-[#c2996b]"
            >
              <option value="todos">Todos</option>
              <option value="residencial">Residencial</option>
              <option value="comercial">Comercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>
        </div>

        {/* Tabela de Leads */}
        <div className="bg-[#0d1117] border border-slate-800 rounded-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Carregando solicitações recebidas...
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Nenhuma solicitação encontrada para os filtros aplicados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0f16] text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Nome do Contato</th>
                    <th className="py-3 px-4">Telefone / WhatsApp</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Tipo Imóvel</th>
                    <th className="py-3 px-4">IP de Origem</th>
                    <th className="py-3 px-4">Mensagem</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLeads.map((item) => {
                    const cleanPhone = item.phone.replace(/\D/g, '')
                    const waLink = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                      `Olá ${item.name}! Aqui é da Aurea Engenharia Consultiva sobre sua solicitação para o imóvel ${item.property_type}.`,
                    )}`

                    return (
                      <tr key={item.id} className="hover:bg-[#151e2a]/50 transition">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          <div className="text-white font-medium">
                            {new Date(item.created).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(item.created).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium text-white whitespace-nowrap">
                          {item.name}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 transition text-xs font-medium"
                            title="Iniciar conversa no WhatsApp"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>{item.phone}</span>
                          </a>
                        </td>

                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {item.email.includes('@popup.aurea.com.br') ? (
                            <span className="text-[11px] text-slate-500 italic">Captura Popup</span>
                          ) : (
                            <a
                              href={`mailto:${item.email}`}
                              className="text-slate-300 hover:text-[#dfba8f] underline underline-offset-2 flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{item.email}</span>
                            </a>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-[#151e2a] text-[#dfba8f] border border-[#c2996b]/30">
                            {item.property_type}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {item.visitor_ip ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px]">
                              {item.visitor_ip}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic text-[10px]">Não capturado</span>
                          )}
                        </td>

                        <td className="py-3 px-4 max-w-xs text-slate-300">
                          <p className="line-clamp-2 text-[11px] leading-relaxed">
                            {item.message || (
                              <span className="text-slate-500 italic">(Sem mensagem)</span>
                            )}
                          </p>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedLead(item)}
                              className="px-2 py-1 text-[11px] text-slate-300 hover:text-white bg-[#151e2a] hover:bg-slate-700 rounded transition border border-slate-700"
                              title="Ver detalhes"
                            >
                              Detalhes
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition"
                              title="Excluir lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Modal / Detalhe da Mensagem Completa */}
        {selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="max-w-md w-full bg-[#0d1117] border border-[#c2996b]/40 rounded-sm p-6 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Detalhes da Solicitação
                </h3>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Nome</span>
                  <div className="font-medium text-white text-sm">{selectedLead.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Telefone</span>
                    <a
                      href={`https://wa.me/55${selectedLead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#dfba8f] hover:underline"
                    >
                      {selectedLead.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Imóvel</span>
                    <div className="capitalize">{selectedLead.property_type}</div>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">E-mail</span>
                  <div>{selectedLead.email}</div>
                </div>
                {selectedLead.visitor_ip && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">
                      IP do Visitante
                    </span>
                    <div className="font-mono text-emerald-400 text-xs">
                      {selectedLead.visitor_ip}
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">
                    Mensagem completa
                  </span>
                  <div className="mt-1 p-3 bg-[#151e2a] border border-slate-800 rounded-sm text-slate-200 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {selectedLead.message || '(Sem mensagem)'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Data de Envio</span>
                  <div className="text-slate-400">
                    {new Date(selectedLead.created).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 text-xs bg-[#151e2a] hover:bg-[#1f2b3b] text-white border border-slate-700 rounded-sm transition"
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
