// src/app/api/email/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const data = await req.json();

  // Simula respuesta
  return NextResponse.json({ success: true, message: 'Correo enviado' });
}