# PlanPet — Especificación

> Fuente de verdad del proyecto. Cualquier cambio de alcance se decide aquí antes de codear.
> Última actualización: 2026-06-09.

**Contexto:** proyecto universitario de Alan Morales (U. Mayor) para feria académica (~2-4 semanas desde el 2026-06-09). **No** es un producto comercial y **no** es parte de Reva. Costo objetivo: $0 (free tiers).

**Origen:** maqueta visual `planificador_luna.html` (planificador semanal de cuidado de un perro). Se conserva su identidad visual; se reemplaza todo lo hardcodeado por datos reales del usuario.

---

## 1. Qué es

Web app donde una persona de la universidad se registra con su correo, configura el perfil de su perro y su casa, y obtiene un **planificador semanal de cuidado personalizado y funcional**: plan de alimentación calculado con fórmula veterinaria real y rutina semanal de tareas generada automáticamente según raza, edad e integrantes del hogar.

## 2. Flujo de usuario (feria)

1. La persona escanea un **QR** en el stand.
2. Landing simple: explica el proyecto y pide el **correo**.
3. Supabase Auth envía un **magic link** al correo (sin contraseñas).
4. Al entrar por primera vez: **wizard de configuración**.
5. Queda en su **planificador**, persistente y accesible desde cualquier dispositivo con el mismo link/correo.

## 3. Alcance

**Incluido (v1 feria):**
- Registro por magic link (Supabase Auth).
- Wizard: nombre del perro, raza (lista curada + "Mestizo / Quiltro" con tamaño manual), edad, peso, castrado sí/no, integrantes de la casa, objetivos, horarios de comida.
- **Plan de alimentación calculado** (ver §6) — feature estrella 1.
- **Rutina semanal auto-generada** (ver §7) — feature estrella 2. Editable después por el usuario.
- Separación **asignar ≠ completar**: el domingo se planifica, durante la semana se marcan tareas hechas. El progreso mide cumplimiento real.
- Pendientes editables (agregar/quitar, prioridad), notas persistentes, contactos de emergencia propios.
- Objetivos como métricas visibles (ej: paseos hechos vs meta semanal).
- Cierre de semana: archivar y partir semana nueva (historial simple).

**Iteración 2 (decidido por Alan con el equipo, 2026-06-09) — funciones anti-abandono (ver §11):**
- Reasignación de tareas "Hoy no puedo" (pregunta abierta #1 del testeo de Solemne 1).
- Checklist Registro Nacional de Mascotas + calendario sanitario sugerido por edad.
- Modo pre-adopción: simulador público de tiempo y costo mensual (sin registro).

**Fuera de alcance (decidido por Alan, 2026-06-09):**
- Sincronización realtime entre dispositivos.
- Modo demo del stand.
- Multi-mascota (v1 = 1 perro por cuenta), gatos u otras especies.
- Cualquier cosa orientada a venta: pagos, planes, landing comercial, SEO.

## 4. Stack

- **Next.js 16.2.8** (estable, App Router, TypeScript). Sin Tailwind: se hereda el CSS propio de la maqueta.
- **Supabase** free tier: Auth (magic links, envía los correos) + Postgres.
- **Vercel** free tier (deploy). **pnpm**.
- Cuentas: las **actuales de Alan**, pero con **proyecto Supabase, proyecto Vercel y repo GitHub separados**. PlanPet es desechable post-feria: nada compartido con Reva/loyalt, para poder borrarlo completo sin tocar lo demás.
- Riesgo conocido (resolver en S2): el SMTP por defecto de Supabase limita los correos de auth a ~2-4/hora — insuficiente para una feria. Opciones: SMTP propio (ej. Resend free) u otra mecánica de registro. Se decide con Alan en S2.
- Regla: no se agregan dependencias sin registrarlo aquí y consultarlo antes.
- Convención: imports relativos dentro de `src/lib/` y `scripts/` llevan extensión `.ts` explícita (permite validar la lógica con `node` puro, sin frameworks de test). `tsconfig.json` tiene `allowImportingTsExtensions: true`.

## 5. Modelo de datos (Supabase)

| Tabla | Campos clave |
|---|---|
| `planners` | `id`, `owner` (auth.uid), `dog_name`, `breed_id`, `size`, `weight_kg`, `age_months`, `neutered`, `goals jsonb`, `meal_times jsonb`, `food_kcal_per_kg`, `vet_contacts jsonb`, `notes` |
| `members` | `id`, `planner_id`, `name`, `color_idx` |
| `assignments` | `planner_id`, `week_start date`, `member_id`, `day 0-6`, `task_type`, `completed bool` |
| `pending_items` | `planner_id`, `text`, `priority`, `done` |

RLS: cada usuario solo ve/edita su propio planner. Mientras no existan las cuentas Supabase, la capa de persistencia se implementa contra `localStorage` detrás de una interfaz, y se cambia el adaptador después (misma forma de datos).

## 6. Algoritmo de alimentación (`src/lib/feeding.ts`)

Fórmulas estándar de nutrición veterinaria (citables en el póster):

- **RER** (Resting Energy Requirement) = `70 × peso_kg^0.75` kcal/día.
- **MER** (Maintenance Energy Requirement) = `RER × factor` según etapa de vida:

| Etapa | Definición | Factor |
|---|---|---|
| Cachorro | < 4 meses | 3.0 |
| Junior | 4–12 meses | 2.0 |
| Adulto castrado | — | 1.5 |
| Adulto entero | — | 1.7 |
| Senior | umbral según tamaño* | 1.3 |

\* Los perros grandes envejecen antes: gigante ≥ 6 años, grande ≥ 7, mediano ≥ 8, pequeño/toy ≥ 10.

- Objetivo "controlar peso": `factor = max(1.0, factor − 0.3)` (la pérdida de peso se prescribe cerca de 1.0×RER).
- Conversión a alimento: densidad energética **editable**, default 3500 kcal/kg de pienso seco; 1 taza ≈ 100 g.
- Comidas/día: cachorro 4, junior 3, adulto/senior 2.
- Fuentes: NRC *Nutrient Requirements of Dogs and Cats* (2006); WSAVA Global Nutrition Guidelines. Mostrar siempre el desglose (RER, factor, kcal, gramos) y la advertencia "orientativo, no reemplaza al veterinario".

## 7. Algoritmo de rutina semanal (`src/lib/routine.ts`)

Motor de reglas determinista (sin IA, sin aleatoriedad — misma entrada, misma semana):

1. **Paseos/día** según energía de la raza: alta → 2, media/baja → 1. Cachorro (< 4 meses, pre-vacunas) → 1 corto. Senior → máx 1. Objetivos "más paseos" o "controlar peso" → +1 paseo sábado y domingo.
2. **Alimentación**: 1 responsable por día (las comidas del día).
3. **Higiene/semana** según pelaje: corto 1, medio 2, largo/doble 3 (días espaciados).
4. **Salud/semana**: adulto/junior 1, cachorro/senior 2 (medicación, control, revisión).
5. **Compras**: 1 por semana (sábado).
6. **Distribución**: prioridad `alimentación > paseo > salud > higiene > compras`; se asigna al integrante con menos carga ese día y menos carga total (round-robin balanceado). Una celda (integrante × día) **puede tener varias tareas** — la grilla de la maqueta se adapta a multi-ícono (en hogares de 1-2 personas es inevitable y realista).

La raza define `tamaño, energía, pelaje` (`src/lib/breeds.ts`, ~33 razas comunes en Chile + Mestizo/Quiltro donde el usuario define tamaño y pelaje).

## 8. UI

- Mantener la identidad visual de la maqueta (paleta pastel, tarjetas, grilla, toasts).
- Wizard de ~4 pasos al primer ingreso; todo editable después desde ajustes.
- Planificador: grilla integrantes × días con celdas multi-tarea; tap sobre tarea asignada la marca completada; progreso = completadas / asignadas.
- Botón "regenerar rutina sugerida" (avisa que sobrescribe la semana actual).

## 9. Hitos

- **S1 (ahora):** scaffold ✔, lógica core (`feeding`, `breeds`, `routine`) con validación ✔, wizard + planificador con persistencia local.
- **S2:** cuentas Supabase/Vercel (Alan) → auth magic link, Postgres + RLS, landing registro.
- **S3:** deploy, QR, objetivos-métricas, cierre de semana, pulido y ensayo de la demo.

## 10. Pendientes de Alan

- [ ] Crear **proyecto** Supabase nuevo para PlanPet en la cuenta actual (ojo: el plan free permite máx. 2 proyectos activos por organización).
- [ ] Crear repo GitHub `alanmorales-dev/planpet` y proyecto Vercel separado al momento del deploy.
- [ ] Definir textos del póster (las fórmulas y fuentes de §6 sirven directo).

## 11. Iteración 2 — funciones anti-abandono

Origen: informes Solemne 1 y 2 del curso (preguntas abiertas del testeo: "¿qué pasa si el asignado no puede?" y "¿cómo asegurar uso constante?"). Principio de diseño: **solo refuerzo positivo** — el arquetipo (Paulina) siente culpa; nunca penalizar incumplimiento.

### 11.1 Reasignación "Hoy no puedo"
En modo Marcar, tocar una tarea **pendiente** abre un menú con: "✓ ¡Hecha!", "🙅 Pasar a `<integrante>`" (el con menos carga ese día, luego menor carga total; solo si hay >1 integrante) y "📅 Mover a mañana" (solo si día < domingo). Tocar una tarea **hecha** la des-marca directo, sin menú. Lógica pura en `src/lib/routine.ts` (`leastLoadedOther`).

### 11.2 Tenencia responsable: registro + calendario sanitario
- Wizard pregunta "¿Está inscrito en el Registro Nacional de Mascotas?" (`registered` en el estado). Si no: banner persistente en el planner con enlace a registratumascota.cl y botón "Ya está inscrito ✓" (refuerzo positivo al completar). Métrica citable en la feria: solo 27,4% de dueños cumple el registro (SUBDERE & PUC 2022, citado en Solemne 1).
- Panel "Calendario sanitario" con hitos sugeridos según etapa de vida (`src/lib/health.ts`): plan de vacunas de cachorro, antirrábica anual, desparasitación interna/externa, control veterinario (semestral en senior). Cada hito se puede agregar como pendiente de prioridad alta con un toque. Frecuencias referenciales de guías veterinarias estándar; mismo disclaimer de §6.

### 11.3 Modo pre-adopción (simulador público)
Ruta `/simulador`, **sin registro** — usable por visitantes del stand sin perro. Reutiliza los motores de §6 y §7: con raza/tamaño/edad/peso estima (a) **horas de cuidado por semana** (minutos por tipo de tarea: paseo 20/30/40 min según energía; alimentación 10 min × comida; higiene 30; salud 15; compras 30) y (b) **costo mensual CLP** (alimento = g/día × 30,4 × precio por kg editable, default $4.500; salud preventiva prorrateada por tamaño $6.000–12.000; higiene por pelaje $5.000–12.000; +10% imprevistos). Valores referenciales 2026, editables, con desglose visible y disclaimer. Lógica pura en `src/lib/simulator.ts`. Objetivo: formalizar la evaluación previa que la adopción impulsiva omite (caso Paulina, Solemne 1).

## 12. Correo de bienvenida / resumen (feria)

Decisión 2026-06-17: en la feria la persona usa la app sin login (localStorage); al ver su planner puede dejar su correo y recibir un **resumen real de su plan**. Es email transaccional, no autenticación — se descarta el magic link para la feria (evita el rate limit de SMTP de §4).

- **Transporte:** Google Apps Script desplegado como App Web + `MailApp.sendEmail` desde la cuenta Google de Alan (idealmente `@mayor.cl`, Workspace → mejor entregabilidad y cuota mayor; Gmail normal ~100 destinatarios/día). Costo $0, sin comprar dominio. Código y pasos de despliegue en `docs/apps-script/`.
- **App → Apps Script:** la app computa todo el HTML (reutiliza `feeding`/`routine`/`health`) y hace `fetch` con `mode: 'no-cors'` (envío fire-and-forget; la respuesta es opaca, se asume éxito). El Apps Script es un relay tonto que solo reenvía `{token, email, subject, html}`; valida un `token` compartido para disuadir abuso.
- **Config:** `NEXT_PUBLIC_PLANPET_WEBHOOK` (URL del Apps Script) y `NEXT_PUBLIC_PLANPET_TOKEN` en `.env.local` (ver `.env.local.example`). Sin webhook configurado, el botón avisa en vez de fallar.
- **Contenido (`src/lib/email.ts`, puro y testeable):** ración diaria y horarios, resumen de la rutina semanal, próximo hito sanitario, recordatorio de registro si no está inscrito, disclaimer y pie "proyecto universitario".
- **Principio:** pantalla primero, correo como bonus — el plan siempre se ve en pantalla; un fallo de correo nunca rompe la demo.
