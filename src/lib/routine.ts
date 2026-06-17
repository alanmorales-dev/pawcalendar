import type { Assignment, Breed, Coat, DogProfile, LifeStage, TaskType } from './types.ts';
import { lifeStageOf } from './feeding.ts';

/**
 * Generador de rutina semanal: motor de reglas determinista (sin aleatoriedad).
 * Misma entrada → misma semana. Reglas en SPEC.md §7.
 */

const HYGIENE_PER_WEEK: Record<Coat, number> = {
  corto: 1,
  medio: 2,
  largo: 3,
  doble: 3,
};

/** días espaciados para tareas no diarias, según cuántas veces por semana */
const SPREAD_DAYS: Record<number, number[]> = {
  1: [5],
  2: [2, 5],
  3: [1, 3, 5],
};

// orden de asignación: lo más crítico primero, para que reciba a los miembros menos cargados
const PRIORITY: TaskType[] = ['food', 'walk', 'health', 'bath', 'shop'];

export function generateWeek(profile: DogProfile, breed: Breed, members: string[]): Assignment[] {
  if (members.length === 0) throw new Error('Se necesita al menos un integrante');

  const stage = lifeStageOf(profile.ageMonths, profile.size);
  const wantsMoreWalks =
    profile.goals.includes('mas_paseos') || profile.goals.includes('controlar_peso');

  // tareas por día de la semana (0=Lun … 6=Dom)
  const tasksByDay: TaskType[][] = Array.from({ length: 7 }, () => []);

  for (let day = 0; day < 7; day++) {
    tasksByDay[day].push('food');
    for (let i = 0; i < walksPerDay(breed, stage); i++) tasksByDay[day].push('walk');
    if (wantsMoreWalks && (day === 5 || day === 6)) tasksByDay[day].push('walk');
  }

  const hygieneDays = SPREAD_DAYS[HYGIENE_PER_WEEK[breed.coat]];
  for (const day of hygieneDays) tasksByDay[day].push('bath');

  const healthPerWeek = stage === 'cachorro' || stage === 'senior' ? 2 : 1;
  for (const day of SPREAD_DAYS[healthPerWeek]) tasksByDay[day].push('health');

  tasksByDay[5].push('shop');

  // distribución balanceada: menos carga ese día primero, luego menos carga total;
  // desempate rotado por día para que no siempre parta el mismo integrante
  const totalLoad = new Map<string, number>(members.map((m) => [m, 0]));
  const assignments: Assignment[] = [];

  for (let day = 0; day < 7; day++) {
    const dayLoad = new Map<string, number>(members.map((m) => [m, 0]));
    const ordered = [...tasksByDay[day]].sort(
      (a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b),
    );

    for (const type of ordered) {
      const member = pickMember(members, day, dayLoad, totalLoad);
      dayLoad.set(member, dayLoad.get(member)! + 1);
      totalLoad.set(member, totalLoad.get(member)! + 1);
      assignments.push({ member, day, type, completed: false });
    }
  }

  return assignments;
}

/**
 * "Hoy no puedo" (SPEC §11.1): a quién pasar una tarea — el integrante con
 * menos carga ese día y, en empate, con menor carga semanal. null si no hay otro.
 */
export function leastLoadedOther(
  assignments: Assignment[],
  members: string[],
  exclude: string,
  day: number,
): string | null {
  const others = members.filter((m) => m !== exclude);
  if (others.length === 0) return null;

  const dayLoad = (m: string) => assignments.filter((a) => a.member === m && a.day === day).length;
  const weekLoad = (m: string) => assignments.filter((a) => a.member === m).length;

  let best = others[0];
  for (const m of others) {
    if (dayLoad(m) < dayLoad(best) || (dayLoad(m) === dayLoad(best) && weekLoad(m) < weekLoad(best))) {
      best = m;
    }
  }
  return best;
}

function walksPerDay(breed: Breed, stage: LifeStage): number {
  if (stage === 'cachorro') return 1; // pre-vacunas: salida/juego corto
  if (stage === 'senior') return 1;
  return breed.energy === 'alta' ? 2 : 1;
}

function pickMember(
  members: string[],
  day: number,
  dayLoad: Map<string, number>,
  totalLoad: Map<string, number>,
): string {
  // rotación por día: el "primer candidato" va cambiando a lo largo de la semana
  const rotated = members.map((_, i) => members[(i + day) % members.length]);
  let best = rotated[0];
  for (const m of rotated) {
    const better =
      dayLoad.get(m)! < dayLoad.get(best)! ||
      (dayLoad.get(m)! === dayLoad.get(best)! && totalLoad.get(m)! < totalLoad.get(best)!);
    if (better) best = m;
  }
  return best;
}
