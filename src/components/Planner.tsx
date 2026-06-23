'use client';

import { useEffect, useRef, useState } from 'react';
import { breedById } from '@/lib/breeds';
import { buildFeedingPlan } from '@/lib/feeding';
import { generateWeek, leastLoadedOther } from '@/lib/routine';
import { healthMilestones, type HealthMilestone } from '@/lib/health';
import { sendPlanEmail } from '@/lib/email';
import { badges, pointsForCompletion, REWARDS, totalPoints, type Reward } from '@/lib/rewards';
import { fileToThumbnail } from '@/lib/photo';
import { mondayOf, saveState, uid, type PlannerState, type Priority } from '@/lib/storage';
import type { Goal, MedicalRecord, TaskType } from '@/lib/types';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TAGS = ['tag-0', 'tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5'];
const DOTS = ['dot-0', 'dot-1', 'dot-2', 'dot-3', 'dot-4', 'dot-5'];

const TYPE_DATA: Record<TaskType, { icon: string; label: string }> = {
  food: { icon: '🍚', label: 'Alimentación' },
  walk: { icon: '🦮', label: 'Paseo' },
  bath: { icon: '🛁', label: 'Higiene' },
  health: { icon: '💊', label: 'Salud' },
  shop: { icon: '🛒', label: 'Compras' },
};
const TYPES: TaskType[] = ['food', 'walk', 'bath', 'health', 'shop'];

const MED_LABEL: Record<MedicalRecord['kind'], string> = {
  vacuna: 'Vacuna',
  control: 'Control',
  medicamento: 'Medicamento',
};

function formatWeek(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function formatAge(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
  if (m === 0) return `${y} ${y === 1 ? 'año' : 'años'}`;
  return `${y} a ${m} m`;
}

function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

interface Props {
  initial: PlannerState;
  onReconfigure: () => void;
}

export default function Planner({ initial, onReconfigure }: Props) {
  const [s, setS] = useState(initial);
  const [mode, setMode] = useState<'marcar' | 'editar'>('marcar');
  const [selType, setSelType] = useState<TaskType>('food');
  const [toast, setToast] = useState({ msg: '', on: false });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [pendText, setPendText] = useState('');
  const [pendPrio, setPendPrio] = useState<Priority>('normal');
  // índice de la tarea cuyo menú "hoy no puedo" está abierto (modo marcar)
  const [menuIdx, setMenuIdx] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [redeemMember, setRedeemMember] = useState(initial.members[0] ?? '');
  const [medKind, setMedKind] = useState<MedicalRecord['kind']>('vacuna');
  const [medName, setMedName] = useState('');
  const [medDate, setMedDate] = useState('');

  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const taskPhotoRef = useRef<HTMLInputElement>(null);
  const verifyIdxRef = useRef<number | null>(null);

  const plan = buildFeedingPlan(s.profile, { foodKcalPerKg: s.foodKcalPerKg });
  const effectiveBreed = { ...breedById(s.profile.breedId), size: s.profile.size, coat: s.coat, energy: s.energy };
  const breedName = breedById(s.profile.breedId).name;
  const milestones = healthMilestones(s.profile.ageMonths, s.profile.size);

  const total = s.assignments.length;
  const done = s.assignments.filter((a) => a.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // persistir cada cambio confirmado por React
  useEffect(() => {
    saveState(s);
  }, [s]);

  // forma funcional siempre: varios taps en el mismo batch no deben pisarse
  function update(fn: (prev: PlannerState) => PlannerState) {
    setS(fn);
  }

  function showToast(msg: string) {
    setToast({ msg, on: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 2200);
  }

  // ── grilla + PawPoints ──
  function toggleDone(idx: number) {
    const a = s.assignments[idx];
    const turningOn = !a.completed;
    const gained = turningOn
      ? pointsForCompletion({ alreadyAwarded: !!a.awarded, hadPhoto: !!a.photo, withPhoto: false })
      : 0;
    update((prev) => ({
      ...prev,
      points: { ...prev.points, [a.member]: (prev.points[a.member] ?? 0) + gained },
      assignments: prev.assignments.map((x, i) =>
        i === idx ? { ...x, completed: turningOn, awarded: x.awarded || turningOn } : x,
      ),
    }));
    if (turningOn) {
      showToast(gained > 0 ? `+${gained} PawPoints para ${a.member}` : `${TYPE_DATA[a.type].label} hecha`);
    } else {
      showToast(`${TYPE_DATA[a.type].label} pendiente`);
    }
  }

  function startVerify(idx: number) {
    verifyIdxRef.current = idx;
    setMenuIdx(null);
    taskPhotoRef.current?.click();
  }

  async function onTaskPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const idx = verifyIdxRef.current;
    verifyIdxRef.current = null;
    if (!file || idx == null) return;
    try {
      const thumb = await fileToThumbnail(file);
      const a = s.assignments[idx];
      const gained = pointsForCompletion({ alreadyAwarded: !!a.awarded, hadPhoto: !!a.photo, withPhoto: true });
      update((prev) => ({
        ...prev,
        points: { ...prev.points, [a.member]: (prev.points[a.member] ?? 0) + gained },
        assignments: prev.assignments.map((x, i) =>
          i === idx ? { ...x, completed: true, photo: thumb, awarded: true } : x,
        ),
      }));
      showToast(
        gained > 0 ? `+${gained} PawPoints para ${a.member} · verificada` : `${TYPE_DATA[a.type].label} verificada`,
      );
    } catch {
      showToast('No se pudo procesar la foto');
    }
  }

  async function onProfilePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const thumb = await fileToThumbnail(file, 320, 0.7);
      update((prev) => ({ ...prev, photo: thumb }));
      showToast('Foto actualizada');
    } catch {
      showToast('No se pudo procesar la foto');
    }
  }

  function removeTask(idx: number) {
    const a = s.assignments[idx];
    update((prev) => ({ ...prev, assignments: prev.assignments.filter((_, i) => i !== idx) }));
    showToast(`${TYPE_DATA[a.type].label} eliminada`);
  }

  function addTask(member: string, day: number) {
    update((prev) => ({ ...prev, assignments: [...prev.assignments, { member, day, type: selType, completed: false }] }));
    showToast(`${TYPE_DATA[selType].label} asignada a ${member}`);
  }

  // "Hoy no puedo": a quién pasarle esta tarea (null si vive solo)
  function reassignTarget(idx: number): string | null {
    const a = s.assignments[idx];
    return leastLoadedOther(s.assignments, s.members, a.member, a.day);
  }

  function reassignTask(idx: number) {
    const target = reassignTarget(idx);
    if (!target) return;
    update((prev) => ({
      ...prev,
      assignments: prev.assignments.map((x, i) => (i === idx ? { ...x, member: target } : x)),
    }));
    setMenuIdx(null);
    showToast(`Pasó a ${target}`);
  }

  function moveToTomorrow(idx: number) {
    const a = s.assignments[idx];
    if (a.day >= 6) return;
    update((prev) => ({
      ...prev,
      assignments: prev.assignments.map((x, i) => (i === idx ? { ...x, day: x.day + 1 } : x)),
    }));
    setMenuIdx(null);
    showToast(`${TYPE_DATA[a.type].label} movida a ${DAYS[a.day + 1]}`);
  }

  function redeem(r: Reward, member: string) {
    if ((s.points[member] ?? 0) < r.cost) {
      showToast(`A ${member} le faltan PawPoints`);
      return;
    }
    update((prev) => ({
      ...prev,
      points: { ...prev.points, [member]: (prev.points[member] ?? 0) - r.cost },
      donatedKg: r.kind === 'donacion' ? prev.donatedKg + 1 : prev.donatedKg,
      redeemed: [...prev.redeemed, r.id],
    }));
    showToast(r.kind === 'donacion' ? `${member} donó 1 kg de alimento. ¡Gracias!` : `${member} canjeó: ${r.label}`);
  }

  async function emailPlan() {
    const email = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Revisa el correo');
      return;
    }
    setSending(true);
    try {
      await sendPlanEmail(email, s);
      setEmailInput('');
      showToast(`Enviamos el plan a ${email}`);
    } catch {
      showToast('No se pudo enviar (falta configurar el correo)');
    } finally {
      setSending(false);
    }
  }

  function addHealthPending(m: HealthMilestone) {
    update((prev) =>
      prev.pending.some((p) => p.text === m.label)
        ? prev
        : { ...prev, pending: [...prev.pending, { id: uid(), text: m.label, prio: 'alta', done: false }] },
    );
    showToast(`${m.label} en pendientes`);
  }

  function addMedical() {
    const name = medName.trim();
    if (!name) return;
    update((prev) => ({
      ...prev,
      medical: [...prev.medical, { id: uid(), kind: medKind, name, date: medDate || todayISO() }],
    }));
    setMedName('');
    setMedDate('');
  }

  function regenerate() {
    if (!confirm('Esto reemplaza todas las tareas de la semana por la rutina sugerida. ¿Continuar?')) return;
    update((prev) => ({
      ...prev,
      assignments: generateWeek(prev.profile, effectiveBreed, prev.members),
      weekStart: mondayOf(new Date()),
    }));
    showToast('Rutina regenerada');
  }

  function closeWeek() {
    if (!confirm(`¿Archivar esta semana (${pct}% completada) y partir una nueva?`)) return;
    update((prev) => ({
      ...prev,
      history: [
        ...prev.history,
        { start: prev.weekStart, total: prev.assignments.length, completed: prev.assignments.filter((a) => a.completed).length },
      ],
      assignments: prev.assignments.map((a) => ({ ...a, completed: false, photo: undefined, awarded: false })),
      weekStart: mondayOf(new Date()),
    }));
    showToast('Semana archivada');
  }

  function addPending() {
    const text = pendText.trim();
    if (!text) return;
    update((prev) => ({ ...prev, pending: [...prev.pending, { id: uid(), text, prio: pendPrio, done: false }] }));
    setPendText('');
  }

  function togglePending(id: string) {
    update((prev) => ({ ...prev, pending: prev.pending.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
  }

  // ── métricas de objetivos ──
  function goalMetric(goal: Goal): { label: string; done: number; total: number; note: string } {
    const ofType = (t: TaskType) => ({
      done: s.assignments.filter((a) => a.type === t && a.completed).length,
      total: s.assignments.filter((a) => a.type === t).length,
    });
    switch (goal) {
      case 'mas_paseos': {
        const w = ofType('walk');
        return { label: 'Más paseos', ...w, note: `${w.done} de ${w.total} paseos esta semana` };
      }
      case 'controlar_peso': {
        const w = ofType('walk');
        return { label: 'Controlar peso', ...w, note: `Meta: ${plan.kcalPerDay} kcal/día · paseos ${w.done}/${w.total}` };
      }
      case 'rutina_salud': {
        const h = ofType('health');
        return { label: 'Rutina de salud', ...h, note: `${h.done} de ${h.total} tareas de salud` };
      }
      case 'repartir_tareas': {
        const counts = s.members.map((m) => s.assignments.filter((a) => a.member === m).length);
        return {
          label: 'Repartir tareas',
          done: Math.min(...counts),
          total: Math.max(...counts),
          note: s.members.map((m, i) => `${m}: ${counts[i]}`).join(' · '),
        };
      }
    }
  }

  return (
    <div className="wrapper">
      {/* HEADER */}
      <div className="header">
        <div className="logo-area">
          <div className="pet-avatar">
            {s.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniatura dataURL local, no aplica next/image
              <img src={s.photo} alt={s.profile.name} />
            ) : (
              s.emoji
            )}
          </div>
          <div className="logo-text">
            <h1>PawCalendar</h1>
            <p>Semana del {formatWeek(s.weekStart)} · Cuidado de {s.profile.name}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="progress-card">
            <div className="progress-info">
              <div className="progress-label">Progreso semanal</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="progress-pct">{pct}%</div>
          </div>
          <div className="points-chip" title="PawPoints acumulados">
            <span className="points-chip-num">{totalPoints(s.points)}</span> PawPoints
          </div>
          <a className="icon-btn" href="/simulador" title="Simulador de adopción">🔍</a>
          <button className="icon-btn" title="Reconfigurar planificador" onClick={onReconfigure}>
            ⚙️
          </button>
        </div>
      </div>

      {/* BANNER REGISTRO NACIONAL */}
      {!s.registered && (
        <div className="reg-banner">
          <div className="reg-text">
            <strong>{s.profile.name} aún no está en el Registro Nacional de Mascotas</strong>
            <span>La inscripción con microchip es obligatoria por ley (Ley 21.020). En Chile solo 1 de cada 4 dueños la cumple.</span>
          </div>
          <a className="reg-link" href="https://www.registratumascota.cl" target="_blank" rel="noopener noreferrer">
            Inscribir
          </a>
          <button
            className="reg-done"
            onClick={() => {
              update((prev) => ({ ...prev, registered: true }));
              showToast('Registro completado');
            }}
          >
            Ya está inscrito
          </button>
        </div>
      )}

      {/* MODO + TIPOS */}
      <div className="picker-section">
        <div className="mode-switch">
          <button className={`mode-btn ${mode === 'marcar' ? 'active' : ''}`} onClick={() => setMode('marcar')}>
            Marcar
          </button>
          <button className={`mode-btn ${mode === 'editar' ? 'active' : ''}`} onClick={() => setMode('editar')}>
            Editar
          </button>
        </div>
        {mode === 'editar' && (
          <>
            {TYPES.map((t) => (
              <button key={t} className={`task-btn ${selType === t ? `sel-${t}` : ''}`} onClick={() => setSelType(t)}>
                <span className="btn-icon">{TYPE_DATA[t].icon}</span> {TYPE_DATA[t].label}
              </button>
            ))}
            <button className="small-btn" onClick={regenerate}>Regenerar rutina</button>
          </>
        )}
        <span className="picker-hint">
          {mode === 'marcar'
            ? 'Toca una tarea pendiente para marcarla, verificarla con foto, reasignarla o moverla'
            : 'Clic en una celda asigna · clic en una tarea la quita'}
        </span>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="table-card">
          <div className="table-header">
            <div className="section-title">Distribución de tareas</div>
            <div className="stats-chips">
              <span className="chip chip-done">{done} hechas</span>
              <span className="chip chip-pend">{total - done} pendientes</span>
              <button className="small-btn" onClick={closeWeek}>Nueva semana</button>
            </div>
          </div>
          <div className={`table-wrap ${menuIdx !== null ? 'menu-open' : ''}`}>
            <table>
              <thead>
                <tr>
                  <th className="member-th">Integrante</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className={`day-th day-${i}`}>
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.members.map((m, mi) => (
                  <tr key={m}>
                    <td className="member-col">
                      <span className={`member-tag ${TAGS[mi % 6]}`}>
                        <span className={`tag-dot ${DOTS[mi % 6]}`} />
                        {m}
                      </span>
                    </td>
                    {DAYS.map((_, day) => {
                      const cellTasks = s.assignments
                        .map((a, idx) => ({ a, idx }))
                        .filter(({ a }) => a.member === m && a.day === day);
                      return (
                        <td key={day}>
                          <div
                            className={`cell ${mode === 'editar' ? 'editable' : ''}`}
                            onClick={mode === 'editar' ? () => addTask(m, day) : undefined}
                          >
                            {cellTasks.map(({ a, idx }) => {
                              const open = menuIdx === idx;
                              const target = open ? reassignTarget(idx) : null;
                              return (
                                <span className="chip-wrap" key={idx}>
                                  <button
                                    className={`task-chip t-${a.type} ${a.completed ? 'done' : ''} ${a.photo ? 'verified' : ''}`}
                                    title={`${TYPE_DATA[a.type].label}${a.photo ? ' · verificada con foto' : a.completed ? ' · hecha' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (mode === 'editar') {
                                        removeTask(idx);
                                      } else if (a.completed) {
                                        toggleDone(idx);
                                      } else {
                                        setMenuIdx(open ? null : idx);
                                      }
                                    }}
                                  >
                                    {TYPE_DATA[a.type].icon}
                                  </button>
                                  {open && (
                                    <div className="task-menu" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => { toggleDone(idx); setMenuIdx(null); }}>¡Hecha! +10</button>
                                      <button onClick={() => startVerify(idx)}>Verificar con foto +15</button>
                                      {target && <button onClick={() => reassignTask(idx)}>Hoy no puedo · pasar a {target}</button>}
                                      {a.day < 6 && <button onClick={() => moveToTomorrow(idx)}>Mover a {DAYS[a.day + 1]}</button>}
                                    </div>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="legend">
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--pink-light)' }}>🍚</span> Alimentación</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--green-light)' }}>🦮</span> Paseo</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--blue-light)' }}>🛁</span> Higiene</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--yellow-light)' }}>💊</span> Salud</div>
            <div className="legend-item"><span className="legend-swatch" style={{ background: 'var(--purple-light)' }}>🛒</span> Compras</div>
          </div>
        </div>

        {/* PANELES */}
        <div className="right-col">
          {/* PAWPOINTS */}
          <div className="panel">
            <div className="panel-header points-h">PawPoints del hogar</div>
            <div className="panel-body" style={{ paddingTop: 12 }}>
              {[...s.members]
                .sort((a, b) => (s.points[b] ?? 0) - (s.points[a] ?? 0))
                .map((m, rank) => {
                  const pts = s.points[m] ?? 0;
                  const max = Math.max(1, ...s.members.map((x) => s.points[x] ?? 0));
                  return (
                    <div className="rank-row" key={m}>
                      <span className="rank-pos">{rank + 1}</span>
                      <div className="rank-info">
                        <div className="rank-top">
                          <span className="rank-name">{m}</span>
                          <span className="rank-pts">{pts}</span>
                        </div>
                        <div className="rank-track">
                          <div className="rank-fill" style={{ width: `${(pts / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              {s.donatedKg > 0 && (
                <div className="points-donated">El hogar donó {s.donatedKg} kg de alimento a fundaciones</div>
              )}
              <button className="btn-primary full" onClick={() => setShowRewards(true)}>
                Canjear recompensas
              </button>
              <div className="badges">
                {badges(s).map((b) => (
                  <span key={b.id} className={`badge ${b.earned ? 'on' : ''}`} title={b.detail}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CORREO */}
          <div className="panel">
            <div className="panel-header email-h">Recibe tu plan por correo</div>
            <div className="panel-body" style={{ paddingTop: 10 }}>
              <p className="meal-detail" style={{ marginBottom: 10 }}>
                Te enviamos el resumen del plan de {s.profile.name} a tu correo.
              </p>
              <div className="pend-add">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !sending && emailPlan()}
                  placeholder="tucorreo@ejemplo.cl"
                />
                <button className="small-btn" onClick={emailPlan} disabled={sending}>
                  {sending ? '…' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>

          {/* PERFIL */}
          <div className="panel">
            <div className="panel-header profile-h">Perfil de {s.profile.name}</div>
            <div className="panel-body" style={{ paddingTop: 12 }}>
              <div className="profile-top">
                <div className="profile-photo">
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura dataURL local, no aplica next/image
                    <img src={s.photo} alt={s.profile.name} />
                  ) : (
                    <span>{s.emoji}</span>
                  )}
                </div>
                <div className="profile-meta">
                  <strong>{s.profile.name}</strong>
                  <span className="profile-line">Perro · {breedName}</span>
                  <span className="profile-line">{formatAge(s.profile.ageMonths)} · {s.profile.weightKg} kg</span>
                  <button className="small-btn" onClick={() => profilePhotoRef.current?.click()}>
                    Cambiar foto
                  </button>
                </div>
              </div>

              <div className="med-title">Historial médico</div>
              {s.medical.length === 0 && <p className="meal-detail" style={{ marginBottom: 8 }}>Sin registros aún.</p>}
              {s.medical.map((m) => (
                <div className="med-row" key={m.id}>
                  <span className={`med-tag med-${m.kind}`}>{MED_LABEL[m.kind]}</span>
                  <div className="med-info">
                    <strong>{m.name}</strong>
                    <span>{m.date}</span>
                  </div>
                  <button
                    className="pend-del"
                    onClick={() => update((prev) => ({ ...prev, medical: prev.medical.filter((x) => x.id !== m.id) }))}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div className="med-add">
                <select value={medKind} onChange={(e) => setMedKind(e.target.value as MedicalRecord['kind'])}>
                  <option value="vacuna">Vacuna</option>
                  <option value="control">Control</option>
                  <option value="medicamento">Medicamento</option>
                </select>
                <input
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMedical()}
                  placeholder="Ej: Antirrábica"
                />
                <input type="date" value={medDate} onChange={(e) => setMedDate(e.target.value)} />
                <button className="small-btn" onClick={addMedical}>＋</button>
              </div>
            </div>
          </div>

          {/* COMIDAS */}
          <div className="panel">
            <div className="panel-header meal-h">Horarios de comida</div>
            <div className="panel-body" style={{ paddingTop: 10 }}>
              {s.mealTimes.map((t, i) => (
                <div className="meal-row" key={i}>
                  <span className={`meal-time-badge ${parseInt(t) >= 15 ? 'pm' : ''}`}>{t}</span>
                  <div className="meal-detail">
                    <strong>Comida {i + 1}</strong>
                    {plan.gramsPerMeal} g · Agua fresca
                  </div>
                </div>
              ))}
              <div className="weight-badge">
                {s.profile.weightKg} kg · {plan.gramsPerDay} g/día ({plan.cupsPerDay} tazas)
              </div>
              <details className="assumptions">
                <summary>¿Cómo se calculó?</summary>
                <ul>
                  {plan.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </details>
              <p className="disclaimer">Orientativo: no reemplaza a tu veterinario/a.</p>
            </div>
          </div>

          {/* OBJETIVOS */}
          {s.profile.goals.length > 0 && (
            <div className="panel">
              <div className="panel-header goal-h">Objetivos</div>
              <div className="panel-body" style={{ paddingTop: 4 }}>
                {s.profile.goals.map((g) => {
                  const metric = goalMetric(g);
                  const goalPct = metric.total === 0 ? 0 : Math.round((metric.done / metric.total) * 100);
                  return (
                    <div className="goal-row" key={g}>
                      <div className="goal-name">
                        <span>{metric.label}</span>
                        <span>{goalPct}%</span>
                      </div>
                      <div className="goal-track">
                        <div className="goal-fill" style={{ width: `${goalPct}%` }} />
                      </div>
                      <div className="goal-note">{metric.note}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CALENDARIO SANITARIO */}
          <div className="panel">
            <div className="panel-header health-h">Calendario sanitario</div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              {milestones.map((m, i) => (
                <div className="health-row" key={i}>
                  <div className="health-info">
                    <strong>{m.label}</strong>
                    <span>{m.detail}</span>
                  </div>
                  <button className="health-add" title="Agregar a pendientes" onClick={() => addHealthPending(m)}>
                    ＋
                  </button>
                </div>
              ))}
              <p className="disclaimer">Frecuencias referenciales. La pauta definitiva la indica tu veterinario/a.</p>
            </div>
          </div>

          {/* PENDIENTES */}
          <div className="panel">
            <div className="panel-header pend-h">Pendientes</div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              {s.pending.map((p) => (
                <div className="pend-item" key={p.id}>
                  <button className={`pcheck ${p.done ? 'on' : ''}`} onClick={() => togglePending(p.id)}>
                    ✓
                  </button>
                  <span className={`pend-name ${p.done ? 'crossed' : ''}`} onClick={() => togglePending(p.id)}>
                    {p.text}
                  </span>
                  <div className={`prio prio-${p.prio}`} title={`Prioridad ${p.prio}`} />
                  <button className="pend-del" onClick={() => update((prev) => ({ ...prev, pending: prev.pending.filter((x) => x.id !== p.id) }))}>
                    ×
                  </button>
                </div>
              ))}
              <div className="pend-add">
                <input
                  value={pendText}
                  onChange={(e) => setPendText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPending()}
                  placeholder="Nuevo pendiente…"
                />
                <select value={pendPrio} onChange={(e) => setPendPrio(e.target.value as Priority)}>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="normal">Normal</option>
                  <option value="baja">Baja</option>
                </select>
                <button className="small-btn" onClick={addPending}>＋</button>
              </div>
            </div>
          </div>

          {/* NOTAS */}
          <div className="panel">
            <div className="panel-header notes-h">Notas del equipo</div>
            <div className="panel-body" style={{ paddingTop: 10 }}>
              <textarea
                className="notes-input"
                rows={3}
                value={s.notes}
                placeholder="Notas para la casa…"
                onChange={(e) => update((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* EMERGENCIAS */}
          <div className="panel">
            <div className="panel-header emerg-h">Emergencias</div>
            <div className="panel-body" style={{ paddingTop: 8 }}>
              <div className="emerg-row">
                <span className="emerg-tag">Vet</span>
                <input
                  value={s.vetName}
                  placeholder="Nombre veterinario/a"
                  onChange={(e) => update((prev) => ({ ...prev, vetName: e.target.value }))}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
              <div className="emerg-row">
                <span className="emerg-tag">Tel</span>
                <input
                  value={s.vetPhone}
                  placeholder="+56 9 …"
                  onChange={(e) => update((prev) => ({ ...prev, vetPhone: e.target.value }))}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
            </div>
          </div>

          {/* HISTORIAL */}
          {s.history.length > 0 && (
            <div className="panel">
              <div className="panel-header notes-h">Semanas anteriores</div>
              <div className="panel-body" style={{ paddingTop: 6 }}>
                {[...s.history].reverse().slice(0, 4).map((h, i) => (
                  <div className="hist-row" key={i}>
                    <span>Semana del {formatWeek(h.start)}</span>
                    <span className="hist-pct">{h.total === 0 ? 0 : Math.round((h.completed / h.total) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CANJES (modal) */}
      {showRewards && (
        <div className="modal-backdrop" onClick={() => setShowRewards(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>Canjea tus PawPoints</strong>
              <button className="modal-x" onClick={() => setShowRewards(false)}>×</button>
            </div>
            <div className="redeem-who">
              <label>¿Quién canjea?</label>
              <select value={redeemMember} onChange={(e) => setRedeemMember(e.target.value)}>
                {s.members.map((m) => (
                  <option key={m} value={m}>
                    {m} — {s.points[m] ?? 0} pts
                  </option>
                ))}
              </select>
            </div>
            <p className="modal-sub">Aliados y fundaciones de ejemplo</p>
            {REWARDS.map((r) => (
              <div className="reward-row" key={r.id}>
                <div className="reward-info">
                  <strong>{r.label}</strong>
                  <span>{r.detail}</span>
                </div>
                <button
                  className="reward-btn"
                  disabled={(s.points[redeemMember] ?? 0) < r.cost}
                  onClick={() => redeem(r, redeemMember)}
                >
                  {r.cost} pts
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* inputs ocultos para fotos */}
      <input ref={profilePhotoRef} type="file" accept="image/*" hidden onChange={onProfilePhoto} />
      <input ref={taskPhotoRef} type="file" accept="image/*" hidden onChange={onTaskPhoto} />

      {/* backdrop para cerrar el menú "hoy no puedo" al tocar fuera */}
      {menuIdx !== null && <div className="menu-backdrop" onClick={() => setMenuIdx(null)} />}

      {/* TOAST */}
      <div className={`toast ${toast.on ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
}
