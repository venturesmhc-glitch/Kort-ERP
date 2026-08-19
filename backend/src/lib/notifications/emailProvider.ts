import { env } from '../../config/env.js';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

// Envio real via la API REST de Resend (sin SDK: es un solo POST, no vale la
// pena la dependencia extra). Sin RESEND_API_KEY configurada cae a un no-op
// con log - mismo comportamiento que el stub original, para no romper el
// flujo de turnos en ambientes sin el proveedor todavia configurado (dev,
// o produccion antes del alta en Resend).
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.resendApiKey) {
    console.log(`[EmailProvider] RESEND_API_KEY no configurada - no-op. Destinatario: ${input.to}, asunto: ${input.subject}`);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.resendFromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend respondio ${response.status}: ${body}`);
  }
}
