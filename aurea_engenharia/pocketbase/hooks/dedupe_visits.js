/**
 * Hook customizado para deduplicação server-side de visitas
 * Endpoint: POST /api/custom/dedupe-visits
 * Exige autenticação de admin (access_level = 1)
 */
routerAdd(
  'POST',
  '/api/custom/dedupe-visits',
  (e) => {
    // 1. Verifica autenticação de nível 1 (admin)
    const auth = e.auth
    if (!auth || Number(auth.get('access_level')) !== 1) {
      return e.json(403, { error: 'Acesso não autorizado' })
    }

    try {
      // 1. Mesclar whatsapp_click em visitas duplicadas por IP antes de remover
      $app
        .db()
        .newQuery(
          `
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
      `,
        )
        .execute()

      // 2. Deletar duplicatas por IP preservando a mais recente
      const resIp = $app
        .db()
        .newQuery(
          `
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
      `,
        )
        .execute()

      // 3. Mesclar whatsapp_click em visitas anônimas
      $app
        .db()
        .newQuery(
          `
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
      `,
        )
        .execute()

      // 4. Deletar duplicatas anônimas preservando a mais recente
      const resAnon = $app
        .db()
        .newQuery(
          `
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
              AND COALESCE(v2.screen_resolution, '') = COALESCE(visits.screen_resolution, '')
          )
        )
      `,
        )
        .execute()

      return e.json(200, {
        success: true,
        message: 'Deduplicação de visitas executada com sucesso.',
      })
    } catch (err) {
      console.log('Erro ao executar dedupe-visits hook:', err)
      return e.json(500, {
        success: false,
        error: String(err),
      })
    }
  },
  $apis.requireAuth(),
)
