'use client';

import { useEffect, useRef, useState } from 'react';
import Planner from '@/components/Planner';
import Pricing from '@/components/Pricing';
import Wizard from '@/components/Wizard';
import { sendPlanEmail } from '@/lib/email';
import { loadState, saveState, type PlannerState } from '@/lib/storage';

type View = 'cargando' | 'pricing' | 'wizard' | 'planner';

export default function Home() {
  const [state, setState] = useState<PlannerState | null>(null);
  const [view, setView] = useState<View>('cargando');
  // correo capturado en la pantalla de precios; se usa para autoenviar el plan
  const pendingEmail = useRef<string | null>(null);

  // localStorage solo existe en el cliente: hay que leerlo después de montar
  // para que el primer render coincida con el HTML del servidor (hidratación).
  useEffect(() => {
    const saved = loadState();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga única post-hidratación
    setState(saved);
    setView(saved ? 'planner' : 'pricing');
  }, []);

  if (view === 'cargando') return null;

  if (view === 'pricing') {
    return (
      <Pricing
        onStart={(email) => {
          pendingEmail.current = email;
          setView('wizard');
        }}
      />
    );
  }

  if (view === 'wizard') {
    return (
      <Wizard
        initial={state ?? undefined}
        onDone={(s) => {
          saveState(s);
          setState(s);
          setView('planner');
          // autoenvío del correo al terminar la configuración (si venía de precios)
          if (pendingEmail.current) {
            void sendPlanEmail(pendingEmail.current, s).catch(() => {});
            pendingEmail.current = null;
          }
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
