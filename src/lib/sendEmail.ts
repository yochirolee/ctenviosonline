// lib/sendEmail.ts

// Este helper simula el envío de un correo electrónico. Más adelante puedes integrarlo con servicios reales como Resend, SendGrid, etc.

export async function sendEmail({
    to,
    subject,
    body,
  }: {
    to: string;
    subject: string;
    body: string;
  }) {
    // En producción, aquí llamarías a una API externa
    console.log("\n=== Simulación de envío de correo ===");
    console.log("Destinatario:", to);
    console.log("Asunto:", subject);
    console.log("Contenido:", body);
    console.log("====================================\n");
  
    // Simulación de éxito
    return { success: true };
  }
  
  // Ejemplo de uso futuro:
  // await sendEmail({
  //   to: "cliente@ejemplo.com",
  //   subject: "Confirmación de tu pedido",
  //   body: "Gracias por tu compra. Tu pedido ha sido recibido.",
  // });
  