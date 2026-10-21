import type { Analysis } from './client'

const FR: Record<string, string> = {
  tomato: 'Tomate', egg: 'Œuf', 'bell pepper': 'Poivron', onion: 'Oignon',
  carrot: 'Carotte', lemon: 'Citron', zucchini: 'Courgette', cheese: 'Fromage',
  apple: 'Pomme', mushroom: 'Champignon',
}

export const label = (name: string) =>
  FR[name] ?? name.charAt(0).toUpperCase() + name.slice(1)

// Le champ n'existe pas encore dans le schéma : on le lit sans casser le typage
export function cropSrc(item: Analysis['items'][number] | undefined) {
  const b64 = (item as { crop_base64?: string } | undefined)?.crop_base64
  return b64 ? `data:image/jpeg;base64,${b64}` : undefined
}
