migrate(
  (app) => {
    // 1. Atualizar regras da coleção visits para permitir update público ou por nível 1
    const visits = app.findCollectionByNameOrId('visits')
    visits.updateRule = ''
    // Adicionar índice para acelerar busca por IP e created
    try {
      visits.addIndex('idx_visits_ip_created', false, 'ip, created DESC', '')
    } catch (_) {}
    app.save(visits)

    // 2. Limpeza e deduplicação dos registros existentes
    // Para cada combinação de (ip, SUBSTR(created, 1, 10)), manter apenas o registro mais recente (MAX(created) / MAX(id))
    // e excluir os registros duplicados mais antigos onde ip != ''
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
      console.log('Erro ao deduplicar visits existentes:', err)
    }

    // Também normalizar registros com IP vazio se houver duplicatas no mesmo dia com mesmo user_agent
    try {
      app
        .db()
        .newQuery(`
        DELETE FROM visits
        WHERE (ip IS NULL OR ip = '') AND id NOT IN (
          SELECT MAX(id)
          FROM visits
          WHERE (ip IS NULL OR ip = '')
          GROUP BY SUBSTR(created, 1, 10), user_agent, screen_resolution
        )
      `)
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const visits = app.findCollectionByNameOrId('visits')
      visits.updateRule = null
      try {
        visits.removeIndex('idx_visits_ip_created')
      } catch (_) {}
      app.save(visits)
    } catch (_) {}
  },
)
