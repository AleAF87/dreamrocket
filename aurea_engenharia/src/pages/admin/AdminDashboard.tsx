import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  Globe,
  Layers,
  Lock,
  Phone,
  Shield,
  Smartphone,
  TrendingUp,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getCurrentUser } from '@/services/auth'
import { getLeads } from '@/services/leads'
import { getVisits } from '@/services/visits'
import { getUsers } from '@/services/users'

export function AdminDashboard() {
  const user = getCurrentUser()
  const accessLevel = user?.access_level ?? 1
  const isLevel1 = accessLevel === 1

  const [totalLeads, setTotalLeads] = useState<number | null>(null)
  const [totalVisits, setTotalVisits] = useState<number | null>(null)
  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      if (!isLevel1) {
        setLoading(false)
        return
      }
      try {
        const [leadsRes, visitsRes, usersRes] = await Promise.allSettled([
          getLeads(1, 5),
          getVisits(1, 1),
          getUsers(1, 1),
        ])

        if (leadsRes.status === 'fulfilled') {
          setTotalLeads(leadsRes.value.totalItems)
          setRecentLeads(leadsRes.value.items)
        }
        if (visitsRes.status === 'fulfilled') {
          setTotalVisits(visitsRes.value.totalItems)
        }
        if (usersRes.status === 'fulfilled') {
          setTotalUsers(usersRes.value.totalItems)
        }
      } catch (err) {
        console.error('Erro ao carregar dados do painel:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [isLevel1])

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Banner de Boas-Vindas */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0d1520] via-[#111c2a] to-[#0d1520] border border-[#c2996b]/30 rounded-sm p-6 sm:p-8">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#c2996b]/10 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[#c2996b]/15 text-[#dfba8f] text-[10px] font-semibold tracking-wider uppercase mb-3 border border-[#c2996b]/30">
              <Shield className="w-3.5 h-3.5" />
              <span>
                Nível de Acesso {accessLevel} {isLevel1 ? '— Acesso Total' : '— Painel Básico'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
              Olá, <span className="font-medium text-[#dfba8f]">{user?.name || user?.email}</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Bem-vindo ao centro administrativo da{' '}
              <strong className="text-white">Aurea Engenharia Consultiva</strong>.
              {isLevel1
                ? ' Você tem permissão de Nível 1 para visualizar dados de leads/solicitações e o monitoramento em tempo real de acessos anônimos.'
                : ' Seu acesso atual é de Nível ' +
                  accessLevel +
                  '. Você pode visualizar as diretrizes gerais deste painel. Ferramentas adicionais serão liberadas conforme sua escala de permissão.'}
            </p>
          </div>
        </div>

        {/* Bloco condicional para Nível 1 vs Nível 2/3 */}
        {isLevel1 ? (
          <>
            {/* Cards de Métricas em Destaque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-[#0d1117] border border-slate-800 p-5 rounded-sm hover:border-[#c2996b]/40 transition">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Gestão de Níveis
                  </span>
                  <div className="p-2 rounded-sm bg-[#c2996b]/10 text-[#dfba8f]">
                    <UserCog className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-semibold text-white">
                  {loading ? '—' : (totalUsers ?? 0)}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#dfba8f]" />
                  <span>Usuários cadastrados no sistema</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <Link
                    to="/admin/niveis"
                    className="inline-flex items-center gap-1.5 text-xs text-[#dfba8f] hover:text-white transition font-medium"
                  >
                    <span>Gerenciar níveis de acesso</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="bg-[#0d1117] border border-slate-800 p-5 rounded-sm hover:border-[#c2996b]/40 transition">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Solicitações de Atendimento
                  </span>
                  <div className="p-2 rounded-sm bg-[#c2996b]/10 text-[#dfba8f]">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-semibold text-white">
                  {loading ? '—' : (totalLeads ?? 0)}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cadastrados via formulário e popup</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <Link
                    to="/admin/leads"
                    className="inline-flex items-center gap-1.5 text-xs text-[#dfba8f] hover:text-white transition font-medium"
                  >
                    <span>Ver todas as solicitações</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="bg-[#0d1117] border border-slate-800 p-5 rounded-sm hover:border-[#c2996b]/40 transition">
                <div className="flex items-center justify-between text-slate-400 mb-3">
                  <span className="text-xs uppercase tracking-wider font-medium">
                    Registro de Visitas
                  </span>
                  <div className="p-2 rounded-sm bg-cyan-500/10 text-cyan-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-semibold text-white">
                  {loading ? '—' : (totalVisits ?? 0)}
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Acessos registrados de forma anônima</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <Link
                    to="/admin/visitas"
                    className="inline-flex items-center gap-1.5 text-xs text-[#dfba8f] hover:text-white transition font-medium"
                  >
                    <span>Ver relatório de tráfego</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Ações Rápidas e Últimas Solicitações */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Últimas Solicitações */}
              <div className="lg:col-span-2 bg-[#0d1117] border border-slate-800 rounded-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                      Últimas Solicitações Recebidas
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Leads mais recentes que aguardam retorno
                    </p>
                  </div>
                  <Link
                    to="/admin/leads"
                    className="text-xs text-[#dfba8f] hover:underline flex items-center gap-1"
                  >
                    <span>Ver todos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Carregando solicitações...
                  </div>
                ) : recentLeads.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-sm">
                    Nenhuma solicitação recebida até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-medium uppercase text-[10px] tracking-wider">
                          <th className="pb-3">Nome</th>
                          <th className="pb-3">Telefone</th>
                          <th className="pb-3">Tipo Imóvel</th>
                          <th className="pb-3 text-right">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {recentLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-[#151e2a]/50">
                            <td className="py-3 font-medium text-white">{lead.name}</td>
                            <td className="py-3 text-slate-300">
                              <a
                                href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#dfba8f] hover:underline"
                              >
                                <Phone className="w-3 h-3" /> {lead.phone}
                              </a>
                            </td>
                            <td className="py-3 text-slate-300 capitalize">{lead.property_type}</td>
                            <td className="py-3 text-right text-slate-400">
                              {new Date(lead.created).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Informações da Política de Acesso e E-mail */}
              <div className="bg-[#0d1117] border border-slate-800 rounded-sm p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                  Parâmetros de Gestão
                </h2>

                <div className="p-3 rounded-sm bg-[#151e2a] border border-[#c2996b]/20 text-xs space-y-2">
                  <div className="font-medium text-[#dfba8f] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Hierarquia por Nível
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    <strong>Nível 1:</strong> Acesso irrestrito a solicitações de clientes e
                    telemetria de visitas.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <strong>Nível 2 e 3:</strong> Acesso restrito ao painel básico. A liberação de
                    ferramentas é gerida no backend via campo <code>access_level</code>.
                  </p>
                </div>

                <div className="p-3 rounded-sm bg-[#151e2a] border border-slate-800 text-xs space-y-2">
                  <div className="font-medium text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#c2996b]" /> Notificação por E-mail (SMTP)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    O hook de envio de alerta para novos leads está preparado e protegido contra
                    falhas. Assim que o SMTP for configurado no servidor, os disparos ocorrerão
                    automaticamente para a caixa da engenharia.
                  </p>
                </div>

                <div className="p-3 rounded-sm bg-[#151e2a] border border-emerald-500/30 text-xs space-y-2">
                  <div className="font-medium text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Rastreamento de
                    Conversão
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Visitas anônimas são vinculadas a leads pelo mesmo IP. Acesse{' '}
                    <Link
                      to="/admin/visitas"
                      className="text-[#dfba8f] hover:underline font-medium"
                    >
                      Registro de Visitas
                    </Link>{' '}
                    para visualizar os visitantes convertidos e clicar no ícone de olho para
                    inspecionar os contatos.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Visão para Nível 2 e Nível 3 (sem ferramentas) */
          <div className="bg-[#0d1117] border border-slate-800 rounded-sm p-8 text-center max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center border border-slate-700">
              <Layers className="w-7 h-7 text-[#c2996b]" />
            </div>
            <h2 className="text-lg font-medium text-white">
              Painel Geral de Usuário (Nível {accessLevel})
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto">
              Sua conta está ativa no sistema da Aurea Engenharia. No momento, os módulos de
              <strong> Registro de Visitas</strong> e{' '}
              <strong>Solicitações de Atendimento (Leads)</strong> são restritos ao Nível 1.
            </p>
            <div className="p-4 rounded-sm bg-[#151e2a] border border-slate-800 text-left text-xs text-slate-300 space-y-2 max-w-md mx-auto">
              <div className="font-medium text-[#dfba8f] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Próximas Liberações:
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                <li>Módulo de Atendimento ao Cliente (Nível 2 em preparação)</li>
                <li>Módulo de Consulta de Documentos e Projetos (Nível 3 em preparação)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
