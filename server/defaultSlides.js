import { DEFAULT_DESIGN } from '../shared/design.js'

function choice(id, label) {
  return { id, label, price: null, note: '' }
}

function priced(id, label, price, note = '') {
  return { id, label, price, note }
}

function slide(partial) {
  return {
    role: null,
    locked: false,
    variant: 'plain',
    kicker: '',
    title: '',
    subtitle: '',
    body: [],
    cards: [],
    question: '',
    options: [],
    maxSelect: null,
    maxWords: 5,
    wordMode: 'cloud',
    ranking: false,
    footnote: '',
    ...partial,
  }
}

export function defaultSlides() {
  return [
    slide({
      id: 's-servicio',
      type: 'single',
      role: 'service',
      locked: true,
      kicker: 'Ateneo de Clínica Médica',
      title: 'El paciente que no logra corregir su acidosis',
      subtitle: 'Cuando el lactato cuenta una historia diferente',
      question: '¿En qué servicio trabajás?',
      options: [choice('uti', 'UTI'), choice('clinica', 'Clínica'), choice('uco', 'UCO')],
    }),
    slide({
      id: 's-caso',
      type: 'text',
      variant: 'case',
      kicker: 'El caso',
      title: 'Varón de 72 años',
      body: [
        'DM2 y ERC G3a, con TFGe basal de 52 ml/min.',
        'Metformina 1.000 mg cada 12 h.',
        'Consulta por diarrea, vómitos, dolor abdominal y deterioro del estado general.',
      ],
    }),
    slide({
      id: 's-hipotesis',
      type: 'single',
      role: 'hypothesis',
      locked: true,
      kicker: 'Hipótesis inicial',
      title: '¿Por dónde empezás?',
      question: '¿Cuál es tu principal hipótesis diagnóstica inicial?',
      options: [
        choice('septico', 'Shock séptico de foco abdominal'),
        choice('hipovolemico', 'Shock hipovolémico'),
        choice('isquemia', 'Isquemia mesentérica'),
        choice('cad', 'Cetoacidosis diabética'),
        choice('otra', 'Otra causa metabólica'),
      ],
    }),
    slide({
      id: 's-estudios',
      type: 'multi',
      role: 'studies',
      locked: true,
      kicker: 'Primeras horas',
      title: '¿Qué pedís ahora?',
      body: ['Marcá lo que pedirías. Cada estudio suma a tu costo.'],
      question: '¿Qué pedirías en las primeras horas?',
      options: [
        priced('gas', 'Gasometría + lactato + ionograma + creatinina', 0, 's/valor en listado'),
        priced('ecg', 'ECG', 61000),
        priced('rxt', 'RX tórax', 36000),
        priced('rxa', 'RX abdomen', 36000),
        priced('eco', 'Eco abdominal', 50000),
        priced('tac', 'TAC abdomen con contraste', 396000, 'TAC $176.000 + contraste $220.000'),
        priced('doppler', 'Eco Doppler mesentérico', 83000),
        priced('enda', 'Endoscopia digestiva (gasto)', 303600),
        priced('inter', 'Interconsulta especialista', 80000),
        priced('via', 'Vía central', 650000),
        priced('utidia', 'Ingreso a UTI (1 día)', 885500),
      ],
    }),
    slide({
      id: 's-palabras',
      type: 'words',
      wordMode: 'cloud',
      kicker: 'Evolución',
      title: 'Antes de decidir',
      body: ['Hipotensión, taquicardia, oliguria y signos de hipoperfusión.'],
      question: '¿Qué datos de la historia clínica querés conocer antes de decidir?',
    }),
    slide({
      id: 's-lab',
      type: 'text',
      variant: 'labs',
      kicker: 'Primer laboratorio',
      title: 'Los números',
      cards: [
        { label: 'pH', value: '7,05' },
        { label: 'HCO3', value: '8 mEq/L' },
        { label: 'Anión gap', value: '29' },
        { label: 'Lactato', value: '16,8 mmol/L' },
        { label: 'Glucemia', value: '214 mg/dL' },
        { label: 'Creatinina', value: '5,1 mg/dL' },
        { label: 'Potasio', value: '5,8 mEq/L' },
      ],
    }),
    slide({
      id: 's-acido',
      type: 'single',
      kicker: 'Ácido-base',
      title: 'Cómo lo leés',
      question: '¿Cómo clasificás esta alteración ácido-base?',
      options: [
        choice('ag', 'Acidosis metabólica con AG elevado e hiperlactatemia grave'),
        choice('hipercloremica', 'Acidosis metabólica hiperclorémica (AG normal)'),
        choice('respiratoria', 'Acidosis respiratoria con compensación'),
        choice('cadpura', 'Cetoacidosis diabética pura'),
      ],
    }),
    slide({
      id: 's-causas',
      type: 'words',
      wordMode: 'list',
      kicker: 'Discusión en equipos',
      title: 'Cinco causas a descartar',
      question: '¿Cuáles son las 5 principales causas a descartar ante una acidosis con AG elevado e hiperlactatemia grave?',
    }),
    slide({
      id: 's-ranking',
      type: 'multi',
      ranking: true,
      maxSelect: 2,
      kicker: 'Diagnósticos diferenciales',
      title: 'Tu ranking',
      body: ['Elegí hasta dos. La sala se ordena por votos.'],
      question: '¿Cuáles priorizás?',
      options: [
        choice('sepsis', 'Sepsis'),
        choice('isquemia', 'Isquemia mesentérica'),
        choice('cad', 'Cetoacidosis diabética'),
        choice('hipovolemico', 'Shock hipovolémico'),
        choice('farmacos', 'Acidosis láctica asociada a fármacos'),
        choice('hepatica', 'Insuficiencia hepática'),
      ],
    }),
    slide({
      id: 's-pierde',
      type: 'single',
      kicker: 'Nuevos datos',
      title: '¿Qué pierde fuerza?',
      body: [
        'Beta-hidroxibutirato 0,8 mmol/L.',
        'Cetonas urinarias en trazas.',
        'TC abdominal sin signos definitivos de isquemia mesentérica.',
        'Persisten la acidosis y la hiperlactatemia.',
      ],
      question: '¿Qué diagnóstico pierde probabilidad?',
      options: [
        choice('cad', 'Cetoacidosis diabética'),
        choice('sepsis', 'Sepsis'),
        choice('isquemia', 'Isquemia mesentérica'),
        choice('hipovolemico', 'Shock hipovolémico'),
      ],
    }),
    slide({
      id: 's-mecanismo',
      type: 'single',
      kicker: 'El dato que cambia todo',
      title: 'Seguía tomando metformina',
      body: ['La familia confirma que continuó tomando metformina durante la diarrea, los vómitos, la escasa ingesta y la oliguria.'],
      question: '¿Qué mecanismo explica mejor el cuadro?',
      options: [
        choice('produccion', 'Aumento de producción de lactato'),
        choice('eliminacion', 'Disminución de eliminación de lactato'),
        choice('acumulacion', 'Acumulación de metformina por deterioro renal'),
        choice('multi', 'Mecanismo multifactorial'),
      ],
    }),
    slide({
      id: 's-diagnostico',
      type: 'text',
      variant: 'reveal',
      kicker: 'Diagnóstico final',
      title: 'Acidosis láctica asociada a metformina',
      subtitle: 'MALA',
      body: [
        'En contexto de lesión renal aguda, deshidratación e hipoperfusión.',
        'Puede haber contribución simultánea de mecanismos tipo A (hipoperfusión) y tipo B (metformina).',
      ],
    }),
    slide({
      id: 's-conducta',
      type: 'multi',
      kicker: 'Conducta',
      title: '¿Qué hacés ahora?',
      question: '¿Cuál es tu conducta inmediata?',
      options: [
        choice('suspender', 'Suspender metformina'),
        choice('reanimacion', 'Reanimación hemodinámica'),
        choice('hidro', 'Corregir alteraciones hidroelectrolíticas'),
        choice('precipitantes', 'Tratar posibles precipitantes'),
        choice('renal', 'Evaluación urgente para terapia de reemplazo renal'),
        choice('bicarbonato', 'Bicarbonato en bolo como única medida'),
        choice('observar', 'Observar evolución 24 h'),
      ],
    }),
    slide({
      id: 's-dialisis',
      type: 'text',
      variant: 'criteria',
      kicker: 'EXTRIP',
      title: '¿Cuándo indicar diálisis?',
      cards: [
        { label: 'Lactato > 20 mmol/L', value: 'Recomendada' },
        { label: 'Lactato 15–20 mmol/L', value: 'Sugerida' },
        { label: 'pH ≤ 7,0', value: 'Recomendada' },
        { label: 'pH 7,0–7,1', value: 'Sugerida' },
      ],
      body: [
        'Shock, insuficiencia renal y fracaso del soporte bajan el umbral.',
        'Preferir hemodiálisis intermitente con bicarbonato si es factible.',
      ],
    }),
    slide({
      id: 's-evolucion',
      type: 'text',
      variant: 'evolution',
      kicker: 'Evolución',
      title: 'Después de la terapia extracorpórea',
      body: [
        'Mejoran el pH, el lactato y la hemodinamia.',
        'Monitorizar el rebote de lactato y de acidosis.',
      ],
    }),
    slide({
      id: 's-costo',
      type: 'cost',
      role: 'cost',
      locked: true,
      kicker: 'Sesgo de servicio',
      title: 'Lo que cada servicio pidió',
      subtitle: 'Valores particulares de octubre 2026, IVA incluido.',
      body: ['El costo de cada persona es la suma de lo que marcó en las primeras horas.'],
      footnote: 'Costos directos ilustrativos, sin honorarios. El laboratorio no figura en el listado y se computó en $0. No es un análisis formal de costo-efectividad.',
    }),
    slide({
      id: 's-mensajes',
      type: 'text',
      variant: 'takeaways',
      kicker: 'Para llevar',
      title: 'Cinco mensajes',
      body: [
        'No toda hiperlactatemia es sepsis.',
        'La lesión renal aguda puede convertir una dosis habitual de metformina en un problema grave.',
        'MALA es un diagnóstico clínico y de contexto.',
        'La diálisis puede ser una intervención vital.',
        'Siempre investigar los fármacos y su contexto de uso.',
      ],
    }),
  ]
}

export function defaultPriceTable() {
  return [
    { id: 'ruta', label: 'Ruta dirigida (gasometría/lactato + ECG + RX tórax + interconsulta)', price: 177000 },
    { id: 'dialisis', label: 'Diálisis convencional (sin catéter)', price: 935000 },
    { id: 'uti', label: 'Día de UTI', price: 885500 },
    { id: 'uti-ox', label: 'Día de UTI con oxígeno', price: 1328250 },
    { id: 'via', label: 'Vía central', price: 650000 },
    { id: 'tac', label: 'TAC abdomen con contraste', price: 396000 },
    { id: 'endo', label: 'Endoscopia (gasto)', price: 303600 },
  ]
}

export function defaultSession() {
  return {
    slideIndex: 0,
    showResults: false,
    contentVersion: 1,
    slides: defaultSlides(),
    design: structuredClone(DEFAULT_DESIGN),
    priceTable: defaultPriceTable(),
  }
}
