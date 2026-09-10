// migration 0006
migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    if (!leads.fields.getByName('visitor_ip')) {
      leads.fields.add(
        new TextField({
          name: 'visitor_ip',
          required: false,
          max: 100,
        }),
      )
    }
    try {
      leads.addIndex('idx_leads_visitor_ip', false, 'visitor_ip', '')
    } catch (_) {}
    app.save(leads)
  },
  (app) => {
    try {
      const leads = app.findCollectionByNameOrId('leads')
      if (leads.fields.getByName('visitor_ip')) {
        leads.fields.removeByName('visitor_ip')
      }
      try {
        leads.removeIndex('idx_leads_visitor_ip')
      } catch (_) {}
      app.save(leads)
    } catch (_) {}
  },
)
