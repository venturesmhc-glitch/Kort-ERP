import { env } from '../../config/env.js';

export interface SendWhatsappTemplateInput {
  /** Numero E.164 sin '+', ej. "5491122334455". */
  to: string;
  /** Nombre de la plantilla pre-aprobada en Meta Business Manager. */
  templateName: string;
  /** Parametros posicionales {{1}}, {{2}}, ... del body de la plantilla. */
  bodyParams: string[];
}

// Envio real via WhatsApp Business Cloud API (Meta). Un mensaje que la
// empresa inicia (no es respuesta dentro de una conversacion abierta por el
// cliente) tiene que usar una plantilla pre-aprobada - por eso se manda
// "template", no texto libre. templateName es parametrico (no solo el
// recordatorio de turno): cada tipo de mensaje - recordatorio, solicitud de
// resena, reactivacion de clientes, ver notifications/scheduler.service.ts y
// notifications/clientMessages.service.ts - necesita su propia plantilla
// aprobada en Meta, con su propio set de variables. Sin WHATSAPP_TOKEN/
// WHATSAPP_PHONE_NUMBER_ID configuradas cae a un no-op con log, igual que
// EmailProvider.
export async function sendWhatsappTemplate(input: SendWhatsappTemplateInput): Promise<void> {
  if (!env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.log(
      `[WhatsappProvider] WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID no configuradas - no-op. ` +
        `Plantilla: ${input.templateName}, destinatario: ${input.to}`
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
          name: input.templateName,
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

// Cliente.phone es texto libre (ver clients.schema.ts) - normaliza a "solo
// digitos, con codigo de pais" para la API de WhatsApp. Best-effort: si el
// numero ya trae codigo de pais lo respeta, si no le antepone el default.
// Compartido por scheduler.service.ts (recordatorio de turno) y
// clientMessages.service.ts (resena/reactivacion).
export function normalizeWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith(env.whatsappDefaultCountryCode) ? digits : `${env.whatsappDefaultCountryCode}${digits}`;
}
