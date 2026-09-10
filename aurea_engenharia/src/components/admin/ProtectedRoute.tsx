import { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { getCurrentUser, isAuthenticated } from '@/services/auth'
import { ShieldAlert } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredLevel?: number
}

export function ProtectedRoute({ children, requiredLevel }: ProtectedRouteProps) {
  const location = useLocation()
  const authenticated = isAuthenticated()
  const user = getCurrentUser()

  if (!authenticated || !user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  const userLevel = user.access_level ?? 1

  // Se a rota requer nível 1 e o usuário for nível 2 ou 3:
  if (requiredLevel && userLevel > requiredLevel) {
    return (
      <div className="min-h-screen bg-[#070b10] text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0d1117] border border-amber-500/30 p-8 rounded-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-medium text-white">
            Acesso Restrito ao Nível {requiredLevel}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Seu perfil atual possui <strong>Nível de Acesso {userLevel}</strong>. Esta ferramenta
            exclusiva está disponível apenas para o Nível {requiredLevel}.
          </p>
          <div className="pt-2">
            <Link
              to="/admin"
              className="inline-block px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#151e2a] hover:bg-[#1f2b3b] text-[#dfba8f] border border-[#c2996b]/30 rounded-sm transition"
            >
              Voltar ao Painel Geral
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
