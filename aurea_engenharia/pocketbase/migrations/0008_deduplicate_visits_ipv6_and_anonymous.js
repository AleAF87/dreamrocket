migrate(
  (app) => {
    // Deduplicação dos registros existentes na collection visits:
    // Para cada par ip + dia (SUBSTR(created, 1, 10)), manter apenas o registro mais recente (MAX(created)),
    // excluindo os demais.
    //
    // 1. Deduplicação por IP identificado + dia (IPv4 e IPv6):
    try {
      app
        .db()
        .newQuery(`
        DELETE FROM visits
        WHERE ip IS NOT NULL AND ip != '' AND id NOT IN (
          SELECT id FROM visits v1
          WHERE v1.created = (
            SELECT MAX(v2.created)
            FROM visits v2
            WHERE v2.ip = v1.ip
              AND SUBSTR(v2.created, 1, 10) = SUBSTR(v1.created, 1, 10)
          )
        )
      `)
        .execute()
    } catch (err) {
      console.log('Erro ao deduplicar visits por IP:', err)
    }

    // 2. Deduplicação para registros sem IP (ou vazio) no mesmo dia:
    // Mantém o registro mais recente (MAX(created) / MAX(id)) agrupando por dia + user_agent + device + screen_resolution
    try {
      app
        .db()
        .newQuery(`
        DELETE FROM visits
        WHERE (ip IS NULL OR ip = '') AND id NOT IN (
          SELECT id FROM visits v1
          WHERE v1.created = (
            SELECT MAX(v2.created)
            FROM visits v2
            WHERE (v2.ip IS NULL OR v2.ip = '')
              AND SUBSTR(v2.created, 1, 10) = SUBSTR(v1.created, 1, 10)
              AND COALESCE(v2.user_agent, '') = COALESCE(v1.user_agent, '')
              AND COALESCE(v2.device, '') = COALESCE(v1.device, '')
              AND COALESCE(v2.screen_resolution, '') = COALESCE(v1.screen_resolution, '')
          )
        )
      `)
        .execute()
    } catch (err) {
      console.log('Erro ao deduplicar visits sem IP:', err)
    }
  },
  () => {
    // Migration de limpeza/deduplicação de dados passados; não há ação destrutiva para reverter.
  },
)
