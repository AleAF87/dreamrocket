migrate(
  (app) => {
    const visits = app.findCollectionByNameOrId('visits')

    if (!visits.fields.getByName('whatsapp_click')) {
      visits.fields.add(
        new BoolField({
          name: 'whatsapp_click',
          required: false,
        }),
      )
    }

    if (!visits.fields.getByName('whatsapp_clicked_at')) {
      visits.fields.add(
        new DateField({
          name: 'whatsapp_clicked_at',
          required: false,
        }),
      )
    }

    try {
      visits.addIndex('idx_visits_whatsapp_click', false, 'whatsapp_click', '')
    } catch (_) {}

    app.save(visits)
  },
  (app) => {
    try {
      const visits = app.findCollectionByNameOrId('visits')
      try {
        visits.removeIndex('idx_visits_whatsapp_click')
      } catch (_) {}
      visits.fields.removeByName('whatsapp_click')
      visits.fields.removeByName('whatsapp_clicked_at')
      app.save(visits)
    } catch (_) {}
  },
)
