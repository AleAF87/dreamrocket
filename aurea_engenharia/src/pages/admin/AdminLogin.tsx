import { FormEvent, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { loginWithEmail, loginAsTestUser, isAuthenticated } from '@/services/auth'
import { AureaLogo } from '@/components/AureaLogo'

export function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [showOtherTestOptions, setShowOtherTestOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Se já autenticado, redireciona para /admin
  if (isAuthenticated()) {
    navigate('/admin', { replace: true })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await loginWithEmail(email, password)
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin'
      navigate(from, { replace: true })
    } catch {
      setError('Credenciais inválidas. Verifique seu e-mail e senha de acesso.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestLogin = async (level: 1 | 2 | 3 = 1) => {
    setError(null)
    setTestLoading(true)

    try {
      await loginAsTestUser(level)
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin'
      navigate(from, { replace: true })
    } catch {
      setError('Falha ao autenticar com a conta de teste. Tente novamente.')
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#070b10] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Luz ambiente Dark Luxury */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c2996b]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-[#dfba8f] transition mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao site público
          </Link>

          <div className="flex justify-center mb-4">
            <AureaLogo
              variant="card"
              height={64}
              className="py-2 px-5 shadow-lg border-[#c2996b]/40"
              alt="AUREA Engenharia Consultiva"
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#151e2a] border border-[#c2996b]/30 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#c2996b] animate-pulse" />
            <span className="text-slate-300 uppercase tracking-widest font-medium text-[10px]">
              Área Restrita à Gestão
            </span>
          </div>
        </div>

        <div className="bg-[#0d1117] border border-[#c2996b]/30 rounded-sm p-6 sm:p-8 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c2996b] to-transparent" />

          {error && (
            <div className="mb-5 p-3 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@aureaengenharia.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c2996b] focus:ring-1 focus:ring-[#c2996b]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Senha de acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#151e2a] border border-slate-700/80 rounded-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c2996b] focus:ring-1 focus:ring-[#c2996b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || testLoading}
              className="w-full mt-4 py-3 px-4 text-xs font-semibold tracking-wider uppercase text-[#0d1117] bg-gradient-to-r from-[#dbb386] to-[#c2996b] hover:brightness-110 active:scale-[0.99] transition rounded-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'AUTENTICANDO...' : 'ENTRAR NO PAINEL'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Divisor Visual */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#0d1117] px-2 text-slate-500 tracking-wider">
                Demonstração / Avaliação
              </span>
            </div>
          </div>

          {/* Botão de Acesso Teste Rápido */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleTestLogin(1)}
              disabled={loading || testLoading}
              className="w-full py-3 px-4 text-xs font-semibold tracking-wider uppercase text-[#dfba8f] bg-[#151e2a] hover:bg-[#1a2636] border border-[#c2996b]/40 hover:border-[#c2996b] transition rounded-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 group"
            >
              <Sparkles className="w-4 h-4 text-[#c2996b] group-hover:rotate-12 transition-transform" />
              <span>
                {testLoading ? 'Entrando com Acesso Teste...' : 'Acesso Teste à Área Restrita'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#c2996b]/20 text-[#dfba8f] border border-[#c2996b]/30 normal-case tracking-normal font-normal">
                Nível 1 Admin
              </span>
            </button>

            {/* Alternador para testar outros níveis (2 e 3) */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowOtherTestOptions(!showOtherTestOptions)}
                className="text-[11px] text-slate-400 hover:text-[#dfba8f] inline-flex items-center gap-1 transition"
              >
                <span>Testar outros níveis (Nível 2 ou Nível 3)</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showOtherTestOptions ? 'rotate-180' : ''}`}
                />
              </button>

              {showOtherTestOptions && (
                <div className="mt-2.5 p-2 bg-[#090d13] border border-slate-800 rounded-sm grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestLogin(2)}
                    disabled={loading || testLoading}
                    className="py-2 px-2 text-[10px] font-medium text-cyan-300 bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-800/40 rounded transition flex items-center justify-center gap-1"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Entrar como Nível 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTestLogin(3)}
                    disabled={loading || testLoading}
                    className="py-2 px-2 text-[10px] font-medium text-slate-300 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded transition flex items-center justify-center gap-1"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Entrar como Nível 3</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Autenticação segura via PocketBase. Acesso auditado por nível de privilégio.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
