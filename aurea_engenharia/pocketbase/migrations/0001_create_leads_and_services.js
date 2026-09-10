migrate(
  (app) => {
    const leads = new Collection({
      name: 'leads',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '',
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true, min: 2, max: 120 },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text', required: true, min: 8, max: 30 },
        {
          name: 'property_type',
          type: 'select',
          required: true,
          values: ['residencial', 'comercial', 'industrial'],
          maxSelect: 1,
        },
        { name: 'message', type: 'text', max: 3000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_leads_created ON leads (created DESC)',
        'CREATE INDEX idx_leads_email ON leads (email)',
      ],
    })

    const services = new Collection({
      name: 'services',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true, max: 160 },
        { name: 'description', type: 'text', required: true, max: 500 },
        { name: 'icon_name', type: 'text', required: true, max: 80 },
        { name: 'order', type: 'number', required: true, min: 1, max: 100, onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_services_order ON services ("order")'],
    })

    app.save(leads)
    app.save(services)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('services'))
    app.delete(app.findCollectionByNameOrId('leads'))
  },
)
