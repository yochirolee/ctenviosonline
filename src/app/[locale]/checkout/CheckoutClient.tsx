"use client"

import { useCart } from "@/context/CartContext"
import { useState } from "react"
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CreditCard } from "lucide-react"
import type { Dict } from '@/types/Dict'
import { toast } from "sonner"

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

const provinciasCuba = {
  "Pinar del Río": [
    "Pinar del Río", "Consolación del Sur", "Guane", "La Palma", "Los Palacios",
    "Mantua", "Minas de Matahambre", "San Juan y Martínez", "San Luis", "Sandino",
    "Viñales"
  ],
  "Artemisa": [
    "Artemisa", "Alquízar", "Bauta", "Caimito", "Guanajay", "Güira de Melena",
    "Mariel", "San Antonio de los Baños", "Bahía Honda"
  ],
  "La Habana": [
    "Playa", "Plaza de la Revolución", "Centro Habana", "Habana Vieja",
    "Regla", "Habana del Este", "Guanabacoa", "San Miguel del Padrón",
    "Diez de Octubre", "Cerro", "Marianao", "La Lisa", "Boyeros", "Arroyo Naranjo",
    "Cotorro"
  ],
  "Mayabeque": [
    "San José de las Lajas", "Batabanó", "Bejucal", "Güines", "Jaruco", "Madruga",
    "Melena del Sur", "Nueva Paz", "Quivicán", "San Nicolás de Bari", "Santa Cruz del Norte"
  ],
  "Matanzas": [
    "Matanzas", "Cárdenas", "Varadero", "Colón", "Jagüey Grande", "Jovellanos",
    "Limonar", "Los Arabos", "Martí", "Pedro Betancourt", "Perico", "Unión de Reyes"
  ],
  "Cienfuegos": [
    "Cienfuegos", "Abreus", "Aguada de Pasajeros", "Cruces", "Cumanayagua",
    "Lajas", "Palmira", "Rodas"
  ],
  "Villa Clara": [
    "Santa Clara", "Caibarién", "Camajuaní", "Cifuentes", "Corralillo",
    "Encrucijada", "Manicaragua", "Placetas", "Quemado de Güines", "Ranchuelo",
    "Remedios", "Sagua la Grande", "Santo Domingo"
  ],
  "Sancti Spíritus": [
    "Sancti Spíritus", "Cabaiguán", "Fomento", "Jatibonico", "La Sierpe",
    "Taguasco", "Trinidad", "Yaguajay"
  ],
  "Ciego de Ávila": [
    "Ciego de Ávila", "Baraguá", "Bolivia", "Chambas", "Ciro Redondo", "Florencia",
    "Majagua", "Morón", "Primero de Enero", "Venezuela"
  ],
  "Camagüey": [
    "Camagüey", "Carlos Manuel de Céspedes", "Esmeralda", "Florida", "Guaimaro",
    "Jimaguayú", "Minas", "Najasa", "Nuevitas", "Santa Cruz del Sur",
    "Sibanicú", "Sierra de Cubitas", "Vertientes"
  ],
  "Las Tunas": [
    "Las Tunas", "Amancio", "Colombia", "Jesús Menéndez", "Jobabo",
    "Majibacoa", "Manatí", "Puerto Padre"
  ],
  "Holguín": [
    "Holguín", "Antilla", "Báguanos", "Banes", "Cacocum", "Calixto García",
    "Cueto", "Frank País", "Gibara", "Mayarí", "Moa", "Rafael Freyre",
    "Sagua de Tánamo", "Urbano Noris"
  ],
  "Granma": [
    "Bayamo", "Bartolomé Masó", "Buey Arriba", "Campechuela", "Cauto Cristo",
    "Guisa", "Jiguaní", "Manzanillo", "Media Luna", "Niquero", "Pilón",
    "Río Cauto", "Yara"
  ],
  "Santiago de Cuba": [
    "Santiago de Cuba", "Contramaestre", "Guamá", "Mella", "Palma Soriano",
    "San Luis", "Segundo Frente", "Songo-La Maya", "Tercer Frente"
  ],
  "Guantánamo": [
    "Guantánamo", "Baracoa", "Caimanera", "El Salvador", "Imías", "Maisí",
    "Manuel Tames", "Niceto Pérez", "San Antonio del Sur", "Yateras"
  ],
  "Isla de la Juventud": [
    "Nueva Gerona", "La Demajagua"
  ]
}

export default function CheckoutPage({ dict }: { dict: Dict }) {
  const { items, cartId, clearCart } = useCart()
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const total = items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0) / 100

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    ci: "",
    telefono: "",
    email: "",
    provincia: "",
    municipio: "",
    direccion: "",
    instrucciones: "",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    if (!formData.nombre) newErrors.nombre = dict.checkout.errors.nombre
    if (!formData.apellidos) newErrors.apellidos = dict.checkout.errors.apellidos
    if (!/^[0-9]{11}$/.test(formData.ci)) newErrors.ci = dict.checkout.errors.ci
    if (!/^[0-9]{8}$/.test(formData.telefono)) newErrors.telefono = dict.checkout.errors.telefono
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = dict.checkout.errors.email
    if (!formData.provincia) newErrors.provincia = dict.checkout.errors.provincia
    if (!formData.municipio) newErrors.municipio = dict.checkout.errors.municipio
    if (!formData.direccion) newErrors.direccion = dict.checkout.errors.address
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === "provincia") setFormData(prev => ({ ...prev, municipio: "" }))
  }

  const handleCheckout = async () => {
    if (!validate()) return
  
    try {
      if (!cartId) throw new Error("Carrito no encontrado")
  
      const token = localStorage.getItem("token")
      if (!token) {
        toast.error("Inicia sesión para continuar")
        return
      }
  
      const res = await fetch(`${API_URL}/checkout/${cartId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_method: "creditcard",
          metadata: {
            shipping: {
              first_name: formData.nombre,
              last_name: formData.apellidos,
              ci: formData.ci,
              phone: `+53${formData.telefono}`,
              email: formData.email,
              province: formData.provincia,
              municipality: formData.municipio,
              address: formData.direccion,
              instructions: formData.instrucciones,
            }
          }
        }),
      })
  
      const data: { orderId?: number; message?: string } = await res.json().catch(() => ({} as any))
  
      if (!res.ok || !data?.orderId) {
        toast.error(data?.message || "No se pudo completar el checkout.")
        router.push(`/${locale}/fail`)
        return
      }
  
      // éxito
      localStorage.setItem('shippingInfo', JSON.stringify(formData))
      localStorage.setItem('cart', JSON.stringify(
        items.map((item) => ({
          name: item.title,
          quantity: item.quantity,
          price: item.unit_price / 100,
          thumbnail: item.thumbnail,
        }))
      ))
  
      await clearCart()
      toast.success("¡Orden creada! 🎉")
      router.push(`/${locale}/success?orderId=${data.orderId}`)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Error en el proceso de checkout.")
      router.push(`/${locale}/fail`)
    }
  }

  return (
    <div className="py-10 px-4 max-w-4xl mx-auto space-y-8">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 transition mb-4"
      >
        <ArrowLeft size={18} />
        <span className="underline underline-offset-2">{dict.checkout.back}</span>
      </button>

      <h1 className="text-2xl font-bold">{dict.checkout.title}</h1>
      <div className="bg-gray-100 p-4 rounded-lg space-y-4 shadow:md">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center space-x-4">
              <img
                src={item.thumbnail || "/pasto.jpg"}
                alt={item.title}
                className="w-20 h-20 object-cover rounded-md"
              />
              <div>
                <p className="text-lg font-medium">
                  {item.title} x{item.quantity}
                </p>
                <p className="text-gray-700">
                  ${(item.unit_price * item.quantity / 100).toFixed(2)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">{dict.checkout.empty}</p>
        )}
        <div className="text-right font-semibold">
          {dict.checkout.subtotal}: ${(items.reduce((acc, item) => acc + item.unit_price * item.quantity, 0) / 100).toFixed(2)}
        </div>
      </div>

      {/* Datos de envío */}
      <h2 className="text-2xl font-bold">{dict.checkout.shipping}</h2>
      <div className="bg-gray-100 p-4 rounded-lg space-y-4 shadow:md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inputs idénticos a los tuyos */}
          {/* ... deja tus inputs tal cual ... */}
          {/* nombre */}
          <div>
            <label className="block">{dict.checkout.first_name}</label>
            <input name="nombre" value={formData.nombre} onChange={handleChange} className="input" />
            {errors.nombre && <p className="text-red-500 text-sm">{errors.nombre}</p>}
          </div>
          {/* apellidos */}
          <div>
            <label className="block">{dict.checkout.last_name}</label>
            <input name="apellidos" value={formData.apellidos} onChange={handleChange} className="input" />
            {errors.apellidos && <p className="text-red-500 text-sm">{errors.apellidos}</p>}
          </div>
          {/* ci */}
          <div>
            <label className="block">{dict.checkout.ci}</label>
            <input name="ci" value={formData.ci} onChange={handleChange} className="input" />
            {errors.ci && <p className="text-red-500 text-sm">{errors.ci}</p>}
          </div>
          {/* telefono */}
          <div>
            <label className="block">{dict.checkout.phone}</label>
            <input name="telefono" value={formData.telefono} onChange={handleChange} className="input" />
            {errors.telefono && <p className="text-red-500 text-sm">{errors.telefono}</p>}
          </div>
          {/* email */}
          <div>
            <label className="block">{dict.checkout.email}</label>
            <input name="email" value={formData.email} onChange={handleChange} className="input" />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>
          {/* provincia */}
          <div>
            <label className="block">{dict.checkout.province}</label>
            <select name="provincia" value={formData.provincia} onChange={handleChange} className="input">
              <option value="">Seleccione</option>
              {Object.keys(provinciasCuba).map((prov) => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
            {errors.provincia && <p className="text-red-500 text-sm">{errors.provincia}</p>}
          </div>
          {/* municipio */}
          <div>
            <label className="block">{dict.checkout.municipality}</label>
            <select name="municipio" value={formData.municipio} onChange={handleChange} className="input">
              <option value="">Seleccione</option>
              {Object.keys(provinciasCuba).includes(formData.provincia) &&
                provinciasCuba[formData.provincia as keyof typeof provinciasCuba].map((mun) => (
                  <option key={mun} value={mun}>{mun}</option>
                ))}
            </select>
            {errors.municipio && <p className="text-red-500 text-sm">{errors.municipio}</p>}
          </div>
          {/* direccion */}
          <div className="md:col-span-2">
            <label className="block">{dict.checkout.address}</label>
            <input name="direccion" value={formData.direccion} onChange={handleChange} className="input" />
            {errors.direccion && <p className="text-red-500 text-sm">{errors.direccion}</p>}
          </div>
          {/* instrucciones */}
          <div className="md:col-span-2">
            <label className="block">{dict.checkout.instructions}</label>
            <textarea name="instrucciones" value={formData.instrucciones} onChange={handleChange} className="input"></textarea>
          </div>
        </div>
      </div>

      {/* Pago */}
      <h2 className="text-2xl font-bold">{dict.checkout.payment}</h2>
      <button
        onClick={handleCheckout}
        className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 flex justify-center items-center space-x-2"
      >
        <CreditCard size={18} />
        <span>{dict.checkout.pay} {`$${total.toFixed(2)}`}</span>
      </button>
    </div>
  )
}
