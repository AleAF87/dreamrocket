import pb from '@/lib/pocketbase/client'

export interface UserRecord {
  id: string
  email: string
  name?: string
  avatar?: string
  access_level: number
  verified?: boolean
  created: string
  updated: string
}

export interface UserListResult {
  items: UserRecord[]
  totalItems: number
  page: number
  perPage: number
  totalPages: number
}

function extractField(record: any, field: string): any {
  if (!record) return undefined
  if (typeof record.get === 'function') {
    return record.get(field)
  }
  return record[field]
}

function mapUserRecord(record: any, fallbackLevel?: number): UserRecord {
  return {
    id: record.id,
    email: extractField(record, 'email') || '',
    name: extractField(record, 'name') || '',
    avatar: extractField(record, 'avatar') || '',
    access_level: Number(extractField(record, 'access_level')) || fallbackLevel || 1,
    verified: Boolean(extractField(record, 'verified')),
    created: extractField(record, 'created') || '',
    updated: extractField(record, 'updated') || '',
  }
}

/**
 * Busca a lista de usuários cadastrados (Requer Nível 1)
 */
export async function getUsers(page = 1, perPage = 50): Promise<UserListResult> {
  const result = await pb.collection('users').getList(page, perPage, {
    sort: 'access_level,name',
  })

  return {
    items: result.items.map((r) => mapUserRecord(r)),
    totalItems: result.totalItems,
    page: result.page,
    perPage: result.perPage,
    totalPages: result.totalPages,
  }
}

/**
 * Atualiza o nível de acesso (access_level: 1, 2 ou 3) de um usuário
 */
export async function updateUserAccessLevel(userId: string, newLevel: number): Promise<UserRecord> {
  if (![1, 2, 3].includes(newLevel)) {
    throw new Error('Nível de acesso inválido. Deve ser 1, 2 ou 3.')
  }

  const updated = await pb.collection('users').update(userId, {
    access_level: newLevel,
  })

  // Se o usuário atualizado for o usuário logado no momento, atualiza também os dados na authStore
  if (pb.authStore.record && pb.authStore.record.id === userId) {
    pb.authStore.save(pb.authStore.token, updated)
  }

  return mapUserRecord(updated, newLevel)
}

/**
 * Atualiza dados básicos do usuário (ex.: nome)
 */
export async function updateUserData(userId: string, data: { name?: string }): Promise<UserRecord> {
  const updated = await pb.collection('users').update(userId, data)

  if (pb.authStore.record && pb.authStore.record.id === userId) {
    pb.authStore.save(pb.authStore.token, updated)
  }

  return mapUserRecord(updated)
}
