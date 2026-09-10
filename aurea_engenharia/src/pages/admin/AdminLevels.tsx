import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Eye,
  Info,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { getUsers, updateUserAccessLevel, type UserRecord } from '@/services/users'
import { getCurrentUser } from '@/services/auth'
import { useToast } from '@/hooks/use-toast'

export function AdminLevels() {
  const { toast } = useToast()
  const currentUser = getCurrentUser()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<'todos' | '1' | '2' | '3'>('todos')
  const [confirmModal, setConfirmModal] = useState<{
    user: UserRecord
    targetLevel: number
  } | null>(null)

  const fetchUsersList = async () => {
    setLoading(true)
    try {
      const res = await getUsers(1, 100)
      setUsers(res.items)
    } catch (err) {
      console.error('Erro ao carregar lista de usuários:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao carregar usuários',
        description: 'Verifique se você possui permissão de Nível 1 ativa.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsersList()
  }, [])

  const handleLevelChangeRequest = (user: UserRecord, newLevel: number) => {
    if (user.access_level === newLevel) return

    // Se estiver rebaixando a si mesmo de nível 1 para 2 ou 3, alerta de segurança
    if (user.id === currentUser?.id && newLevel > 1) {
      setConfirmModal({ user, targetLevel: newLevel })
      return
    }

    applyLevelChange(user, newLevel)
  }

  const applyLevelChange = async (user: UserRecord, newLevel: number) => {
    setUpdatingId(user.id)
    setConfirmModal(null)

    try {
      const updated = await updateUserAccessLevel(user.id, newLevel)
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, access_level: updated.access_level } : item,
        ),
      )

      toast({
        title: 'Nível de acesso atualizado!',
        description: `O usuário "${user.name || user.email}" agora possui Nível ${newLevel}.`,
      })
    } catch (err) {
      console.error('Erro ao atualizar nível:', err)
      toast({
        variant: 'destructive',
        title: 'Erro na atualização',
        description: 'Não foi possível alterar o nível no banco de dados. Tente novamente.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Filtragem
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))

    const matchesLevel = levelFilter === 'todos' || u.access_level === Number(levelFilter)

    return matchesSearch && matchesLevel
  })

  // Estatísticas rápidas
  const countL1 = users.filter((u) => u.access_level === 1).length
  const countL2 = users.filter((u) => u.access_level === 2).length
  const countL3 = users.filter((u) => u.access_level === 3).length

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c2996b] uppercase tracking-widest">
              <UserCog className="w-4 h-4" />
              <span>Controle de Privilégios</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-light text-white tracking-tight mt-1">
              Gestão de Níveis de Acesso
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Defina a hierarquia de permissões para os usuários do sistema. As alterações são
              gravadas imediatamente e refletem no acesso às ferramentas restritas.
            </p>
          </div>

          <button
            onClick={fetchUsersList}
            disabled={loading}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-[#151e2a] hover:bg-[#1f2b3b] border border-slate-700/80 rounded-sm transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar lista</span>
          </button>
        </div>

        {/* Guia de Níveis e Contadores Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0d1117] border border-[#c2996b]/30 p-4 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#dfba8f]" />
                <span className="text-xs uppercase tracking-wider font-semibold text-[#dfba8f]">
                  Nível 1 — Administrador Pleno
                </span>
              </div>
              <span className="text-xs font-bold text-white bg-[#151e2a] px-2 py-0.5 rounded border border-[#c2996b]/30">
                {countL1} {countL1 === 1 ? 'usuário' : 'usuários'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-300 leading-relaxed">
              Acesso irrestrito a todas as ferramentas: <strong>Gestão de Níveis</strong>,{' '}
              <strong>Registro de Visitas</strong>, <strong>Solicitações (Leads)</strong> e painel
              geral.
            </p>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-xs uppercase tracking-wider font-semibold text-cyan-300">
                  Nível 2 — Consultor Técnico
                </span>
              </div>
              <span className="text-xs font-bold text-white bg-[#151e2a] px-2 py-0.5 rounded border border-slate-700">
                {countL2} {countL2 === 1 ? 'usuário' : 'usuários'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Acesso ao painel geral básico e módulos operacionais. Não visualiza a gestão de níveis
              nem a telemetria restrita de visitas.
            </p>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
                  Nível 3 — Auditor / Visualizador
                </span>
              </div>
              <span className="text-xs font-bold text-white bg-[#151e2a] px-2 py-0.5 rounded border border-slate-700">
                {countL3} {countL3 === 1 ? 'usuário' : 'usuários'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Acesso de leitura restrito às diretrizes e relatórios gerais. Permissões de exclusão e
              administração bloqueadas.
            </p>
          </div>
        </div>

        {/* Barra de Filtros e Pesquisa */}
        <div className="bg-[#0d1117] border border-slate-800 p-4 rounded-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar usuário por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c2996b]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <label className="text-[11px] text-slate-400 uppercase tracking-wider">
              Filtrar Nível:
            </label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className="text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white px-2.5 py-1.5 focus:outline-none focus:border-[#c2996b]"
            >
              <option value="todos">Todos os Níveis ({users.length})</option>
              <option value="1">Nível 1 — Administrador ({countL1})</option>
              <option value="2">Nível 2 — Consultor ({countL2})</option>
              <option value="3">Nível 3 — Auditor ({countL3})</option>
            </select>
          </div>
        </div>

        {/* Tabela de Gestão de Usuários */}
        <div className="bg-[#0d1117] border border-slate-800 rounded-sm overflow-hidden shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-[#c2996b] animate-spin" />
              <span>Carregando usuários e níveis de permissão...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Nenhum usuário encontrado para os critérios de busca.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0a0f16] text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">E-mail Institucional</th>
                    <th className="py-3 px-4 text-center">Nível Atual</th>
                    <th className="py-3 px-4 text-center">Alterar Nível de Acesso</th>
                    <th className="py-3 px-4 text-right">Cadastrado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id
                    const isUpdating = updatingId === u.id

                    return (
                      <tr
                        key={u.id}
                        className={`transition ${
                          isSelf ? 'bg-[#151e2a]/40' : 'hover:bg-[#151e2a]/30'
                        }`}
                      >
                        {/* Usuário */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                                u.access_level === 1
                                  ? 'bg-[#c2996b]/20 text-[#dfba8f] border border-[#c2996b]/40'
                                  : u.access_level === 2
                                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {u.name?.[0]?.toUpperCase() || u.email[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-white flex items-center gap-2">
                                <span>{u.name || 'Sem nome informado'}</span>
                                {isSelf && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#c2996b]/20 text-[#dfba8f] border border-[#c2996b]/30">
                                    Sua conta
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">ID: {u.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* E-mail */}
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span>{u.email}</span>
                          </div>
                        </td>

                        {/* Nível Atual Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-semibold tracking-wide ${
                              u.access_level === 1
                                ? 'bg-[#c2996b]/20 text-[#dfba8f] border border-[#c2996b]/40 shadow-sm'
                                : u.access_level === 2
                                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>NÍVEL {u.access_level}</span>
                          </span>
                        </td>

                        {/* Botões de Alteração Rápida */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center p-1 bg-[#0a0f16] border border-slate-800 rounded-sm gap-1">
                            {([1, 2, 3] as const).map((lvl) => {
                              const isActive = u.access_level === lvl
                              return (
                                <button
                                  key={lvl}
                                  onClick={() => handleLevelChangeRequest(u, lvl)}
                                  disabled={isActive || isUpdating}
                                  title={
                                    isActive ? `Já está no Nível ${lvl}` : `Mudar para Nível ${lvl}`
                                  }
                                  className={`px-3 py-1 text-xs font-semibold rounded-sm transition flex items-center gap-1 cursor-pointer disabled:cursor-default ${
                                    isActive
                                      ? lvl === 1
                                        ? 'bg-[#c2996b] text-[#070b10] shadow-sm font-bold'
                                        : lvl === 2
                                          ? 'bg-cyan-500 text-[#070b10] font-bold'
                                          : 'bg-slate-600 text-white font-bold'
                                      : 'text-slate-400 hover:text-white hover:bg-[#151e2a]'
                                  } disabled:opacity-90`}
                                >
                                  {isUpdating && !isActive ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <span>Nível {lvl}</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </td>

                        {/* Data */}
                        <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap">
                          <div className="text-white">
                            {new Date(u.created).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(u.created).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
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

        {/* Modal de Confirmação para Auto-Rebaixamento */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="max-w-md w-full bg-[#0d1117] border border-amber-500/40 rounded-sm p-6 text-white space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-full bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                    Confirmação de Segurança
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Você está alterando sua própria conta
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Você está prestes a rebaixar seu próprio perfil para o{' '}
                <strong className="text-amber-400">Nível {confirmModal.targetLevel}</strong>. Ao
                fazer isso, você perderá o acesso imediato à esta tela de Gestão de Níveis e aos
                módulos de Visitas e Leads.
              </p>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-200">
                Você só poderá retornar ao Nível 1 através de outro administrador de Nível 1 ou
                conta de teste.
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 text-xs bg-[#151e2a] hover:bg-[#1f2b3b] text-slate-300 rounded-sm border border-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => applyLevelChange(confirmModal.user, confirmModal.targetLevel)}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-sm shadow transition"
                >
                  Confirmar Alteração
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
