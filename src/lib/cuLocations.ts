// /lib/cuLocations.ts
export const CUBA_PROVINCES = [
    'Pinar del Río','Artemisa','La Habana','Mayabeque','Matanzas','Cienfuegos','Villa Clara',
    'Sancti Spíritus','Ciego de Ávila','Camagüey','Las Tunas','Holguín','Granma',
    'Santiago de Cuba','Guantánamo','Isla de la Juventud',
  ];
  
  export const MUNICIPIOS_CUBA: Record<string, string[]> = {
    'Pinar del Río': ['Pinar del Río','Consolación del Sur','Guane','La Palma','Los Palacios','Mantua','Minas de Matahambre','San Juan y Martínez','San Luis','Sandino','Viñales'],
    'Artemisa': ['Artemisa','Alquízar','Bauta','Caimito','Guanajay','Güira de Melena','Mariel','San Antonio de los Baños','Bahía Honda'],
    'La Habana': ['Playa','Plaza de la Revolución','Centro Habana','Habana Vieja','Regla','Habana del Este','Guanabacoa','San Miguel del Padrón','Diez de Octubre','Cerro','Marianao','La Lisa','Boyeros','Arroyo Naranjo','Cotorro'],
    'Mayabeque': ['San José de las Lajas','Batabanó','Bejucal','Güines','Jaruco','Madruga','Melena del Sur','Nueva Paz','Quivicán','San Nicolás de Bari','Santa Cruz del Norte'],
    'Matanzas': ['Matanzas','Cárdenas','Varadero','Colón','Jagüey Grande','Jovellanos','Limonar','Los Arabos','Martí','Pedro Betancourt','Perico','Unión de Reyes'],
    'Cienfuegos': ['Cienfuegos','Abreus','Aguada de Pasajeros','Cruces','Cumanayagua','Lajas','Palmira','Rodas'],
    'Villa Clara': ['Santa Clara','Caibarién','Camajuaní','Cifuentes','Corralillo','Encrucijada','Manicaragua','Placetas','Quemado de Güines','Ranchuelo','Remedios','Sagua la Grande','Santo Domingo'],
    'Sancti Spíritus': ['Sancti Spíritus','Cabaiguán','Fomento','Jatibonico','La Sierpe','Taguasco','Trinidad','Yaguajay'],
    'Ciego de Ávila': ['Ciego de Ávila','Baraguá','Bolivia','Chambas','Ciro Redondo','Florencia','Majagua','Morón','Primero de Enero','Venezuela'],
    'Camagüey': ['Camagüey','Carlos Manuel de Céspedes','Esmeralda','Florida','Guáimaro','Jimaguayú','Minas','Najasa','Nuevitas','Santa Cruz del Sur','Sibanicú','Sierra de Cubitas','Vertientes'],
    'Las Tunas': ['Las Tunas','Amancio','Colombia','Jesús Menéndez','Jobabo','Majibacoa','Manatí','Puerto Padre'],
    'Holguín': ['Holguín','Antilla','Báguanos','Banes','Cacocum','Calixto García','Cueto','Frank País','Gibara','Mayarí','Moa','Rafael Freyre','Sagua de Tánamo','Urbano Noris'],
    'Granma': ['Bayamo','Bartolomé Masó','Buey Arriba','Campechuela','Cauto Cristo','Guisa','Jiguaní','Manzanillo','Media Luna','Niquero','Pilón','Río Cauto','Yara'],
    'Santiago de Cuba': ['Santiago de Cuba','Contramaestre','Guamá','Mella','Palma Soriano','San Luis','Segundo Frente','Songo-La Maya','Tercer Frente'],
    'Guantánamo': ['Guantánamo','Baracoa','Caimanera','El Salvador','Imías','Maisí','Manuel Tames','Niceto Pérez','San Antonio del Sur','Yateras'],
    'Isla de la Juventud': ['Nueva Gerona','La Demajagua'],
  };
  
  // === Normalizadores canónicos ===
  const norm = (s: string) =>
    s.normalize('NFD')
     .replace(/\p{Diacritic}/gu, '')
     .toLowerCase()
     .replace(/\s+/g,' ')
     .trim();
  
  export function normalizeCubaProvince(input: string): string | null {
    if (!input) return null;
    const n = norm(input);
    for (const p of CUBA_PROVINCES) if (norm(p) === n) return p;
    return null;
  }
  
  export function normalizeCubaMunicipality(province: string, input: string): string | null {
    const prov = normalizeCubaProvince(province);
    if (!prov || !input) return null;
    const n = norm(input);
    for (const m of (MUNICIPIOS_CUBA[prov] || [])) if (norm(m) === n) return m;
    return null;
  }
  