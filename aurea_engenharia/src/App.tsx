import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { publicBasePath } from '@/lib/public-path'
import Index from '@/pages/Index'
import NotFound from '@/pages/NotFound'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminVisits } from '@/pages/admin/AdminVisits'
import { AdminLeads } from '@/pages/admin/AdminLeads'
import { AdminLevels } from '@/pages/admin/AdminLevels'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <BrowserRouter basename={publicBasePath.replace(/\/$/, '') || '/'}>
      <Routes>
        {/* Landing Page Principal Pública */}
        <Route path="/" element={<Index />} />
        <Route path="/index.html" element={<Index />} />

        {/* Rotas Administrativas */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Painel Geral Administrativo (Nível 1, 2 e 3) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Gestão de Níveis de Acesso (SOMENTE Nível 1) */}
        <Route
          path="/admin/niveis"
          element={
            <ProtectedRoute requiredLevel={1}>
              <AdminLevels />
            </ProtectedRoute>
          }
        />

        {/* Ferramenta Registro de Visitas (SOMENTE Nível 1) */}
        <Route
          path="/admin/visitas"
          element={
            <ProtectedRoute requiredLevel={1}>
              <AdminVisits />
            </ProtectedRoute>
          }
        />

        {/* Ferramenta Solicitações de Atendimento / Leads (SOMENTE Nível 1) */}
        <Route
          path="/admin/leads"
          element={
            <ProtectedRoute requiredLevel={1}>
              <AdminLeads />
            </ProtectedRoute>
          }
        />

        {/* Rota 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
