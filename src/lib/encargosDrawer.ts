export function openEncargosDrawer() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('encargos:open'))
    }
  }
  