import type { Assignment, Coat, DogProfile, Energy, MedicalRecord } from './types.ts';

/**
 * Persistencia v1: localStorage detrás de una interfaz simple.
 * En S2 se reemplaza por un adaptador Supabase con la misma forma de datos (SPEC §5).
 */

export type Priority = 'alta' | 'media' | 'normal' | 'baja';

export interface PendingItem {
  id: string;
  text: string;
  prio: Priority;
  done: boolean;
}

export interface WeekRecord {
  /** lunes de la semana archivada, ISO yyyy-mm-dd */
  start: string;
  total: number;
  completed: number;
}

export interface PlannerState {
  version: 1;
  emoji: string;
  profile: DogProfile;
  /** pelaje/energía efectivos (en mestizo los define el usuario) */
  coat: Coat;
  energy: Energy;
  members: string[];
  mealTimes: string[];
  foodKcalPerKg: number;
  /** inscrito en el Registro Nacional de Mascotas (SPEC §11.2) */
  registered: boolean;
  vetName: string;
  vetPhone: string;
  notes: string;
  pending: PendingItem[];
  /** lunes de la semana actual, ISO yyyy-mm-dd */
  weekStart: string;
  assignments: Assignment[];
  history: WeekRecord[];
  // ── perfil y PawPoints (SPEC §13) ──
  /** foto de la mascota (miniatura dataURL) */
  photo?: string;
  medical: MedicalRecord[];
  /** saldo de PawPoints (acumula entre semanas) */
  points: number;
  /** kg de alimento donados a fundaciones (500 pts = 1 kg) */
  donatedKg: number;
  /** ids de recompensas canjeadas (historial simple) */
  redeemed: string[];
}

const KEY = 'planpet-v1';

export function loadState(): PlannerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlannerState;
    if (parsed.version !== 1) return null;
    // campos agregados en iteraciones posteriores: estados viejos no los traen
    if (typeof parsed.registered !== 'boolean') parsed.registered = false;
    if (!Array.isArray(parsed.medical)) parsed.medical = [];
    if (typeof parsed.points !== 'number') parsed.points = 0;
    if (typeof parsed.donatedKg !== 'number') parsed.donatedKg = 0;
    if (!Array.isArray(parsed.redeemed)) parsed.redeemed = [];
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: PlannerState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(KEY);
}

/** lunes de la semana de `date`, en ISO yyyy-mm-dd (fecha local, no UTC) */
export function mondayOf(date: Date): string {
  const d = new Date(date);
  const offset = (d.getDay() + 6) % 7; // getDay: 0=Dom → lunes retrocede 6
  d.setDate(d.getDate() - offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultMealTimes(mealsPerDay: number): string[] {
  switch (mealsPerDay) {
    case 4:
      return ['07:00', '12:00', '17:00', '21:00'];
    case 3:
      return ['08:00', '14:00', '20:00'];
    default:
      return ['08:00', '18:00'];
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
