// src/types/encargos-events.d.ts
export type EncargosChangedDetail =
  | { type: 'removed'; id: number }
  | { type: 'cleared' }
  | { type: 'updated' } // por si en el futuro lo necesitas

declare global {
  interface WindowEventMap {
    'encargos:changed': CustomEvent<EncargosChangedDetail>;
  }
}

export {};
