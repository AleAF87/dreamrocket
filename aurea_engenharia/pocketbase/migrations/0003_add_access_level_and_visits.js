migrate(
  (app) => {
    // 1. Adicionar campo access_level na collection de usuários
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('access_level')) {
      users.fields.add(
        new NumberField({
          name: 'access_level',
          required: false,
          min: 1,
          max: 3,
          onlyInt: true,
        }),
      )
      app.save(users)
    }

    // 2. Atualizar o administrador existente para access_level = 1
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'drcesartadeu@gmail.com')
      admin.set('access_level', 1)
      app.save(admin)
    } catch (_) {}

    // 3. Criar a collection visits para registros de visitas anônimas
    try {
      app.findCollectionByNameOrId('visits')
    } catch (_) {
      const visits = new Collection({
        name: 'visits',
        type: 'base',
        // Criação pública (qualquer visitante registra visita anônima)
        createRule: '',
        // Somente usuários autenticados com nível 1 podem listar e visualizar
        listRule: "@request.auth.id != '' && @request.auth.access_level = 1",
        viewRule: "@request.auth.id != '' && @request.auth.access_level = 1",
        updateRule: null,
        deleteRule: "@request.auth.id != '' && @request.auth.access_level = 1",
        fields: [
          { name: 'ip', type: 'text', max: 80 },
          { name: 'city', type: 'text', max: 120 },
          { name: 'region', type: 'text', max: 120 },
          { name: 'country', type: 'text', max: 120 },
          { name: 'device', type: 'text', max: 50 },
          { name: 'browser', type: 'text', max: 80 },
          { name: 'os', type: 'text', max: 80 },
          { name: 'path', type: 'text', max: 300 },
          { name: 'referrer', type: 'text', max: 500 },
          { name: 'user_agent', type: 'text', max: 500 },
          { name: 'screen_resolution', type: 'text', max: 50 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_visits_created ON visits (created DESC)',
          'CREATE INDEX idx_visits_city ON visits (city)',
          'CREATE INDEX idx_visits_device ON visits (device)',
        ],
      })
      app.save(visits)
    }

    // 4. Reforçar listRule / viewRule da collection leads para nível 1
    const leads = app.findCollectionByNameOrId('leads')
    leads.listRule = "@request.auth.id != '' && @request.auth.access_level = 1"
    leads.viewRule = "@request.auth.id != '' && @request.auth.access_level = 1"
    leads.deleteRule = "@request.auth.id != '' && @request.auth.access_level = 1"
    app.save(leads)
  },
  (app) => {
    try {
      const visits = app.findCollectionByNameOrId('visits')
      app.delete(visits)
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      const field = users.fields.getByName('access_level')
      if (field) {
        users.fields.removeByName('access_level')
        app.save(users)
      }
    } catch (_) {}

    try {
      const leads = app.findCollectionByNameOrId('leads')
      leads.listRule = "@request.auth.id != ''"
      leads.viewRule = "@request.auth.id != ''"
      leads.deleteRule = "@request.auth.id != ''"
      app.save(leads)
    } catch (_) {}
  },
)
