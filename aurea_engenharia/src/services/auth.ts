import pb from '@/lib/pocketbase/client'

export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  access_level?: number
  created: string
  updated: string
}

function extractField(record: any, field: string): any {
  if (!record) return undefined
  if (typeof record.get === 'function') {
    return record.get(field)
  }
  return record[field]
}

function mapAuthUser(record: any): AuthUser {
  return {
    id: record.id || '',
    email: extractField(record, 'email') || '',
    name: extractField(record, 'name') || '',
    avatar: extractField(record, 'avatar') || '',
    access_level: Number(extractField(record, 'access_level')) || 1, // Default 1 para admins criados anteriormente
    created: extractField(record, 'created') || '',
    updated: extractField(record, 'updated') || '',
  }
}

export function getCurrentUser(): AuthUser | null {
  if (!pb.authStore.isValid || !pb.authStore.record) {
    return null
  }
  return mapAuthUser(pb.authStore.record)
}

export function isAuthenticated(): boolean {
  return pb.authStore.isValid
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const authData = await pb.collection('users').authWithPassword(email.trim(), password)
  return mapAuthUser(authData.record)
}

/**
 * Autentica diretamente com a conta de demonstração/teste para acesso rápido à área restrita
 */
export async function loginAsTestUser(level: 1 | 2 | 3 = 1): Promise<AuthUser> {
  let email = 'teste.admin@aureaengenharia.com.br'
  if (level === 2) {
    email = 'consultor.teste@aureaengenharia.com.br'
  } else if (level === 3) {
    email = 'auditor.teste@aureaengenharia.com.br'
  }

  // Tenta autenticar na conta correspondente
  try {
    return await loginWithEmail(email, 'Skip@Pass123')
  } catch {
    // Fallback para admin principal caso a conta não responda
    return await loginWithEmail('drcesartadeu@gmail.com', 'Skip@Pass')
  }
}

export function logout() {
  pb.authStore.clear()
}

/**
 * Escuta mudanças na autenticação
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return pb.authStore.onChange(() => {
    callback(getCurrentUser())
  })
}
