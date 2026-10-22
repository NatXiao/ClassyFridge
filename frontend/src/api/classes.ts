import classNames from '../../../class_names.json'
import { label } from './labels'

// Every class the food model knows, sorted by display name
export const CLASSES = (classNames as string[])
  .map((value) => ({ value, text: label(value) }))
  .sort((a, b) => a.text.localeCompare(b.text))
