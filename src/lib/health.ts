import { lifeStageOf } from './feeding.ts';
import type { Size } from './types.ts';

/**
 * Calendario sanitario sugerido por etapa de vida (SPEC §11.2).
 * Frecuencias referenciales de guías veterinarias estándar (plan de vacunación
 * canino usado en Chile + antirrábica obligatoria). Orientativo: la pauta
 * definitiva la da el veterinario tratante.
 */

export interface HealthMilestone {
  icon: string;
  label: string;
  detail: string;
}

export function healthMilestones(ageMonths: number, size: Size): HealthMilestone[] {
  const stage = lifeStageOf(ageMonths, size);

  if (stage === 'cachorro') {
    return [
      { icon: '💉', label: 'Plan de vacunas de cachorro', detail: 'Séxtuple/óctuple: dosis a las 6–8, 10–12 y 14–16 semanas' },
      { icon: '🪱', label: 'Desparasitación interna', detail: 'Cada mes hasta los 6 meses' },
      { icon: '🏠', label: 'Sin paseos en la calle', detail: 'Hasta completar el plan de vacunas (riesgo de parvovirus/distemper)' },
      { icon: '📋', label: 'Inscripción en el Registro Nacional', detail: 'Obligatoria por la Ley 21.020 — registratumascota.cl' },
    ];
  }

  if (stage === 'junior') {
    return [
      { icon: '💉', label: 'Vacuna antirrábica', detail: 'Primera dosis desde los 3–6 meses; refuerzo anual (obligatoria)' },
      { icon: '🪱', label: 'Desparasitación interna', detail: 'Cada 3 meses' },
      { icon: '🦟', label: 'Antiparasitario externo', detail: 'Pulgas y garrapatas: cada mes' },
      { icon: '🩺', label: 'Evaluar esterilización', detail: 'Conversa con tu veterinario/a entre los 6 y 12 meses' },
    ];
  }

  if (stage === 'senior') {
    return [
      { icon: '🩺', label: 'Control veterinario', detail: 'Cada 6 meses (chequeo geriátrico)' },
      { icon: '💉', label: 'Vacunas anuales', detail: 'Séxtuple/óctuple + antirrábica, refuerzo cada año' },
      { icon: '🪱', label: 'Desparasitación interna', detail: 'Cada 3 meses' },
      { icon: '🦟', label: 'Antiparasitario externo', detail: 'Cada mes' },
    ];
  }

  // adulto
  return [
    { icon: '💉', label: 'Vacunas anuales', detail: 'Séxtuple/óctuple + antirrábica, refuerzo cada año' },
    { icon: '🪱', label: 'Desparasitación interna', detail: 'Cada 3 meses' },
    { icon: '🦟', label: 'Antiparasitario externo', detail: 'Pulgas y garrapatas: cada mes' },
    { icon: '🩺', label: 'Control veterinario', detail: 'Chequeo general una vez al año' },
  ];
}
