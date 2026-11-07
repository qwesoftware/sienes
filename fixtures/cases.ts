// Synthetic cases used to build the fixture PDFs and to assert on them in
// tests. Nothing here comes from a real patient.

export type FixtureNote = {
  date: string; // dd/mm/yyyy
  time: string;
  author: string;
  specialty: string; // label as Medexis prints it (a hint; may not match the content)
  mp: string;
  text: string;
};

export type FixtureCase = {
  file: string;
  repeatHeader: boolean;
  leadingImagePages?: number;
  header: {
    name: string;
    dni: string;
    age: string;
    birthDate: string;
    address: string;
    phone: string;
    mobile: string;
    email: string;
    coverageCode: string;
    plan: string;
    memberNumber: string;
  };
  items: (FixtureNote | "image-page")[];
  expect: {
    textPages: number;
    imageOnlyPages: number;
    notes: number;
    specialtyLabels: string[];
  };
};

const ADMIN = { author: "GOMEZ LAURA", specialty: "ADMINISTRACION", mp: "0" };

export const casoA: FixtureCase = {
  file: "caso-a-renovacion-osde.pdf",
  repeatHeader: true,
  header: {
    name: "PEREYRA, MARTA LUCIA",
    dni: "11222333",
    age: "71",
    birthDate: "03/05/1955",
    address: "AV. SIEMPREVIVA 742, Localidad Ejemplo, Buenos Aires-GBA",
    phone: "1100000000",
    mobile: "1100000001",
    email: "marta.ejemplo@example.com",
    coverageCode: "390-OSDE",
    plan: "210",
    memberNumber: "61234567801",
  },
  items: [
    {
      date: "02/09/2026",
      time: "09:15",
      author: "RUIZ DIAZ CARLOS",
      specialty: "NEUROLOGIA",
      mp: "112233",
      text: "Control neurológico. Paciente de 71 años con ACV isquémico de arteria cerebral media izquierda en marzo de 2026, hemiparesia derecha y afasia de expresión en evolución.\n\nDx: Secuela de ACV isquémico (I69.3). Hemiparesia derecha. Afasia motora.\n\nMH: Enalapril 10 mg/día, Atorvastatina 20 mg/noche, AAS 100 mg/día.\n\nContinúa con programa de rehabilitación interdisciplinaria HDD 3 veces por semana. Se indica continuar kinesiología, fonoaudiología y terapia ocupacional por 6 meses más. Práctica 250101, módulo rehabilitación integral, cantidad 24.",
    },
    {
      date: "09/09/2026",
      time: "11:40",
      author: "SOSA VALERIA",
      specialty: "PSICOLOGIA",
      mp: "4455",
      text: "Sesión de kinesiología motora. Se trabaja marcha con bastón canadiense en paralelas y escalera de 4 escalones. Logra 20 metros con supervisión, aún con circunducción del MID. Fuerza muscular MID 3/5 proximal, 2/5 distal. Equilibrio Berg 38/56. Se indica continuar con fortalecimiento y entrenamiento de la marcha.",
    },
    {
      date: "16/09/2026",
      time: "10:00",
      author: ADMIN.author,
      specialty: ADMIN.specialty,
      mp: ADMIN.mp,
      text: "Paciente ausente por motivos familiares. Se reprograma la sesión para la semana próxima.",
    },
    "image-page",
    {
      date: "23/09/2026",
      time: "14:30",
      author: "FERNANDEZ ANA",
      specialty: "FONOAUDIOLOGIA",
      mp: "7788",
      text: "Evolución fonoaudiológica. Afasia de expresión con mejoría en denominación de objetos de uso cotidiano (14/20). Comprensión conservada para órdenes simples y complejas de dos pasos. Disartria leve. Se trabaja fluencia y lectura de palabras. Participa activamente, buena adherencia.",
    },
    {
      date: "30/09/2026",
      time: "16:00",
      author: "LOPEZ MARIANA",
      specialty: "TERAPIA OCUPACIONAL",
      mp: "9911",
      text: "INFORME SEMESTRAL INTERDISCIPLINARIO - PROGRAMA HDD ADULTOS\n\nPeríodo: marzo a septiembre de 2026.\n\nTerapia ocupacional: independencia en alimentación y vestido de tren superior; requiere asistencia para calzado y baño. Se trabaja uso funcional de MSD como asistente. Barthel 70/100.\n\nKinesiología: marcha con bastón canadiense con supervisión en interiores. Berg 38/56. Objetivo: marcha independiente en interiores.\n\nFonoaudiología: afasia de expresión con progreso en denominación y fluencia; comprensión conservada.\n\nPsicología: ánimo estable, buena adherencia al programa, acompañamiento familiar presente.\n\nSe sugiere continuar el programa de rehabilitación integral 3 veces por semana por 6 meses.",
    },
    {
      date: "07/10/2026",
      time: "09:30",
      author: "SOSA VALERIA",
      specialty: "PSICOLOGIA",
      mp: "4455",
      text: "Sesión psicológica. Refiere tristeza ocasional vinculada a la pérdida de autonomía, sin ideación de muerte. Trabaja aceptación del proceso y proyección de actividades. Red familiar presente (hija). Se continúa con frecuencia semanal.",
    },
    {
      date: "14/10/2026",
      time: "11:00",
      author: "RUIZ DIAZ CARLOS",
      specialty: "NEUROLOGIA",
      mp: "112233",
      text: "Control. Buena evolución motora. Se suspende AAS por epistaxis reiteradas; se indica Clopidogrel 75 mg/día. Resto de la medicación sin cambios. Continuar rehabilitación.",
    },
  ],
  expect: { textPages: 2, imageOnlyPages: 1, notes: 7, specialtyLabels: ["NEUROLOGIA", "PSICOLOGIA", "ADMINISTRACION", "FONOAUDIOLOGIA", "TERAPIA OCUPACIONAL", "PSICOLOGIA", "NEUROLOGIA"] },
};

export const casoB: FixtureCase = {
  file: "caso-b-renovacion-pami.pdf",
  repeatHeader: false,
  leadingImagePages: 2,
  header: {
    name: "QUIROGA, HECTOR OSVALDO",
    dni: "7654321",
    age: "79",
    birthDate: "21/11/1946",
    address: "CALLE FALSA 123, Localidad Ejemplo, Buenos Aires-GBA",
    phone: "1100000002",
    mobile: "1100000003",
    email: "hector.ejemplo@example.com",
    coverageCode: "41-PAMI",
    plan: "PAMI",
    memberNumber: "15012345678900",
  },
  items: [
    {
      date: "05/09/2026",
      time: "08:50",
      author: "MARTINEZ JULIETA",
      specialty: "PSIQUIATRIA",
      mp: "33445",
      text: "RESUMEN DE HISTORIA CLÍNICA (renovación anterior)\n\nPaciente de 79 años con diagnóstico de enfermedad de Parkinson (G20) de 6 años de evolución, con trastorno cognitivo leve asociado. Medicación: Levodopa/Carbidopa 250/25 mg 3 veces por día, Pramipexol 1 mg/día, Sertralina 50 mg/día. Realiza HDD adultos 3 veces por semana con kinesiología, terapia ocupacional y psicología. Se solicita renovación del módulo de rehabilitación por 6 meses.",
    },
    {
      date: "19/09/2026",
      time: "10:20",
      author: "BENITEZ PABLO",
      specialty: "KINESIOLOGIA",
      mp: "5566",
      text: "Evolución kinesiológica. Bradicinesia y rigidez moderadas, marcha festinante con episodios de freezing al girar. Se trabaja con claves visuales y auditivas. Levantarse de la silla sin apoyo de brazos en 2 de 5 intentos. Sin caídas en el período. Continuar.",
    },
    {
      date: "26/09/2026",
      time: "12:00",
      author: "LOPEZ MARIANA",
      specialty: "TERAPIA OCUPACIONAL",
      mp: "9911",
      text: "Evolución TO. Micrografía y dificultad en motricidad fina (abotonado, uso de cubiertos). Se entrena con adaptaciones de mango engrosado. Independiente en AVD básicas con mayor tiempo. Participa en taller de cocina.",
    },
    {
      date: "10/10/2026",
      time: "09:00",
      author: "MARTINEZ JULIETA",
      specialty: "PSIQUIATRIA",
      mp: "33445",
      text: "Control psiquiátrico. Ánimo estable, sin síntomas psicóticos. Se ajusta Sertralina a 100 mg/día por síntomas ansiosos vespertinos. Resto sin cambios. Indicación: continuar HDD adultos 3 veces por semana por 6 meses, práctica 250101, cantidad 72 sesiones.",
    },
  ],
  expect: { textPages: 1, imageOnlyPages: 2, notes: 4, specialtyLabels: ["PSIQUIATRIA", "KINESIOLOGIA", "TERAPIA OCUPACIONAL", "PSIQUIATRIA"] },
};

export const casoC: FixtureCase = {
  file: "caso-c-infantojuvenil.pdf",
  repeatHeader: true,
  header: {
    name: "ACOSTA, TOMAS",
    dni: "55666777",
    age: "9",
    birthDate: "12/02/2017",
    address: "PASAJE IMAGINARIO 45, Localidad Ejemplo, Buenos Aires-GBA",
    phone: "1100000004",
    mobile: "1100000005",
    email: "familia.acosta@example.com",
    coverageCode: "120-SWISS MEDICAL",
    plan: "SMG20",
    memberNumber: "800123456",
  },
  items: [
    {
      date: "01/09/2026",
      time: "15:00",
      author: "CASTRO NOELIA",
      specialty: "PSICOPEDAGOGIA",
      mp: "2211",
      text: "Evolución psicopedagógica. Niño de 9 años con trastorno del espectro autista nivel 1 (F84.0) y TDAH. Lectura con decodificación lograda, comprensión de textos cortos con apoyo. Dificultades atencionales en tareas de más de 10 minutos. Se trabaja con agenda visual y autoinstrucciones.",
    },
    {
      date: "08/09/2026",
      time: "15:00",
      author: "PAEZ RODRIGO",
      specialty: "PSICOLOGIA",
      mp: "6677",
      text: "Sesión. Juego simbólico con guion propio; acepta turnos con mediación. Baja tolerancia a la frustración ante cambios de actividad. Familia refiere mejoría en rutinas de sueño. Se continúa con frecuencia semanal y orientación a padres.",
    },
    {
      date: "15/09/2026",
      time: "15:00",
      author: ADMIN.author,
      specialty: ADMIN.specialty,
      mp: ADMIN.mp,
      text: "Se entrega documentación para renovación. Pendiente certificado escolar.",
    },
    {
      date: "22/09/2026",
      time: "14:30",
      author: "VILLALBA SOFIA",
      specialty: "FONOAUDIOLOGIA",
      mp: "8899",
      text: "Evolución fonoaudiológica. Lenguaje expresivo con oraciones de 5-6 elementos, errores morfosintácticos ocasionales. Pragmática: inicia intercambios con pares con apoyo del adulto. Se trabaja narración de secuencias y habilidades conversacionales.",
    },
    {
      date: "06/10/2026",
      time: "16:00",
      author: "MARTINEZ JULIETA",
      specialty: "PSIQUIATRIA",
      mp: "33445",
      text: "Control. Metilfenidato de liberación prolongada 18 mg por la mañana con buena tolerancia; mejora atención escolar según docente. Se mantiene dosis. Indicación: continuar tratamiento interdisciplinario (psicología, psicopedagogía, fonoaudiología) 2 veces por semana cada uno, por 6 meses.",
    },
  ],
  expect: { textPages: 1, imageOnlyPages: 0, notes: 5, specialtyLabels: ["PSICOPEDAGOGIA", "PSICOLOGIA", "ADMINISTRACION", "FONOAUDIOLOGIA", "PSIQUIATRIA"] },
};

export const cases: FixtureCase[] = [casoA, casoB, casoC];
