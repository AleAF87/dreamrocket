migrate(
  (app) => {
    // 0009_deduplicate_visits_merge_whatsapp.js
    //
    // Deduplica registros na collection 'visits':
    // Para cada grupo (ip + dia OU fallback de anônimo + dia):
    // Se algum dos registros do grupo tiver whatsapp_click = true,
    // atualiza o registro mais recente com whatsapp_click = true e whatsapp_clicked_at (se não tiver).
    // Em seguida, remove todas as duplicatas mais antigas do mesmo grupo.

    // 1. Unificar flag do WhatsApp em duplicatas com IP antes da exclusão
    try {
      app
        .db()
        .newQuery(`
        UPDATE visits
        SET whatsapp_click = 1,
            whatsapp_clicked_at = COALESCE(
              visits.whatsapp_clicked_at,
              (
                SELECT MAX(v_wa.whatsapp_clicked_at)
                FROM visits v_wa
                WHERE v_wa.ip = visits.ip
                  AND SUBSTR(v_wa.created, 1, 10) = SUBSTR(visits.created, 1, 10)
                  AND v_wa.whatsapp_click = 1
              )
            )
        WHERE ip IS NOT NULL AND ip != ''
          AND (whatsapp_click IS NULL OR whatsapp_click = 0)
          AND EXISTS (
            SELECT 1 FROM visits v2
            WHERE v2.ip = visits.ip
              AND SUBSTR(v2.created, 1, 10) = SUBSTR(visits.created, 1, 10)
              AND v2.whatsapp_click = 1
          )
      `)
        .execute()
    } catch (err) {
      console.log('Erro ao mesclar whatsapp_click em visitas duplicadas por IP:', err)
    }

    // 2. Remover duplicatas por IP + dia, preservando a mais recente
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
      console.log('Erro ao deduplicar visits por IP na migration 0009:', err)
    }

    // 3. Unificar flag do WhatsApp em duplicatas anônimas (sem IP)
    try {
      app
        .db()
        .newQuery(`
        UPDATE visits
        SET whatsapp_click = 1,
            whatsapp_clicked_at = COALESCE(
              visits.whatsapp_clicked_at,
              (
                SELECT MAX(v_wa.whatsapp_clicked_at)
                FROM visits v_wa
                WHERE (v_wa.ip IS NULL OR v_wa.ip = '')
                  AND SUBSTR(v_wa.created, 1, 10) = SUBSTR(visits.created, 1, 10)
                  AND COALESCE(v_wa.user_agent, '') = COALESCE(visits.user_agent, '')
                  AND COALESCE(v_wa.device, '') = COALESCE(visits.device, '')
                  AND COALESCE(v_wa.screen_resolution, '') = COALESCE(visits.screen_resolution, '')
                  AND v_wa.whatsapp_click = 1
              )
            )
        WHERE (ip IS NULL OR ip = '')
          AND (whatsapp_click IS NULL OR whatsapp_click = 0)
          AND EXISTS (
            SELECT 1 FROM visits v2
            WHERE (v2.ip IS NULL OR v2.ip = '')
              AND SUBSTR(v2.created, 1, 10) = SUBSTR(visits.created, 1, 10)
              AND COALESCE(v2.user_agent, '') = COALESCE(visits.user_agent, '')
              AND COALESCE(v2.device, '') = COALESCE(visits.device, '')
              AND COALESCE(v2.screen_resolution, '') = COALESCE(visits.screen_resolution, '')
              AND v2.whatsapp_click = 1
          )
      `)
        .execute()
    } catch (err) {
      console.log('Erro ao mesclar whatsapp_click em visitas anônimas:', err)
    }

    // 4. Remover duplicatas anônimas (sem IP) preservando a mais recente
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
      console.log('Erro ao deduplicar visits sem IP na migration 0009:', err)
    }
  },
  () => {
    // Migration de limpeza/deduplicação; irreversível por natureza idempotente.
  },
)
