/**
 * Hook de Notificação de Novo Lead por E-mail (Aurea Engenharia Consultiva)
 *
 * Disparado após a criação com sucesso de um registro na collection `leads`.
 *
 * CONFIGURAÇÃO NECESSÁRIA NO BACKEND (quando o SMTP for contratado/ativado):
 * Para que os e-mails sejam enviados, defina as configurações de SMTP no PocketBase:
 * 1. No painel de configurações ou via variáveis/secrets:
 *    - SMTP Host: ex: smtp.resend.com, smtp.sendgrid.net, mail.aureaengenharia.com.br
 *    - SMTP Port: 587 ou 465 (com TLS/SSL)
 *    - SMTP Username: usuário do provedor SMTP
 *    - SMTP Password: senha ou token de API do provedor SMTP
 *    - Sender Name / Sender Email: ex: "Aurea Engenharia" <contato@aureaengenharia.com.br>
 * 2. E-mail de destino dos leads (notificações):
 *    - Pode ser configurado via variável LEAD_NOTIFICATION_EMAIL ou default contato@aureaengenharia.com.br
 *
 * FALLBACK SEGURO:
 * Se o SMTP não estiver configurado ou falhar no envio, o hook captura o erro silenciosamente
 * e registra no console sem lançar exceção, garantindo que o lead JAMAIS seja bloqueado ou perdido.
 */

onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    const name = record.get('name') || 'Não informado'
    const email = record.get('email') || 'Não informado'
    const phone = record.get('phone') || 'Não informado'
    const propertyType = record.get('property_type') || 'Não informado'
    const messageText = record.get('message') || '(Sem mensagem adicional)'
    const createdDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const recipient = $os.getenv('LEAD_NOTIFICATION_EMAIL') || 'contato@aureaengenharia.com.br'

    // Verifica se as configurações de remetente ou SMTP do PocketBase estão disponíveis
    const settings = $app.settings()
    const senderAddress =
      settings && settings.meta && settings.meta.senderAddress
        ? settings.meta.senderAddress
        : 'noreply@aureaengenharia.com.br'
    const senderName =
      settings && settings.meta && settings.meta.senderName
        ? settings.meta.senderName
        : 'Aurea Engenharia Consultiva'

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background-color: #0d1117; color: #f8fafc; padding: 24px; border-radius: 8px;">
        <div style="border-bottom: 2px solid #c2996b; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #c2996b; margin: 0 0 6px 0; font-size: 20px;">Novo Lead / Solicitação de Atendimento</h2>
          <p style="color: #94a3b8; margin: 0; font-size: 13px;">Recebido pelo site da Aurea Engenharia em ${createdDate}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; color: #f8fafc;">
          <tr>
            <td style="padding: 8px 0; color: #c2996b; width: 140px; font-weight: bold;">Nome:</td>
            <td style="padding: 8px 0;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #c2996b; font-weight: bold;">E-mail:</td>
            <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #dfba8f;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #c2996b; font-weight: bold;">Telefone:</td>
            <td style="padding: 8px 0;"><a href="tel:${phone}" style="color: #dfba8f;">${phone}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #c2996b; font-weight: bold;">Tipo de Imóvel:</td>
            <td style="padding: 8px 0; text-transform: capitalize;">${propertyType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #c2996b; font-weight: bold; vertical-align: top;">Mensagem:</td>
            <td style="padding: 8px 0; line-height: 1.5; background: #151e2a; padding: 12px; border-radius: 6px; border: 1px solid rgba(194,153,107,0.2);">
              ${messageText}
            </td>
          </tr>
        </table>
        
        <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 12px;">
          Este e-mail foi gerado automaticamente pelo portal da Aurea Engenharia Consultiva.
        </p>
      </div>
    `

    // Instancia mensagem de e-mail do PocketBase
    const message = new MailerMessage({
      from: {
        address: senderAddress,
        name: senderName,
      },
      to: [{ address: recipient }],
      subject: `[Novo Lead Aurea] ${name} - Imóvel ${propertyType}`,
      html: htmlBody,
    })

    // Tenta enviar via cliente de e-mail do PocketBase
    $app.newMailClient().send(message)
    console.log(
      `[Aurea Lead Notification] E-mail de notificação enviado para ${recipient} referente ao lead ${record.id}`,
    )
  } catch (err) {
    // Falha silenciosa: como o SMTP pode não estar configurado nesta instância,
    // não quebramos a criação do lead nem geramos erro 500 para o visitante.
    console.log(
      `[Aurea Lead Notification] SMTP não configurado ou indisponível (${err}). Lead gravado com sucesso no banco.`,
    )
  }

  e.next()
}, 'leads')
