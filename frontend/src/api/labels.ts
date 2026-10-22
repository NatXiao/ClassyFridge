import type { Analysis } from './client'

const FR: Record<string, string> = {
  tomato: 'Tomate', egg: 'Œuf', 'bell pepper': 'Poivron', onion: 'Oignon',
  carrot: 'Carotte', lemon: 'Citron', zucchini: 'Courgette', cheese: 'Fromage',
  apple: 'Pomme', mushroom: 'Champignon',
}

export const label = (name: string) =>
  FR[name] ?? name.charAt(0).toUpperCase() + name.slice(1)

export function cropSrc(
  item: Analysis['items'][number] | undefined,
): string | undefined {
  return item?.image_url ?? undefined
}
