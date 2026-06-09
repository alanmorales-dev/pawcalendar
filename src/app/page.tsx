'use client';

import { useEffect, useState } from 'react';
import Planner from '@/components/Planner';
import Wizard from '@/components/Wizard';
import { loadState, saveState, type PlannerState } from '@/lib/storage';

type View = 'cargando' | 'wizard' | 'planner';

export default function Home() {
  const [state, setState] = useState<PlannerState | null>(null);
  const [view, setView] = useState<View>('cargando');

  // localStorage solo existe en el cliente: hay que leerlo después de montar
  // para que el primer render coincida con el HTML del servidor (hidratación).
  useEffect(() => {
    const saved = loadState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga única post-hidratación
    setState(saved);
    setView(saved ? 'planner' : 'wizard');
  }, []);

  if (view === 'cargando') return null;

  if (view === 'wizard') {
    return (
      <Wizard
        initial={state ?? undefined}
        onDone={(s) => {
          saveState(s);
          setState(s);
          setView('planner');
        }}
      />
    );
  }

  return (
    <Planner
      key={state!.weekStart + state!.profile.name}
      initial={state!}
      onReconfigure={() => {
        // el Planner persiste sus cambios en localStorage; releer aquí evita
        // pasarle al wizard la copia desactualizada que guarda esta página
        setState(loadState());
        setView('wizard');
      }}
    />
  );
}
