import type { PlannerState } from './storage.ts';

/**
 * Economía de PawPoints (SPEC §13). Demo de feria: puntos y canjes son
 * ficticios pero el ciclo es real (completar → ganar → canjear → donar).
 * Lógica pura y determinista; el estado mutable lo maneja el componente.
 */

export const POINTS_PER_TASK = 10;
export const POINTS_PHOTO_BONUS = 5;
export const POINTS_PER_KG_DONATED = 500;

export type RewardKind = 'descuento' | 'cosmetico' | 'donacion';

export interface Reward {
  id: string;
  label: string;
  detail: string;
  cost: number;
  kind: RewardKind;
}

/** Catálogo de canjes (aliados ficticios para la feria). */
export const REWARDS: Reward[] = [
  { id: 'tema_perfil', label: 'Tema visual para el perfil', detail: 'Personaliza la ficha de tu mascota', cost: 150, kind: 'cosmetico' },
  { id: 'peluqueria', label: '20% en peluquería canina', detail: 'Red de peluquerías aliadas', cost: 400, kind: 'descuento' },
  { id: 'donacion', label: 'Donar 1 kg de alimento', detail: 'A fundaciones de rescate animal', cost: POINTS_PER_KG_DONATED, kind: 'donacion' },
  { id: 'vet', label: '15% en veterinaria aliada', detail: 'Consulta o control', cost: 300, kind: 'descuento' },
  { id: 'petshop', label: '10% en pet shop', detail: 'Alimento y accesorios', cost: 500, kind: 'descuento' },
];

export function rewardById(id: string): Reward | undefined {
  return REWARDS.find((r) => r.id === id);
}

export interface Badge {
  id: string;
  label: string;
  detail: string;
  earned: boolean;
}

/** Insignias derivadas del estado (refuerzo positivo: solo se ganan, no se pierden visualmente). */
export function badges(state: PlannerState): Badge[] {
  const completedTotal =
    state.assignments.filter((a) => a.completed).length +
    state.history.reduce((acc, h) => acc + h.completed, 0);
  const topMemberPoints = Math.max(0, ...Object.values(state.points));

  return [
    { id: 'primeros_pasos', label: 'Primeros pasos', detail: 'Completaste tu primera tarea', earned: completedTotal >= 1 },
    { id: 'equipo_unido', label: 'Equipo unido', detail: 'Reparten el cuidado entre varios', earned: state.members.length >= 2 },
    { id: 'registro_dia', label: 'Registro al día', detail: 'Inscrita en el Registro Nacional', earned: state.registered },
    { id: 'corazon_solidario', label: 'Corazón solidario', detail: 'Donaste alimento a una fundación', earned: state.donatedKg >= 1 },
    { id: 'constancia', label: 'Constancia', detail: 'Cuatro semanas de cuidado', earned: state.history.length >= 4 },
    { id: 'dueno_del_mes', label: 'Dueño del mes', detail: 'Alguien del hogar llegó a 300 PawPoints', earned: topMemberPoints >= 300 },
  ];
}

/** Total de PawPoints del hogar (suma de los integrantes). */
export function totalPoints(points: Record<string, number>): number {
  return Object.values(points).reduce((a, b) => a + b, 0);
}

/** PawPoints que otorga marcar una tarea, según si ya estaba premiada y si trae foto. */
export function pointsForCompletion(opts: { alreadyAwarded: boolean; hadPhoto: boolean; withPhoto: boolean }): number {
  const base = opts.alreadyAwarded ? 0 : POINTS_PER_TASK;
  const bonus = opts.withPhoto && !opts.hadPhoto ? POINTS_PHOTO_BONUS : 0;
  return base + bonus;
}
