/**
 * Validación de la lógica core sin frameworks de test:
 *   node scripts/validate.mts
 * Corre 3 escenarios reales y revisa invariantes básicas.
 */
import { BREEDS, breedById } from '../src/lib/breeds.ts';
import { buildFeedingPlan } from '../src/lib/feeding.ts';
import { generateWeek } from '../src/lib/routine.ts';
import type { Assignment, DogProfile } from '../src/lib/types.ts';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const LETTER: Record<string, string> = { food: 'A', walk: 'P', bath: 'H', health: 'S', shop: 'C' };

let failures = 0;

function check(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`  ✗ FALLA: ${label}`);
  } else {
    console.log(`  ✓ ${label}`);
  }
}

function showScenario(title: string, profile: DogProfile, members: string[]) {
  const breed = breedById(profile.breedId);
  console.log(`\n━━━ ${title} ━━━`);

  const plan = buildFeedingPlan(profile);
  console.log(
    `Alimentación: ${plan.kcalPerDay} kcal/día → ${plan.gramsPerDay} g/día ` +
      `(${plan.cupsPerDay} tazas) en ${plan.mealsPerDay} comidas de ${plan.gramsPerMeal} g`,
  );
  for (const a of plan.assumptions) console.log(`   · ${a}`);

  const week = generateWeek(profile, breed, members);

  // grilla ASCII: integrantes × días
  const header = '            ' + DAYS.map((d) => d.padEnd(6)).join('');
  console.log(header);
  for (const m of members) {
    const row = DAYS.map((_, day) =>
      week
        .filter((a) => a.member === m && a.day === day)
        .map((a) => LETTER[a.type])
        .join('')
        .padEnd(6),
    ).join('');
    console.log(`${m.padEnd(12)}${row}`);
  }
  console.log('            (A=alimentación P=paseo H=higiene S=salud C=compras)');

  // invariantes
  const loads = members.map((m) => week.filter((a) => a.member === m).length);
  check(week.filter((a) => a.type === 'food').length === 7, 'hay 1 alimentación cada día');
  check(week.filter((a) => a.type === 'shop').length === 1, 'hay 1 compras por semana');
  check(Math.max(...loads) - Math.min(...loads) <= 2, `carga balanceada (${loads.join(', ')})`);
  check(plan.gramsPerDay > 0 && plan.kcalPerDay > 0, 'plan de alimentación positivo');

  const week2 = generateWeek(profile, breed, members);
  check(JSON.stringify(week) === JSON.stringify(week2), 'generador determinista');

  return { plan, week };
}

// ── Escenario 1: cachorro de raza activa, familia de 4 ──
const s1 = showScenario(
  'Border Collie junior (6 meses, 10 kg), 4 integrantes',
  { name: 'Luna', breedId: 'border_collie', size: 'mediano', weightKg: 10, ageMonths: 6, neutered: false, goals: [] },
  ['Paulina', 'Mateo', 'Camila', 'Pedro'],
);
check(s1.plan.lifeStage === 'junior', 'etapa junior (6 meses)');
check(s1.plan.merFactor === 2.0, 'factor MER 2.0 junior');
check(s1.plan.mealsPerDay === 3, '3 comidas/día junior');
check(s1.week.filter((a: Assignment) => a.type === 'walk').length === 14, '2 paseos/día (energía alta)');

// ── Escenario 2: senior de baja energía con sobrepeso, hogar de 2 ──
const s2 = showScenario(
  'Bulldog Inglés senior (9 años, 26 kg, castrado, controlar peso), 2 integrantes',
  { name: 'Rocco', breedId: 'bulldog_ingles', size: 'mediano', weightKg: 26, ageMonths: 108, neutered: true, goals: ['controlar_peso'] },
  ['Alan', 'Vale'],
);
check(s2.plan.lifeStage === 'senior', 'etapa senior (9 años, mediano)');
check(s2.plan.merFactor === 1.0, 'factor reducido a 1.0 por controlar peso');
check(
  s2.week.filter((a: Assignment) => a.type === 'walk' && (a.day === 5 || a.day === 6)).length === 4,
  'paseo extra sáb/dom por objetivo controlar peso',
);

// ── Escenario 3: mestizo adulto, 1 integrante ──
const s3 = showScenario(
  'Mestizo adulto (3 años, 15 kg, castrado), 1 integrante',
  { name: 'Cholito', breedId: 'mestizo', size: 'mediano', weightKg: 15, ageMonths: 36, neutered: true, goals: [] },
  ['Alan'],
);
check(s3.plan.merFactor === 1.5, 'factor 1.5 adulto castrado');
check(s3.week.every((a: Assignment) => a.member === 'Alan'), 'hogar de 1: todo asignado a Alan');

// ── catálogo ──
console.log(`\n━━━ Catálogo ━━━`);
check(BREEDS.length >= 30, `catálogo con ${BREEDS.length} razas`);
check(new Set(BREEDS.map((b) => b.id)).size === BREEDS.length, 'ids de raza únicos');

console.log(failures === 0 ? '\n✅ Todo OK' : `\n❌ ${failures} falla(s)`);
process.exit(failures === 0 ? 0 : 1);
