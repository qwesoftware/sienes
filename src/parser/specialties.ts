// Versioned catalog of specialty names as Medexis prints them. Matching is
// accent- and case-insensitive. Unknown labels stay unresolved so the
// reviewer sees "Sin especialidad identificada" instead of a guess.

export const specialtyCatalogVersion = "2026-11-06";

export type SpecialtyEntry = { key: string; label: string; aliases: string[] };

export const specialties: SpecialtyEntry[] = [
  { key: "neurologia", label: "Neurología", aliases: ["neurologia", "neurologo", "neurologa"] },
  { key: "psiquiatria", label: "Psiquiatría", aliases: ["psiquiatria", "psiquiatra"] },
  { key: "psicologia", label: "Psicología", aliases: ["psicologia", "psicologo", "psicologa", "psicoterapia"] },
  { key: "neuropsicologia", label: "Neuropsicología", aliases: ["neuropsicologia", "evaluacion neuropsicologica"] },
  { key: "kinesiologia", label: "Kinesiología", aliases: ["kinesiologia", "kinesiologo", "kinesiologa", "fisioterapia", "rehabilitacion motora"] },
  { key: "terapia-ocupacional", label: "Terapia ocupacional", aliases: ["terapia ocupacional", "terapista ocupacional", "to"] },
  { key: "fonoaudiologia", label: "Fonoaudiología", aliases: ["fonoaudiologia", "fonoaudiologo", "fonoaudiologa", "fono"] },
  { key: "psicopedagogia", label: "Psicopedagogía", aliases: ["psicopedagogia", "psicopedagogo", "psicopedagoga"] },
  { key: "trabajo-social", label: "Trabajo social", aliases: ["trabajo social", "trabajadora social", "trabajador social", "servicio social"] },
  { key: "nutricion", label: "Nutrición", aliases: ["nutricion", "nutricionista"] },
  { key: "enfermeria", label: "Enfermería", aliases: ["enfermeria", "enfermero", "enfermera"] },
  { key: "clinica-medica", label: "Clínica médica", aliases: ["clinica medica", "medicina clinica", "clinica", "medico clinico"] },
  { key: "musicoterapia", label: "Musicoterapia", aliases: ["musicoterapia", "musicoterapeuta"] },
  { key: "acompanamiento-terapeutico", label: "Acompañamiento terapéutico", aliases: ["acompanamiento terapeutico", "acompanante terapeutico", "at"] },
  { key: "hospital-de-dia", label: "Hospital de día", aliases: ["hospital de dia", "hdd", "coordinacion hdd", "coordinacion"] },
  { key: "administracion", label: "Administración", aliases: ["administracion", "admision", "admisiones", "secretaria"] },
];

export function normalizeLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const index = new Map<string, SpecialtyEntry>();
for (const entry of specialties) {
  index.set(normalizeLabel(entry.label), entry);
  for (const alias of entry.aliases) index.set(normalizeLabel(alias), entry);
}

export function resolveSpecialty(label: string | null | undefined): SpecialtyEntry | null {
  if (!label) return null;
  return index.get(normalizeLabel(label)) ?? null;
}

export function specialtyLabel(key: string | null): string {
  if (!key) return "Sin especialidad identificada";
  return specialties.find((s) => s.key === key)?.label ?? "Sin especialidad identificada";
}
