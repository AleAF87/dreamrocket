/* 404 Page - Dark Luxury da AUREA Engenharia Consultiva */
import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, Home } from 'lucide-react'
import { AureaLogo } from '@/components/AureaLogo'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: Rota não encontrada:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b10] text-slate-100 px-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c2996b]/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="text-center relative z-10 max-w-md">
        <div className="flex justify-center mb-6">
          <AureaLogo variant="card" height={60} href="/" />
        </div>

        <div className="text-7xl font-light tracking-tighter text-[#c2996b] mb-3">404</div>
        <h1 className="text-xl font-medium tracking-wide text-white mb-2">Página não encontrada</h1>
        <p className="text-xs text-slate-400 mb-8 leading-relaxed">
          O endereço acessado não existe ou foi movido. Retorne à página inicial da Aurea Engenharia
          Consultiva.
        </p>

        <div className="flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-gradient-to-r from-[#dbb386] to-[#c2996b] text-[#0d1117] text-xs font-semibold tracking-wider uppercase hover:brightness-110 transition shadow-lg"
          >
            <Home className="w-4 h-4" /> Página Inicial
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-[#151e2a] border border-slate-700 hover:border-[#c2996b] text-slate-300 hover:text-white text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotFound
