migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'drcesartadeu@gmail.com')
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('drcesartadeu@gmail.com')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Administrador Aurea')
      app.save(admin)
    }

    const serviceCollection = app.findCollectionByNameOrId('services')
    const items = [
      {
        title: 'Vistoria Técnica',
        description:
          'Inspeção criteriosa do imóvel para identificar condições, riscos e necessidades de adequação.',
        icon_name: 'Search',
        order: 1,
      },
      {
        title: 'Laudos e Pareceres',
        description:
          'Documentação técnica clara e fundamentada para apoiar decisões seguras sobre o imóvel.',
        icon_name: 'ClipboardList',
        order: 2,
      },
      {
        title: 'Avaliações e Credenciamentos',
        description:
          'Avaliações especializadas e suporte técnico para conformidade junto aos órgãos competentes.',
        icon_name: 'ChartNoAxesColumnIncreasing',
        order: 3,
      },
      {
        title: 'Acompanhamento e Gestão de Obras',
        description:
          'Coordenação técnica das adequações, com controle de qualidade, prazos e execução.',
        icon_name: 'HardHat',
        order: 4,
      },
      {
        title: 'AVCB e Segurança contra Incêndio',
        description:
          'Projetos, aprovações e acompanhamento completo para obtenção ou renovação do AVCB.',
        icon_name: 'Flame',
        order: 5,
      },
      {
        title: 'Consultoria Técnica',
        description:
          'Orientação próxima e estratégica para regularizar, proteger e valorizar seu patrimônio.',
        icon_name: 'Landmark',
        order: 6,
      },
    ]

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        app.findFirstRecordByData('services', 'title', item.title)
      } catch (_) {
        const record = new Record(serviceCollection)
        record.set('title', item.title)
        record.set('description', item.description)
        record.set('icon_name', item.icon_name)
        record.set('order', item.order)
        app.save(record)
      }
    }
  },
  (app) => {
    const services = app.findRecordsByFilter(
      'services',
      'order >= 1 && order <= 6',
      'order',
      100,
      0,
    )
    for (let i = 0; i < services.length; i++) {
      app.delete(services[i])
    }

    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'drcesartadeu@gmail.com')
      app.delete(admin)
    } catch (_) {}
  },
)
