// app/api/checkout_success/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/sendEmail'

type CartItem = {
    name: string;
    quantity: number;
    price: number;
  };
  
export async function POST(req: NextRequest) {
  try {
    const { formData, cartItems } = await req.json()

    const emailBody = `
      Nuevo pedido recibido:
      
      Destinatario: ${formData.nombre} ${formData.apellidos}
      Carné de Identidad: ${formData.ci}
      Teléfono: ${formData.telefono}
      Email: ${formData.email}
      Provincia: ${formData.provincia}
      Municipio: ${formData.municipio}
      Instrucciones: ${formData.instrucciones || 'N/A'}

      Productos:
      ${(cartItems as CartItem[]).map((item) =>
        `- ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
      ).join('\n')}
    `

    await sendEmail({
      to: 'tucorreo@tudominio.com',
      subject: 'Nuevo pedido realizado',
      body: emailBody,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error enviando el correo:', error)
    return NextResponse.json({ error: 'Error enviando el correo' }, { status: 500 })
  }
}
