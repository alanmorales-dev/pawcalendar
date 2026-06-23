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
  line: '#edecf5',
};

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_FG = ['#5b8cff', '#ff6b9d', '#2ec4b6', '#9b5de5', '#f7b731', '#ff884b', '#ff4757'];
const MEMBER_BG = ['#ffe0ee', '#dce7ff', '#ecdeff', '#fff3c7', '#d4f5f2', '#ffe5d6'];
const MEMBER_FG = ['#ff6b9d', '#5b8cff', '#9b5de5', '#b8860b', '#2ec4b6', '#ff884b'];

const TASK_LABEL: Record<TaskType, string> = {
  food: 'Alimentación',
  walk: 'Paseo',
  bath: 'Higiene',
  health: 'Salud',
  shop: 'Compras',
};
const TASK_ICON: Record<TaskType, string> = { food: '🍚', walk: '🦮', bath: '🛁', health: '💊', shop: '🛒' };
const TASK_BG: Record<TaskType, string> = {
  food: '#ffe0ee',
  walk: '#d4f5f2',
  bath: '#dce7ff',
  health: '#fff3c7',
  shop: '#ecdeff',
};

export function buildPlanEmailSubject(state: PlannerState): string {
  return `El plan de cuidado de ${state.profile.name} — PawCalendar`;
}

/** Grilla visual de la semana (solo lectura, replica la vista del planificador). */
function weekGridHtml(state: PlannerState): string {
  const head =
    `<td style="padding:6px 2px"></td>` +
    DAYS.map(
      (d, i) =>
        `<td style="padding:6px 2px;text-align:center;font-size:11px;font-weight:800;color:${DAY_FG[i]};text-transform:uppercase">${d}</td>`,
    ).join('');

  const rows = state.members
    .map((m, mi) => {
      const tag = `<span style="display:inline-block;background:${MEMBER_BG[mi % 6]};color:${MEMBER_FG[mi % 6]};padding:4px 10px;border-radius:50px;font-size:12px;font-weight:800;white-space:nowrap">${m}</span>`;
      const cells = DAYS.map((_, d) => {
        const chips = state.assignments
          .filter((a) => a.member === m && a.day === d)
          .map(
            (a) =>
              `<span style="display:inline-block;width:24px;height:24px;line-height:22px;text-align:center;background:${TASK_BG[a.type]};border-radius:7px;font-size:13px;margin:1px;${a.completed ? 'box-shadow:inset 0 0 0 2px ' + PALETTE.green + ';' : ''}">${TASK_ICON[a.type]}</span>`,
          )
          .join('');
        return `<td style="padding:4px 2px;text-align:center;border-top:1px solid ${PALETTE.line}">${chips || `<span style="color:#cfcde0">·</span>`}</td>`;
      }).join('');
      return `<tr><td style="padding:5px 6px 5px 0;border-top:1px solid ${PALETTE.line}">${tag}</td>${cells}</tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${head}</tr>${rows}</table>`;
}

function legendHtml(): string {
  return (['food', 'walk', 'bath', 'health', 'shop'] as TaskType[])
    .map(
      (t) =>
        `<span style="display:inline-block;margin:2px 12px 2px 0;font-size:11px;color:${PALETTE.muted};font-weight:700;white-space:nowrap"><span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;background:${TASK_BG[t]};border-radius:5px;font-size:11px;vertical-align:middle;margin-right:3px">${TASK_ICON[t]}</span>${TASK_LABEL[t]}</span>`,
    )
    .join('');
}

export function buildPlanEmailHtml(state: PlannerState): string {
  const { profile, emoji } = state;
  const plan = buildFeedingPlan(profile, { foodKcalPerKg: state.foodKcalPerKg });
  const next = healthMilestones(profile.ageMonths, profile.size)[0];

  const total = state.assignments.length;
  const done = state.assignments.filter((a) => a.completed).length;
  const stats =
    `<span style="display:inline-block;background:${PALETTE.green}22;color:${PALETTE.green};font-size:12px;font-weight:700;padding:3px 10px;border-radius:50px;margin-right:6px">${done} hechas</span>` +
    `<span style="display:inline-block;background:${PALETTE.pink}22;color:${PALETTE.pink};font-size:12px;font-weight:700;padding:3px 10px;border-radius:50px">${total - done} pendientes</span>`;

  const avatar = state.photo
    ? `<img src="${state.photo}" width="76" height="76" alt="${profile.name}" style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:3px solid #ffffffaa" />`
    : `<div style="font-size:44px;line-height:1">${emoji}</div>`;

  const regBlock = state.registered
    ? ''
    : `<tr><td style="padding:14px 18px;background:#fff3c7;border-radius:12px;font-size:13px;color:${PALETTE.text};line-height:1.5">
         <strong>Recuerda inscribir a ${profile.name}</strong> en el Registro Nacional de Mascotas
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
        <tr><td style="background:linear-gradient(135deg,${PALETTE.pink},${PALETTE.purple});padding:26px 24px;text-align:center">
          ${avatar}
          <div style="color:#fff;font-size:22px;font-weight:800;margin-top:8px">El plan de ${profile.name} ya está listo</div>
          <div style="color:#ffffffcc;font-size:14px;margin-top:4px">Gracias por usar PawCalendar</div>
        </td></tr>
        <tr><td style="padding:24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${card(
              'Distribución de la semana',
              `<div style="margin-bottom:12px">${stats}</div>
               ${weekGridHtml(state)}
               <div style="margin-top:14px">${legendHtml()}</div>`,
            )}
            ${card(
              'Alimentación',
              `<div style="font-size:15px;color:${PALETTE.text};font-weight:700;line-height:1.6">
                 ${plan.gramsPerDay} g al día (${plan.cupsPerDay} tazas) en ${plan.mealsPerDay} comidas de ${plan.gramsPerMeal} g.
               </div>
               <div style="font-size:13px;color:${PALETTE.muted};margin-top:6px">Horarios: ${state.mealTimes.join(' · ')}</div>`,
            )}
            ${next
              ? card(
                  'Próximo en salud',
                  `<div style="font-size:14px;color:${PALETTE.text};font-weight:700">${next.label}</div>
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
