import municipalities from './finnish-municipalities-2026.json' with { type: 'json' };

function cityKey(value: string): string {
  return value.trim().normalize('NFC').toLocaleLowerCase('fi-FI');
}

const names = new Map(municipalities.map((name) => [cityKey(name), name]));
const mariehamn = 'Maarianhamina - Mariehamn';
names.set(cityKey('Maarianhamina'), mariehamn);
names.set(cityKey('Mariehamn'), mariehamn);

export function municipalityName(value: unknown): string | null {
  return typeof value === 'string' ? names.get(cityKey(value)) ?? null : null;
}
