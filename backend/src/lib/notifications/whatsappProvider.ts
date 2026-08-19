import { env } from '../../config/env.js';

export interface SendWhatsappTemplateInput {
  /** Numero E.164 sin '+', ej. "5491122334455". */
  to: string;
  /** Parametros posicionales {{1}}, {{2}}, ... del body de la plantilla. */
  bodyParams: string[];
}

// Envio real via WhatsApp Business Cloud API (Meta). Un mensaje que la
// empresa inicia (no es respuesta dentro de una conversacion abierta por el
// cliente) tiene que usar una plantilla pre-aprobada - por eso se manda
// "template", no texto libre. Sin WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID
// configuradas cae a un no-op con log, igual que EmailProvider.
export async function sendWhatsappTemplate(input: SendWhatsappTemplateInput): Promise<void> {
  if (!env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(
      `[WhatsappProvider] WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID no configuradas - no-op. Destinatario: ${input.to}`
    );
    return;
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${env.whatsappPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: input.to,
        type: 'template',
        template: {
          name: env.whatsappReminderTemplate,
          language: { code: env.whatsappTemplateLang },
          components: [
            {
              type: 'body',
              parameters: input.bodyParams.map((text) => ({ type: 'text', text })),
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`WhatsApp Cloud API respondio ${response.status}: ${body}`);
  }
}
