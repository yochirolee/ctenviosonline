// src/lib/cubaAreaType.ts
export const CAPITAL_MUNICIPIO: Record<string, string> = {
    'Pinar del Río': 'Pinar del Río',
    'Artemisa': 'Artemisa',
    'La Habana': '', // La Habana: ver regla especial abajo
    'Mayabeque': 'San José de las Lajas',
    'Matanzas': 'Matanzas',
    'Cienfuegos': 'Cienfuegos',
    'Villa Clara': 'Santa Clara',
    'Sancti Spíritus': 'Sancti Spíritus',
    'Ciego de Ávila': 'Ciego de Ávila',
    'Camagüey': 'Camagüey',
    'Las Tunas': 'Las Tunas',
    'Holguín': 'Holguín',
    'Granma': 'Bayamo',
    'Santiago de Cuba': 'Santiago de Cuba',
    'Guantánamo': 'Guantánamo',
    'Isla de la Juventud': 'Nueva Gerona',
  };
  
  // Si quieres tratar ciertos municipios de La Habana como “city”, ponlos aquí:
  export const HABANA_CIUDAD_MUNS = new Set<string>([
    'Centro Habana',
    'Plaza de la Revolución',
    'Habana Vieja',
    'Cerro',
    'Diez de Octubre',
    'Playa',
    'Marianao',
    'La Lisa',    
  ]);
  
  export function computeAreaType(province?: string, municipality?: string): 'city'|'municipio' {
    if (!province || !municipality) return 'municipio';
    if (province === 'La Habana') {
      return HABANA_CIUDAD_MUNS.has(municipality) ? 'city' : 'municipio';
    }
    const capital = CAPITAL_MUNICIPIO[province];
    return capital && municipality === capital ? 'city' : 'municipio';
  }
  