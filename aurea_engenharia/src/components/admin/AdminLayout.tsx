import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Building2,
  Eye,
  FileSpreadsheet,
  Flame,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldAlert,
  User,
  UserCog,
} from 'lucide-react'
import { getCurrentUser, logout } from '@/services/auth'
import { AureaLogo } from '@/components/AureaLogo'

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const user = getCurrentUser()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const accessLevel = user?.access_level ?? 1
  const isLevel1 = accessLevel === 1

  const navItems = [
    {
      label: 'Painel Geral',
      path: '/admin',
      icon: LayoutDashboard,
      accessible: true,
    },
    {
      label: 'Gestão de Níveis',
      path: '/admin/niveis',
      icon: UserCog,
      accessible: isLevel1,
      tag: isLevel1 ? undefined : 'Nível 1',
    },
    {
      label: 'Solicitações (Leads)',
      path: '/admin/leads',
      icon: FileSpreadsheet,
      accessible: isLevel1,
      tag: isLevel1 ? undefined : 'Nível 1',
    },
    {
      label: 'Registro de Visitas',
      path: '/admin/visitas',
      icon: Activity,
      accessible: isLevel1,
      tag: isLevel1 ? undefined : 'Nível 1',
    },
  ]

  return (
    <div className="min-h-screen bg-[#070b10] text-slate-100 flex flex-col selection:bg-[#c2996b] selection:text-[#070b10]">
      {/* Barra Superior Dark Luxury */}
      <header className="border-b border-[#c2996b]/20 bg-[#0d1117]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#dfba8f] transition"
              title="Voltar ao site público"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Site</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <Link
              to="/admin"
              className="flex items-center gap-2.5 group"
              title="Painel Administrativo"
            >
              <AureaLogo
                variant="card"
                height={38}
                className="py-1 px-2.5 !rounded-md"
                alt="AUREA Engenharia Consultiva"
              />
              <span className="hidden md:inline-block text-[9px] px-2 py-0.5 rounded bg-[#151e2a] border border-[#c2996b]/30 text-[#dfba8f] font-medium uppercase tracking-widest">
                Gestão
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2.5 bg-[#151e2a] px-3 py-1.5 rounded-sm border border-slate-800">
              <div className="w-6 h-6 rounded-full bg-[#c2996b]/20 text-[#dfba8f] flex items-center justify-center text-xs font-semibold">
                {user?.name?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5" />}
              </div>
              <div className="text-left text-xs">
                <div className="font-medium text-white truncate max-w-[140px]">
                  {user?.name || user?.email}
                </div>
                <div className="text-[10px] text-[#c2996b] flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Nível {accessLevel}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-sm transition border border-transparent hover:border-rose-500/20"
              title="Encerrar sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Subnavegação de Ferramentas */}
      <nav className="border-b border-slate-800/80 bg-[#0a0f16]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto gap-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            if (!item.accessible) {
              return (
                <div
                  key={item.path}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500 rounded-sm cursor-not-allowed opacity-60 select-none whitespace-nowrap"
                  title="Disponível apenas para Nível 1"
                >
                  <Icon className="w-4 h-4 text-slate-600" />
                  <span>{item.label}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.tag}
                  </span>
                </div>
              )
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-sm whitespace-nowrap transition border ${
                  isActive
                    ? 'bg-[#151e2a] text-[#dfba8f] border-[#c2996b]/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-[#111923] border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#c2996b]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Conteúdo da Página */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Rodapé Admin */}
      <footer className="border-t border-slate-900 bg-[#05080c] text-[11px] text-slate-500 py-4 text-center">
        AUREA ENGENHARIA CONSULTIVA — Painel de Gestão e Monitoramento Restrito.
      </footer>
    </div>
  )
}
