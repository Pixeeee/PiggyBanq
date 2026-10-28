export function fontFamily(weight: string | number = '400', heading = false): string {
  if (heading) return 'Grandstander-700';
  const numeric = weight === 'bold' ? 700 : Number(weight);
  return `Geist-${numeric >= 900 ? 900 : numeric >= 800 ? 800 : numeric >= 700 ? 700 : numeric >= 600 ? 600 : numeric >= 500 ? 500 : 400}`;
}
