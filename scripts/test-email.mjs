/**
 * Prueba end-to-end del correo (SPEC §12):
 *   TOKEN='...' node scripts/test-email.mjs <url-exec> <correo-destino>
 * Arma el correo con el mismo código de la app y lo envía vía el Apps Script,
 * leyendo la respuesta (en node sí se puede leer; el navegador usa no-cors).
 */
import { buildPlanEmailHtml, buildPlanEmailSubject } from '../src/lib/email.ts';
import { generateWeek } from '../src/lib/routine.ts';
import { breedById } from '../src/lib/breeds.ts';

const [, , url, to] = process.argv;
const token = process.env.TOKEN ?? '';

const profile = {
  name: 'Luna', breedId: 'beagle', size: 'mediano', weightKg: 12,
  ageMonths: 24, neutered: true, goals: ['mas_paseos'],
};
const state = {
  version: 1, emoji: '🐶', profile, coat: 'corto', energy: 'alta',
  members: ['Alan', 'Vale'], mealTimes: ['08:00', '14:00', '20:00'], foodKcalPerKg: 3500,
  registered: false, vetName: '', vetPhone: '', notes: '', pending: [], weekStart: '2026-06-22',
  assignments: generateWeek(profile, breedById('beagle'), ['Alan', 'Vale']), history: [],
  medical: [], points: 0, donatedKg: 0, redeemed: [],
};

const res = await fetch(url, {
  method: 'POST',
  body: JSON.stringify({ token, email: to, subject: buildPlanEmailSubject(state), html: buildPlanEmailHtml(state) }),
});
console.log('HTTP', res.status);
console.log(await res.text());
