// app/[locale]/(legal)/terms/page.tsx  ← ajusta la ruta si tu proyecto la tiene en otro lugar
import type { Metadata } from "next"
import Footer from "@/components/Footer"
import { getDictionary } from "@/lib/dictionaries"
import BackButton from "@/components/BackButton"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const meta = {
    es: {
      title: "Términos, Entregas y Preguntas Frecuentes - CTEnvios Online",
      description:
        "Lee los Términos y Condiciones de Uso, la Política de Entregas y las Preguntas Frecuentes de CTEnvios Online.",
    },
    en: {
      title: "Terms, Delivery Policy & FAQs - CTEnvios Online",
      description:
        "Read CTEnvios Online’s Terms of Use, Delivery Policy and Frequently Asked Questions.",
    },
  }
  return meta[(locale as "es" | "en") ?? "es"]
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const isES = locale === "es"
  const dict = await getDictionary(locale)

  return (
    <div className="flex flex-col min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8 flex-grow">
        <BackButton label={dict.common?.back || (isES ? "Volver" : "Back")} />

        <h1 className="text-3xl font-bold mb-6">
          {isES ? "Términos y Condiciones" : "Terms and Conditions"}
        </h1>

        <div className="space-y-4 text-gray-700">
          {isES ? (
            <>
              {/* -------- TÉRMINOS DE USO -------- */}
              <p className="text-sm text-gray-500">Última actualización: 1 de Junio de 2025</p>
              <p>
                Al registrarse y utilizar la plataforma <strong>“CTEnvios Online”</strong>, usted acepta cumplir con los
                siguientes términos y condiciones. Por favor, léalos detenidamente.
              </p>

              <h2 className="text-xl font-semibold mt-4">1. Registro de Usuario</h2>
              <p>1.1. Para utilizar los servicios de “CTEnvios Online”, el usuario debe completar un formulario de registro con información verídica, actualizada y completa.</p>
              <p>1.2. Cada cuenta es personal e intransferible. Usted es responsable de mantener la confidencialidad de su contraseña.</p>
              <p>1.3. “CTEnvios Online” se reserva el derecho de suspender o cancelar cuentas que incumplan estos términos.</p>

              <h2 className="text-xl font-semibold mt-4">2. Uso de la Plataforma</h2>
              <p>2.1. “CTEnvios Online” actúa como intermediario entre vendedores y compradores, ofreciendo un marketplace especializado en electrodomésticos y productos afines.</p>
              <p>2.2. Está prohibido el uso de la plataforma para actividades ilícitas, fraudulentas o que atenten contra las leyes aplicables o estos términos.</p>

              <h2 className="text-xl font-semibold mt-4">3. Compras y Pagos</h2>
              <p>3.1. Los precios de los productos pueden variar según disponibilidad, destino y tipo de cambio.</p>
              <p>3.2. Todas las compras se realizan en línea mediante los métodos de pago disponibles en la plataforma.</p>
              <p>3.3. El cliente acepta que ciertas compras pueden estar sujetas a cargos adicionales por manejo, envío o aduanas.</p>

              <h2 className="text-xl font-semibold mt-4">4. Envíos y Entregas</h2>
              <p>4.1. “CTEnvios Online” trabaja con terceros para el manejo y transporte de los productos.</p>
              <p>4.2. Los tiempos de entrega pueden variar según el destino, proveedor y condiciones externas.</p>
              <p>4.3. “CTEnvios Online” no se hace responsable por demoras causadas por eventos fuera de su control (clima, aduanas, huelgas, etc.).</p>

              <h2 className="text-xl font-semibold mt-4">5. Cambios, Devoluciones y Garantías</h2>
              <p>5.1. Las devoluciones solo se aceptan si el producto llega defectuoso o no corresponde con la compra.</p>
              <p>5.2. El plazo para reclamar es de 72 horas desde la recepción del producto.</p>
              <p>5.3. Algunos productos incluyen garantía del fabricante, y el cliente deberá seguir el proceso establecido por dicho fabricante.</p>

              <h2 className="text-xl font-semibold mt-4">6. Política de Privacidad</h2>
              <p>6.1. Al registrarse, el usuario acepta el tratamiento de sus datos conforme a la Política de Privacidad de “CTEnvios Online”.</p>
              <p>6.2. Los datos personales no se compartirán con terceros sin consentimiento, salvo por obligación legal o para garantizar el cumplimiento del servicio.</p>

              <h2 className="text-xl font-semibold mt-4">7. Propiedad Intelectual</h2>
              <p>7.1. Todo el contenido de la plataforma (logos, diseños, textos, imágenes, software) es propiedad de “CTEnvios Online” o de sus licenciantes.</p>
              <p>7.2. Se prohíbe su uso sin autorización expresa.</p>

              <h2 className="text-xl font-semibold mt-4">8. Modificaciones</h2>
              <p>8.1. “CTEnvios Online” podrá actualizar estos términos en cualquier momento.</p>
              <p>8.2. Los cambios serán notificados en la plataforma y, continuando su uso, usted acepta los nuevos términos.</p>

              <h2 className="text-xl font-semibold mt-4">9. Legislación Aplicable</h2>
              <p>
                Este acuerdo se regirá por las leyes del estado de Florida, EE.UU., y cualquier disputa será resuelta ante los
                tribunales competentes de dicha jurisdicción.
              </p>

              <p className="mt-4">
                📩 Si tiene preguntas o inquietudes, puede contactarnos en:{" "}
                <a className="text-green-700 underline" href="mailto:leidivioleta@gmail.com">leidivioleta@gmail.com</a>
              </p>

              {/* -------- POLÍTICA DE ENTREGAS -------- */}
              <h2 className="text-2xl font-bold mt-10">Política de Entregas – “CTEnvios Online”</h2>
              <p className="text-sm text-gray-500">Última actualización: 1 de Junio de 2025</p>
              <p>
                En “CTEnvios Online” trabajamos para garantizar que cada pedido llegue de forma segura, rápida y eficiente a su
                destino. A continuación, detallamos nuestra política de entregas para que nuestros clientes conozcan el proceso
                y sus derechos.
              </p>

              <h3 className="text-xl font-semibold mt-4">1. Zonas de Entrega</h3>
              <p>1.1. Realizamos envíos a múltiples destinos según disponibilidad del proveedor y regulaciones aplicables.</p>
              <p>1.2. Algunos destinos pueden tener restricciones o requerimientos aduanales específicos.</p>

              <h3 className="text-xl font-semibold mt-4">2. Tiempos de Entrega</h3>
              <p>2.1. Los tiempos de entrega varían según el país, ciudad, proveedor y tipo de producto.</p>
              <p>2.2. En fechas de alta demanda (festividades o eventos especiales), los tiempos pueden extenderse.</p>

              <h3 className="text-xl font-semibold mt-4">3. Costos de Envío</h3>
              <p>3.1. Los precios de los productos pueden variar según disponibilidad, destino y tipo de cambio.</p>
              <p>3.2. Todas las compras se realizan en línea mediante los métodos de pago disponibles en la plataforma.</p>
              <p>3.3. El cliente acepta que ciertas compras pueden estar sujetas a cargos adicionales por manejo, envío o aduanas.</p>

              <h3 className="text-xl font-semibold mt-4">4. Proceso de Entrega</h3>
              <p>4.1. Una vez procesado el pedido, se notificará al cliente por correo electrónico el número de guía o referencia del envío.</p>
              <p>4.2. La entrega se realizará directamente al destinatario o a la persona autorizada indicada al momento de la compra.</p>
              <p>4.3. Es responsabilidad del cliente proporcionar una dirección completa y correcta. Cualquier error puede ocasionar retrasos o pérdida del paquete.</p>

              <h3 className="text-xl font-semibold mt-4">5. Recepción del Pedido</h3>
              <p>5.1. Al recibir el producto, el cliente o destinatario deberá verificar el estado físico del paquete y reportar cualquier anomalía dentro de las primeras 72 horas.</p>
              <p>5.2. No se aceptarán reclamos por daños o faltantes fuera de este plazo.</p>

              <h3 className="text-xl font-semibold mt-4">6. Imposibilidad de Entrega</h3>
              <p>6.1. Si el paquete no puede ser entregado por ausencia del destinatario o dirección incorrecta, se intentará una segunda entrega o el paquete podrá ser retornado.</p>
              <p>6.2. En caso de devolución, se informará al cliente y este asumirá el costo de reenvío si aplica.</p>

              <h3 className="text-xl font-semibold mt-4">7. Responsabilidad del Transporte</h3>
              <p>7.1. “CTEnvios Online” trabaja con operadores logísticos externos.</p>
              <p>7.2. Aunque garantizamos el seguimiento y apoyo en todo momento, no somos responsables por retrasos causados por aduanas, desastres naturales u otras circunstancias fuera de nuestro control.</p>

              <h3 className="text-xl font-semibold mt-4">8. Contacto y Soporte</h3>
              <p>📧 Email: <a className="text-green-700 underline" href="mailto:leidivioleta@gmail.com">leidivioleta@gmail.com</a></p>
              <p>📱 WhatsApp: <a className="text-green-700 underline" href="https://wa.me/17864519573" target="_blank" rel="noopener noreferrer">+1 (786) 451-9573</a></p>

              {/* -------- PREGUNTAS FRECUENTES -------- */}
              <h2 className="text-2xl font-bold mt-10">Preguntas Frecuentes – CTEnvios Online</h2>

              <h3 className="text-lg font-semibold mt-4">1. ¿Qué es CTEnvios Online?</h3>
              <p>Es un marketplace digital especializado en la venta de electrodomésticos y productos esenciales, con envíos disponibles hacia varios países.</p>

              <h3 className="text-lg font-semibold mt-4">2. ¿Desde qué países puedo comprar?</h3>
              <p>Puedes comprar desde cualquier parte del mundo. Solo necesitas conexión a internet y un método de pago válido.</p>

              <h3 className="text-lg font-semibold mt-4">3. ¿Qué productos venden?</h3>
              <p>Vendemos electrodomésticos (neveras, aires, hornillas, etc.), electrónicos, artículos del hogar y otros productos esenciales según disponibilidad del proveedor.</p>

              <h3 className="text-lg font-semibold mt-4">4. ¿Puedo enviar productos a familiares o amigos?</h3>
              <p>Sí. Puedes indicar un destinatario diferente al momento de la compra.</p>

              <h3 className="text-lg font-semibold mt-4">5. ¿Cómo sé si mi compra fue confirmada?</h3>
              <p>Recibirás un correo electrónico de confirmación con el resumen de tu pedido y el número de orden.</p>

              <h3 className="text-lg font-semibold mt-4">6. ¿Qué métodos de pago aceptan?</h3>
              <p>Aceptamos tarjetas de crédito/débito internacionales, transferencias, Zelle y otros métodos seguros que se detallan al momento del pago.</p>

              <h3 className="text-lg font-semibold mt-4">7. ¿Puedo cancelar un pedido?</h3>
              <p>Solo si el pedido aún no ha sido procesado o enviado. Escríbenos lo antes posible para revisar tu caso.</p>

              <h3 className="text-lg font-semibold mt-4">8. ¿Puedo solicitar un reembolso?</h3>
              <p>Sí. Si el producto no fue entregado o llegó defectuoso, puedes solicitar un reembolso dentro de las 72 horas siguientes a la recepción.</p>

              <h3 className="text-lg font-semibold mt-4">9. ¿Qué pasa si mi producto llega dañado?</h3>
              <p>Debes reportarlo dentro de las 72 horas posteriores a la entrega para poder gestionar un reemplazo o reembolso.</p>

              <h3 className="text-lg font-semibold mt-4">10. ¿Ofrecen garantía en los productos?</h3>
              <p>Sí. La mayoría de los productos incluyen garantía del fabricante. Verifica los detalles en la descripción del artículo.</p>

              <h3 className="text-lg font-semibold mt-4">11. ¿Cuáles son los costos de envío?</h3>
              <p>El costo depende del tamaño, peso y destino del producto. Se calcula automáticamente al momento de la compra.</p>

              <h3 className="text-lg font-semibold mt-4">12. ¿Puedo rastrear mi pedido?</h3>
              <p>Sí. Recibirás un número de seguimiento o guía cuando el pedido sea despachado. Puedes consultarlo en tu cuenta o escribirnos.</p>

              <h3 className="text-lg font-semibold mt-4">13. ¿Cómo me comunico con atención al cliente?</h3>
              <p>Puedes escribirnos al correo <a className="text-green-700 underline" href="mailto:leidivioleta@gmail.com">leidivioleta@gmail.com</a> o vía WhatsApp al <a className="text-green-700 underline" href="https://wa.me/17864519573" target="_blank" rel="noopener noreferrer">+1 (786) 451-9573</a>. Atendemos de lunes a sábado.</p>

              <p className="mt-4 italic text-gray-600">“Conectamos hogares, cruzamos fronteras.”</p>
            </>
          ) : (
            <>
              {/* -------- TERMS OF USE (EN) -------- */}
              <p className="text-sm text-gray-500">Last updated: June 1, 2025</p>
              <p>
                By registering and using the <strong>“CTEnvios Online”</strong> platform, you agree to comply with the following
                terms and conditions. Please read them carefully.
              </p>

              <h2 className="text-xl font-semibold mt-4">1. User Registration</h2>
              <p>1.1. To use “CTEnvios Online” services, users must complete the registration form with truthful, updated and complete information.</p>
              <p>1.2. Each account is personal and non-transferable. You are responsible for keeping your password confidential.</p>
              <p>1.3. “CTEnvios Online” reserves the right to suspend or cancel accounts that violate these terms.</p>

              <h2 className="text-xl font-semibold mt-4">2. Use of the Platform</h2>
              <p>2.1. “CTEnvios Online” acts as an intermediary between sellers and buyers, providing a marketplace specialized in appliances and related products.</p>
              <p>2.2. It is prohibited to use the platform for illegal or fraudulent activities, or in violation of applicable laws or these terms.</p>

              <h2 className="text-xl font-semibold mt-4">3. Purchases and Payments</h2>
              <p>3.1. Product prices may vary depending on availability, destination and exchange rates.</p>
              <p>3.2. All purchases are made online using the payment methods available on the platform.</p>
              <p>3.3. The customer accepts that certain purchases may be subject to additional handling, shipping or customs charges.</p>

              <h2 className="text-xl font-semibold mt-4">4. Shipping and Delivery</h2>
              <p>4.1. “CTEnvios Online” works with third parties for product handling and transportation.</p>
              <p>4.2. Delivery times may vary depending on destination, supplier and external conditions.</p>
              <p>4.3. “CTEnvios Online” is not responsible for delays caused by events beyond its control (weather, customs, strikes, etc.).</p>

              <h2 className="text-xl font-semibold mt-4">5. Changes, Returns and Warranties</h2>
              <p>5.1. Returns are only accepted if the product arrives defective or does not match the purchase.</p>
              <p>5.2. The claim period is 72 hours from the time the product is received.</p>
              <p>5.3. Some products include a manufacturer’s warranty; the customer must follow the manufacturer’s established process.</p>

              <h2 className="text-xl font-semibold mt-4">6. Privacy Policy</h2>
              <p>6.1. By registering, the user accepts the processing of their data in accordance with the “CTEnvios Online” Privacy Policy.</p>
              <p>6.2. Personal data will not be shared with third parties without consent, except when required by law or to ensure service delivery.</p>

              <h2 className="text-xl font-semibold mt-4">7. Intellectual Property</h2>
              <p>7.1. All platform content (logos, designs, texts, images, software) is the property of “CTEnvios Online” or its licensors.</p>
              <p>7.2. Use without express authorization is prohibited.</p>

              <h2 className="text-xl font-semibold mt-4">8. Changes</h2>
              <p>8.1. “CTEnvios Online” may update these terms at any time.</p>
              <p>8.2. Changes will be posted on the platform and, by continuing to use the service, you accept the new terms.</p>

              <h2 className="text-xl font-semibold mt-4">9. Governing Law</h2>
              <p>
                This agreement is governed by the laws of the State of Florida, USA, and any disputes shall be resolved before the
                competent courts of that jurisdiction.
              </p>

              <p className="mt-4">
                📩 Questions? Contact us at{" "}
                <a className="text-green-700 underline" href="mailto:leidivioleta@gmail.com">leidivioleta@gmail.com</a>
              </p>

              {/* -------- DELIVERY POLICY (EN) -------- */}
              <h2 className="text-2xl font-bold mt-10">Delivery Policy – “CTEnvios Online”</h2>
              <p className="text-sm text-gray-500">Last updated: June 1, 2025</p>
              <p>
                At “CTEnvios Online” we work to ensure every order arrives safely, quickly and efficiently. Below is our delivery policy
                so customers understand the process and their rights.
              </p>

              <h3 className="text-xl font-semibold mt-4">1. Delivery Areas</h3>
              <p>1.1. We ship to multiple destinations depending on supplier availability and applicable regulations.</p>
              <p>1.2. Some destinations may have specific customs restrictions or requirements.</p>

              <h3 className="text-xl font-semibold mt-4">2. Delivery Times</h3>
              <p>2.1. Delivery times vary by country, city, supplier and product type.</p>
              <p>2.2. During peak seasons (holidays or special events), delivery times may be extended.</p>

              <h3 className="text-xl font-semibold mt-4">3. Shipping Costs</h3>
              <p>3.1. Product prices may vary according to availability, destination and exchange rates.</p>
              <p>3.2. All purchases are made online using the payment methods available on the platform.</p>
              <p>3.3. The customer accepts that certain purchases may be subject to additional handling, shipping or customs charges.</p>

              <h3 className="text-xl font-semibold mt-4">4. Delivery Process</h3>
              <p>4.1. Once the order is processed, the customer will be notified by email with a tracking or reference number.</p>
              <p>4.2. Delivery will be made directly to the recipient or to the authorized person specified at checkout.</p>
              <p>4.3. It is the customer’s responsibility to provide a complete and correct address. Any error may cause delays or loss of the package.</p>

              <h3 className="text-xl font-semibold mt-4">5. Order Receipt</h3>
              <p>5.1. Upon receiving the product, the customer or recipient must check the package condition and report any issue within 72 hours.</p>
              <p>5.2. Claims for damage or missing items will not be accepted after this period.</p>

              <h3 className="text-xl font-semibold mt-4">6. Failed Delivery</h3>
              <p>6.1. If the package cannot be delivered due to recipient absence or incorrect address, a second attempt may be made or the package may be returned.</p>
              <p>6.2. In case of return, the customer will be informed and will assume the reshipment cost if applicable.</p>

              <h3 className="text-xl font-semibold mt-4">7. Transport Liability</h3>
              <p>7.1. “CTEnvios Online” works with external logistics operators.</p>
              <p>7.2. While we provide tracking and support, we are not responsible for delays caused by customs, natural disasters or other circumstances beyond our control.</p>

              <h3 className="text-xl font-semibold mt-4">8. Contact & Support</h3>
              <p>📧 Email: <a className="text-green-700 underline" href="mailto:leidivioleta@gmail.com">leidivioleta@gmail.com</a></p>
              <p>📱 WhatsApp: <a className="text-green-700 underline" href="https://wa.me/17864519573" target="_blank" rel="noopener noreferrer">+1 (786) 451-9573</a></p>

              {/* -------- FAQ (EN) -------- */}
              <h2 className="text-2xl font-bold mt-10">Frequently Asked Questions – CTEnvios Online</h2>

              <h3 className="text-lg font-semibold mt-4">1. What is CTEnvios Online?</h3>
              <p>It’s a digital marketplace specialized in appliances and essential products, with shipping available to multiple countries.</p>

              <h3 className="text-lg font-semibold mt-4">2. From which countries can I buy?</h3>
              <p>You can buy from anywhere in the world. You only need an internet connection and a valid payment method.</p>

              <h3 className="text-lg font-semibold mt-4">3. What products do you sell?</h3>
              <p>We sell appliances (refrigerators, AC units, cooktops, etc.), electronics, home goods and other essentials subject to supplier availability.</p>

              <h3 className="text-lg font-semibold mt-4">4. Can I ship products to family or friends?</h3>
              <p>Yes. You can specify a different recipient at checkout.</p>

              <h3 className="text-lg font-semibold mt-4">5. How do I know my purchase was confirmed?</h3>
              <p>You will receive a confirmation email with the order summary and order number.</p>

              <h3 className="text-lg font-semibold mt-4">6. What payment methods do you accept?</h3>
              <p>We accept international credit/debit cards, bank transfers, Zelle and other secure methods shown during checkout.</p>

              <h3 className="text-lg font-semibold mt-4">7. Can I cancel an order?</h3>
              <p>Only if your order has not yet been processed or shipped. Contact us as soon as possible so we can review your case.</p>

              <h3 className="text-lg font-semibold mt-4">8. Can I request a refund?</h3>
              <p>Yes. If the product was not delivered or arrived defective, you can request a refund within 72 hours of receipt.</p>

              <h3 className="text-lg font-semibold mt-4">9. What if my product arrives damaged?</h3>
              <p>Please report it within 72 hours after delivery so we can process a replacement or refund.</p>

              <h3 className="text-lg font-semibold mt-4">10. Do you offer product warranties?</h3>
              <p>Yes. Most products include a manufacturer’s warranty. Check the product page for details.</p>

              <h3 className="text-lg font-semibold mt-4">11. What are the shipping costs?</h3>
              <p>Costs depend on size, weight and destination. They’re calculated automatically at checkout.</p>

              <h3 className="text-lg font-semibold mt-4">12. Can I track my order?</h3>
              <p>Yes. You’ll receive a tracking/guide number when the order ships. You can also check it in your account or contact us.</p>

              <h3 className="text-lg font-semibold mt-4">13. How do I contact customer service?</h3>
              <p>Email us at <a className="text-green-700 underline" href="mailto:leidivioleta@gmail.com">leidivioleta@gmail.com</a> or WhatsApp <a className="text-green-700 underline" href="https://wa.me/17864519573" target="_blank" rel="noopener noreferrer">+1 (786) 451-9573</a>. We’re available Monday to Saturday.</p>

              <p className="mt-4 italic text-gray-600">“Connecting homes, crossing borders.”</p>
            </>
          )}
        </div>
      </main>

      {/* Footer consistente */}
      <Footer dict={dict} mode="legal" />
    </div>
  )
}
