migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Atualizar regras da coleção users para permitir que Nível 1 gerencie os usuários
    // Nível 1 pode listar, visualizar e atualizar qualquer usuário (para trocar access_level).
    // O próprio usuário continua podendo ver/atualizar o seu próprio registro.
    // Superusuários (PocketBase) também continuam tendo acesso nativo.
    users.listRule =
      "@request.auth.id != '' && (@request.auth.access_level = 1 || id = @request.auth.id)"
    users.viewRule =
      "@request.auth.id != '' && (@request.auth.access_level = 1 || id = @request.auth.id)"
    users.updateRule =
      "@request.auth.id != '' && (@request.auth.access_level = 1 || id = @request.auth.id)"
    // Criação pública ou por nível 1 (deixamos permitido para novos cadastros ou admin)
    users.createRule = "@request.auth.id != '' && @request.auth.access_level = 1"

    app.save(users)

    // 2. Garantir que drcesartadeu@gmail.com continua como nível 1
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'drcesartadeu@gmail.com')
      admin.set('access_level', 1)
      admin.setVerified(true)
      app.save(admin)
    } catch (_) {}

    // 3. Criar conta de teste (Nível 1 - Acesso Restrito Total)
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'teste.admin@aureaengenharia.com.br')
    } catch (_) {
      const testAdmin = new Record(users)
      testAdmin.setEmail('teste.admin@aureaengenharia.com.br')
      testAdmin.setPassword('Skip@Pass123')
      testAdmin.setVerified(true)
      testAdmin.set('name', 'Eng. Avaliador (Teste Nível 1)')
      testAdmin.set('access_level', 1)
      app.save(testAdmin)
    }

    // 4. Criar conta de demonstração adicional (Nível 2 - Consultor Técnico)
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'consultor.teste@aureaengenharia.com.br')
    } catch (_) {
      const testConsultant = new Record(users)
      testConsultant.setEmail('consultor.teste@aureaengenharia.com.br')
      testConsultant.setPassword('Skip@Pass123')
      testConsultant.setVerified(true)
      testConsultant.set('name', 'Consultor Técnico (Teste Nível 2)')
      testConsultant.set('access_level', 2)
      app.save(testConsultant)
    }

    // 5. Criar conta de demonstração adicional (Nível 3 - Auditor de Projetos)
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'auditor.teste@aureaengenharia.com.br')
    } catch (_) {
      const testAuditor = new Record(users)
      testAuditor.setEmail('auditor.teste@aureaengenharia.com.br')
      testAuditor.setPassword('Skip@Pass123')
      testAuditor.setVerified(true)
      testAuditor.set('name', 'Auditor de Projetos (Teste Nível 3)')
      testAuditor.set('access_level', 3)
      app.save(testAuditor)
    }
  },
  (app) => {
    // Reverter regras da coleção users
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.listRule = 'id = @request.auth.id'
      users.viewRule = 'id = @request.auth.id'
      users.updateRule = 'id = @request.auth.id'
      users.createRule = ''
      app.save(users)
    } catch (_) {}

    // Remover usuários de teste
    const testEmails = [
      'teste.admin@aureaengenharia.com.br',
      'consultor.teste@aureaengenharia.com.br',
      'auditor.teste@aureaengenharia.com.br',
    ]

    for (let i = 0; i < testEmails.length; i++) {
      try {
        const u = app.findAuthRecordByEmail('_pb_users_auth_', testEmails[i])
        app.delete(u)
      } catch (_) {}
    }
  },
)
