/**
 * Validación de la lógica core sin frameworks de test:
 *   node scripts/validate.mts
 * Corre 3 escenarios reales y revisa invariantes básicas.
 */
import { BREEDS, breedById } from '../src/lib/breeds.ts';
import { buildFeedingPlan } from '../src/lib/feeding.ts';
import { generateWeek, leastLoadedOther } from '../src/lib/routine.ts';
import { healthMilestones } from '../src/lib/health.ts';
import { estimateMonthlyCost, estimateWeeklyTime } from '../src/lib/simulator.ts';
import { buildPlanEmailHtml, buildPlanEmailSubject } from '../src/lib/email.ts';
import { badges, pointsForCompletion, REWARDS, totalPoints } from '../src/lib/rewards.ts';
import type { Assignment, DogProfile } from '../src/lib/types.ts';
import type { PlannerState } from '../src/lib/storage.ts';

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

// ── iteración 2: reasignación "hoy no puedo" ──
console.log(`\n━━━ Reasignación "hoy no puedo" ━━━`);
{
  const members = ['A', 'B', 'C'];
  const week: Assignment[] = [
    { member: 'A', day: 0, type: 'food', completed: false },
    { member: 'A', day: 0, type: 'walk', completed: false },
    { member: 'B', day: 0, type: 'walk', completed: false },
  ];
  // día 0: A tiene 2, B tiene 1, C tiene 0 → al pasar de A debe ir a C
  check(leastLoadedOther(week, members, 'A', 0) === 'C', 'pasa al integrante con menos carga (C)');
  // hogar de 1: no hay a quién pasar
  check(leastLoadedOther(week, ['A'], 'A', 0) === null, 'hogar de 1: no hay destino (null)');
}

// ── iteración 2: calendario sanitario ──
console.log(`\n━━━ Calendario sanitario ━━━`);
{
  const cachorro = healthMilestones(2, 'mediano');
  const adulto = healthMilestones(36, 'mediano');
  const senior = healthMilestones(108, 'mediano');
  check(cachorro.some((m) => /vacuna/i.test(m.label)), 'cachorro: incluye plan de vacunas');
  check(cachorro.some((m) => /registro/i.test(m.label)), 'cachorro: recuerda el Registro Nacional');
  check(senior.some((m) => /6 meses/i.test(m.detail)), 'senior: control cada 6 meses');
  check(adulto.length >= 3 && cachorro.length >= 3, 'cada etapa entrega varios hitos');
}

// ── iteración 2: simulador de pre-adopción ──
console.log(`\n━━━ Simulador pre-adopción ━━━`);
{
  const labrador: DogProfile = {
    name: 'x', breedId: 'labrador', size: 'grande', weightKg: 30, ageMonths: 36, neutered: false, goals: [],
  };
  const chihuahua: DogProfile = {
    name: 'x', breedId: 'chihuahua', size: 'toy', weightKg: 2.5, ageMonths: 36, neutered: false, goals: [],
  };
  const tL = estimateWeeklyTime(labrador, breedById('labrador'));
  const cL = estimateMonthlyCost(labrador, breedById('labrador'));
  const cC = estimateMonthlyCost(chihuahua, breedById('chihuahua'));
  console.log(`Labrador: ${tL.hoursPerWeek} h/sem · $${cL.totalCLP.toLocaleString('es-CL')}/mes`);
  console.log(`Chihuahua: $${cC.totalCLP.toLocaleString('es-CL')}/mes`);
  check(tL.hoursPerWeek > 0, 'tiempo semanal positivo');
  check(cL.totalCLP > cC.totalCLP, 'perro grande cuesta más al mes que uno toy');
  check(
    cL.totalCLP === cL.items.reduce((a, i) => a + i.clp, 0),
    'el total mensual es la suma de los ítems',
  );
}

// ── iteración 2: correo de bienvenida ──
console.log(`\n━━━ Correo de bienvenida ━━━`);
{
  const profile: DogProfile = {
    name: 'Luna', breedId: 'border_collie', size: 'mediano', weightKg: 10, ageMonths: 6, neutered: false, goals: [],
  };
  const state: PlannerState = {
    version: 1, emoji: '🐶', profile, coat: 'doble', energy: 'alta',
    members: ['Alan', 'Vale'], mealTimes: ['08:00', '14:00', '20:00'], foodKcalPerKg: 3500,
    registered: false, vetName: '', vetPhone: '', notes: '', pending: [], weekStart: '2026-06-15',
    assignments: generateWeek(profile, breedById('border_collie'), ['Alan', 'Vale']), history: [],
    medical: [], points: {}, donatedKg: 0, redeemed: [],
  };
  const html = buildPlanEmailHtml(state);
  check(buildPlanEmailSubject(state).includes('Luna'), 'el asunto menciona al perro');
  check(html.includes('Luna'), 'el correo menciona al perro');
  check(html.includes('Distribución de la semana'), 'incluye la grilla visual de la semana');
  check(html.includes('Alan') && html.includes('Vale'), 'la grilla lista a los integrantes');
  check(html.includes('>Lun<') && html.includes('>Dom<'), 'la grilla tiene encabezados de días');
  check(/g al día/.test(html), 'incluye la ración diaria');
  check(html.includes('Registro Nacional'), 'recuerda el registro si no está inscrito');
  const htmlReg = buildPlanEmailHtml({ ...state, registered: true });
  check(!htmlReg.includes('Registro Nacional'), 'no muestra el recordatorio si ya está inscrito');
}

// ── iteración 3: PawPoints ──
console.log(`\n━━━ PawPoints ━━━`);
{
  check(pointsForCompletion({ alreadyAwarded: false, hadPhoto: false, withPhoto: false }) === 10, 'tarea nueva sin foto: +10');
  check(pointsForCompletion({ alreadyAwarded: false, hadPhoto: false, withPhoto: true }) === 15, 'tarea nueva con foto: +15');
  check(pointsForCompletion({ alreadyAwarded: true, hadPhoto: false, withPhoto: true }) === 5, 'ya premiada, primera foto: +5');
  check(pointsForCompletion({ alreadyAwarded: true, hadPhoto: false, withPhoto: false }) === 0, 're-marcar no vuelve a premiar: 0');
  check(pointsForCompletion({ alreadyAwarded: true, hadPhoto: true, withPhoto: true }) === 0, 're-verificar foto: 0');

  const donacion = REWARDS.find((r) => r.kind === 'donacion');
  check(!!donacion && donacion.cost === 500, 'donar 1 kg cuesta 500 pts');
  check(REWARDS.every((r) => r.cost > 0), 'todos los canjes tienen costo positivo');

  const base: PlannerState = {
    version: 1, emoji: '🐶',
    profile: { name: 'Luna', breedId: 'mestizo', size: 'mediano', weightKg: 12, ageMonths: 36, neutered: true, goals: [] },
    coat: 'corto', energy: 'media', members: ['Alan', 'Vale'], mealTimes: ['08:00', '18:00'], foodKcalPerKg: 3500,
    registered: false, vetName: '', vetPhone: '', notes: '', pending: [], weekStart: '2026-06-15',
    assignments: [], history: [], medical: [], points: {}, donatedKg: 0, redeemed: [],
  };
  const b = (st: PlannerState, id: string) => badges(st).find((x) => x.id === id)?.earned;
  check(b(base, 'equipo_unido') === true, 'badge equipo unido con 2+ integrantes');
  check(b(base, 'registro_dia') === false, 'badge registro bloqueado si no inscrita');
  check(b({ ...base, registered: true }, 'registro_dia') === true, 'badge registro al inscribir');
  check(b({ ...base, donatedKg: 1 }, 'corazon_solidario') === true, 'badge solidario al donar');

  // puntos individuales por integrante
  check(totalPoints({ Alan: 30, Vale: 50 }) === 80, 'total del hogar = suma de integrantes');
  check(b({ ...base, points: { Alan: 320, Vale: 10 } }, 'dueno_del_mes') === true, 'dueño del mes si alguien llega a 300');
  check(b({ ...base, points: { Alan: 120, Vale: 90 } }, 'dueno_del_mes') === false, 'dueño del mes bloqueado bajo 300');
}

// ── catálogo ──
console.log(`\n━━━ Catálogo ━━━`);
check(BREEDS.length >= 30, `catálogo con ${BREEDS.length} razas`);
check(new Set(BREEDS.map((b) => b.id)).size === BREEDS.length, 'ids de raza únicos');

console.log(failures === 0 ? '\n✅ Todo OK' : `\n❌ ${failures} falla(s)`);
process.exit(failures === 0 ? 0 : 1);
