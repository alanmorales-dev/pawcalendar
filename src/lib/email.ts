import { buildFeedingPlan } from './feeding.ts';
import { healthMilestones } from './health.ts';
import type { PlannerState } from './storage.ts';
import type { TaskType } from './types.ts';

/**
 * Correo de bienvenida / resumen del plan (SPEC §12).
 * Todo el contenido se arma acá (puro y testeable); el Apps Script solo lo reenvía.
 * HTML con estilos inline porque los clientes de correo ignoran <style>/CSS externo.
 */

const PALETTE = {
  bg: '#f0f4ff',
  card: '#ffffff',
  text: '#2d2d4e',
  muted: '#8888aa',
  pink: '#ff6b9d',
  purple: '#9b5de5',
  green: '#2ec4b6',
  blue: '#5b8cff',
};

const TASK_LABEL: Record<TaskType, string> = {
  food: 'Alimentación',
  walk: 'Paseos',
  bath: 'Higiene',
  health: 'Salud',
  shop: 'Compras',
};

export function buildPlanEmailSubject(state: PlannerState): string {
  return `El plan de cuidado de ${state.profile.name} — PawCalendar`;
}

export function buildPlanEmailHtml(state: PlannerState): string {
  const { profile, emoji } = state;
  const plan = buildFeedingPlan(profile, { foodKcalPerKg: state.foodKcalPerKg });
  const count = (t: TaskType) => state.assignments.filter((a) => a.type === t).length;
  const next = healthMilestones(profile.ageMonths, profile.size)[0];

  const routineTypes: TaskType[] = ['walk', 'bath', 'health', 'shop'];
  const routineRows = routineTypes
    .filter((t) => count(t) > 0)
    .map(
      (t) =>
        `<tr><td style="padding:4px 0;color:${PALETTE.muted};font-size:14px">${TASK_LABEL[t]}</td>` +
        `<td style="padding:4px 0;text-align:right;font-weight:700;color:${PALETTE.text};font-size:14px">${count(t)} / semana</td></tr>`,
    )
    .join('');

  const regBlock = state.registered
    ? ''
    : `<tr><td style="padding:14px 18px;background:#fff3c7;border-radius:12px;font-size:13px;color:${PALETTE.text};line-height:1.5">
         📋 <strong>Recuerda inscribir a ${profile.name}</strong> en el Registro Nacional de Mascotas
         (<a href="https://www.registratumascota.cl" style="color:${PALETTE.purple}">registratumascota.cl</a>). Es obligatorio por ley.
       </td></tr><tr><td style="height:12px"></td></tr>`;

  const card = (title: string, inner: string) =>
    `<tr><td style="padding:16px 18px;background:${PALETTE.bg};border-radius:14px">
       <div style="font-size:13px;font-weight:800;color:${PALETTE.purple};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px">${title}</div>
       ${inner}
     </td></tr><tr><td style="height:12px"></td></tr>`;

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:${PALETTE.bg};font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.bg};padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${PALETTE.card};border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(80,80,180,0.1)">
        <tr><td style="background:linear-gradient(135deg,${PALETTE.pink},${PALETTE.purple});padding:28px 24px;text-align:center">
          <div style="font-size:44px;line-height:1">${emoji}</div>
          <div style="color:#fff;font-size:22px;font-weight:800;margin-top:6px">El plan de ${profile.name} ya está listo</div>
          <div style="color:#ffffffcc;font-size:14px;margin-top:4px">Gracias por usar PawCalendar</div>
        </td></tr>
        <tr><td style="padding:24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${card(
              '🍽️ Alimentación',
              `<div style="font-size:15px;color:${PALETTE.text};font-weight:700;line-height:1.6">
                 ${plan.gramsPerDay} g al día (${plan.cupsPerDay} tazas) en ${plan.mealsPerDay} comidas de ${plan.gramsPerMeal} g.
               </div>
               <div style="font-size:13px;color:${PALETTE.muted};margin-top:6px">Horarios: ${state.mealTimes.join(' · ')}</div>`,
            )}
            ${card('📅 Rutina de la semana', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${routineRows}</table>`)}
            ${next
              ? card(
                  '💉 Próximo en salud',
                  `<div style="font-size:14px;color:${PALETTE.text};font-weight:700">${next.icon} ${next.label}</div>
                   <div style="font-size:12px;color:${PALETTE.muted};margin-top:4px">${next.detail}</div>`,
                )
              : ''}
            ${regBlock}
            <tr><td style="font-size:11px;color:${PALETTE.muted};font-style:italic;line-height:1.5;padding-top:4px">
              Plan orientativo: no reemplaza la indicación de tu veterinario/a.
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:${PALETTE.bg};padding:16px 24px;text-align:center;font-size:11px;color:${PALETTE.muted}">
          PawCalendar · Proyecto universitario — Feria de Innovación, Universidad Mayor
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

/**
 * Envía el correo vía el Apps Script (SPEC §12). Fire-and-forget con no-cors:
 * la respuesta es opaca, así que se asume éxito salvo error de red/config.
 */
export async function sendPlanEmail(email: string, state: PlannerState): Promise<void> {
  const url = process.env.NEXT_PUBLIC_PLANPET_WEBHOOK;
  if (!url) throw new Error('sin-webhook');
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({
      token: process.env.NEXT_PUBLIC_PLANPET_TOKEN ?? '',
      email,
      subject: buildPlanEmailSubject(state),
      html: buildPlanEmailHtml(state),
    }),
  });
}
