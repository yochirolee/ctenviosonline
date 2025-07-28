// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Tipo para los datos del carrito y envío
type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageSrc?: string;
};

type FormData = {
  nombre: string;
  apellidos: string;
  ci: string;
  telefono: string;
  email: string;
  provincia: string;
  municipio: string;
  instrucciones?: string;
};

// Simulación de almacenamiento temporal (puedes reemplazar esto con DB luego)
type Order = {
    id: string;
    date: string;
    formData: FormData;
    items: CartItem[];
    total: number;
  };
  
const fakeDatabase: Order[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { formData, items, total } = body as {
      formData: FormData;
      items: CartItem[];
      total: number;
    };

    const order = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      formData,
      items,
      total,
    };

    // Guarda en la "base de datos"
    fakeDatabase.push(order);

    // Puedes agregar lógica para enviar email aquí más adelante

    return NextResponse.json({ message: 'Orden guardada', orderId: order.id });
  } catch (err) {
    console.error('Error al guardar orden:', err);
    return NextResponse.json({ error: 'Error al guardar orden' }, { status: 500 });
  }
}
