/**
 * Genera una vista previa del correo en un archivo .html para abrir en el navegador:
 *   node scripts/preview-email.mjs <archivo-salida>
 * Usa un estado de ejemplo (con foto) para ver el diseño sin enviar correos.
 */
import { buildPlanEmailHtml } from '../src/lib/email.ts';
import { generateWeek } from '../src/lib/routine.ts';
import { breedById } from '../src/lib/breeds.ts';
import { writeFile } from 'node:fs/promises';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#9b5de5"/><text x="80" y="116" font-size="92" text-anchor="middle">🐶</text></svg>`;
const photo = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

const profile = {
  name: 'Luna', breedId: 'beagle', size: 'mediano', weightKg: 12,
  ageMonths: 24, neutered: true, goals: ['mas_paseos'],
};
const members = ['Alan', 'María', 'Gonzalo'];
const assignments = generateWeek(profile, breedById('beagle'), members).map((a, i) =>
  i % 4 === 0 ? { ...a, completed: true } : a,
);
const state = {
  version: 1, emoji: '🐶', profile, coat: 'corto', energy: 'alta', members,
  mealTimes: ['08:00', '14:00', '20:00'], foodKcalPerKg: 3500, registered: false,
  vetName: '', vetPhone: '', notes: '', pending: [], weekStart: '2026-06-22',
  assignments, history: [], medical: [], photo, points: {}, donatedKg: 0, redeemed: [],
};

const out = process.argv[2] ?? 'preview-correo.html';
await writeFile(out, buildPlanEmailHtml(state), 'utf8');
console.log('Vista previa generada en:', out);
