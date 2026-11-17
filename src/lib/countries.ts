import countries from 'i18n-iso-countries';
import english from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

countries.registerLocale(english);

export function countryCode(value: string): string | undefined {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  if (Object.hasOwn(countries.getAlpha2Codes(), upper)) {
    return upper;
  }
  return countries.getAlpha2Code(trimmed, 'en');
}

export function countryLabel(code: string): string | undefined {
  return countries.getName(code, 'en');
}
