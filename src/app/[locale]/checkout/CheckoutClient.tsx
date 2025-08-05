"use client"

import { useCart } from "@/context/CartContext"
import { CreditCard } from "lucide-react"
import { useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from 'next/navigation'
import { ArrowLeft } from "lucide-react"
import type { Dict } from '@/types/Dict'

const StripePaymentForm = dynamic(() => import("@/components/StripePaymentForm"), { ssr: false })

const provinciasCuba = {
  "Pinar del Río": ["Pinar del Río", "Consolación del Sur", "San Juan y Martínez", "Guane", "San Luis"],
  "La Habana": ["Playa", "Plaza de la Revolución", "Centro Habana", "Habana Vieja", "10 de Octubre"],
  "Villa Clara": ["Santa Clara", "Camajuaní", "Caibarien", "Remedios"],
  "Santiago de Cuba": ["Santiago de Cuba", "Contramaestre", "San Luis"],
}

export default function CheckoutPage({ dict }: { dict: Dict }) {
  const { items, cartId } = useCart()
  const router = useRouter()
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
    if (name === "provincia") {
      setFormData(prev => ({ ...prev, municipio: "" }))
    }
  }

  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const handleCheckout = async () => {
    if (!validate()) return

    try {
      if (!cartId) throw new Error("Carrito no encontrado")

      await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/carts/${cartId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_API_KEY || "",
        },
        body: JSON.stringify({
          shipping_address: {
            first_name: formData.nombre,
            last_name: formData.apellidos,
            address_1: formData.instrucciones || "Entrega en Cuba",
            address_2: formData.direccion || "",
            city: formData.municipio,
            province: formData.provincia,
            country_code: "us",
            postal_code: "00000",
            phone:  `+53${formData.telefono}`,
          },
          email: formData.email,
          metadata: {
            ci: formData.ci,
            telefono: formData.telefono,
            instrucciones: formData.instrucciones,
            direccion: formData.direccion,
            provincia: formData.provincia,
            municipio: formData.municipio,
          },
        }),
      })

      const colRes = await fetch(`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/payment-collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_API_KEY || "",
        },
        body: JSON.stringify({ cart_id: cartId }),
      })

      if (!colRes.ok) throw new Error("Error creando payment_collection")
      const colData = await colRes.json()
      const paymentCollectionId = colData.payment_collection.id

      const paymentSessionRes = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/store/payment-collections/${paymentCollectionId}/payment-sessions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_API_KEY || "",
          },
          body: JSON.stringify({ provider_id: "pp_stripe_stripe" }),
        }
      )

      if (!paymentSessionRes.ok) throw new Error("Error creando sesión de pago")
      const sessionData = await paymentSessionRes.json()
      const clientSecret = sessionData.payment_collection?.payment_sessions?.[0]?.data?.client_secret
      if (!clientSecret) throw new Error("No se recibió client_secret")

      localStorage.setItem('shippingInfo', JSON.stringify(formData))
      localStorage.setItem(
        'cart',
        JSON.stringify(
          items.map((item) => ({
            name: item.title,
            quantity: item.quantity,
            price: item.unit_price / 100,
            thumbnail: item.thumbnail,
          }))
        )
      )

      setClientSecret(clientSecret)
    } catch (error) {
      console.error(error)
      alert("Error en el proceso de checkout.")
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

      <h2 className="text-2xl font-bold">{dict.checkout.shipping}</h2>
      <div className="bg-gray-100 p-4 rounded-lg space-y-4 shadow:md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block">{dict.checkout.first_name}</label>
            <input name="nombre" value={formData.nombre} onChange={handleChange} className="input" />
            {errors.nombre && <p className="text-red-500 text-sm">{errors.nombre}</p>}
          </div>
          <div>
            <label className="block">{dict.checkout.last_name}</label>
            <input name="apellidos" value={formData.apellidos} onChange={handleChange} className="input" />
            {errors.apellidos && <p className="text-red-500 text-sm">{errors.apellidos}</p>}
          </div>
          <div>
            <label className="block">{dict.checkout.ci}</label>
            <input name="ci" value={formData.ci} onChange={handleChange} className="input" />
            {errors.ci && <p className="text-red-500 text-sm">{errors.ci}</p>}
          </div>
          <div>
            <label className="block">{dict.checkout.phone}</label>
            <input name="telefono" value={formData.telefono} onChange={handleChange} className="input" />
            {errors.telefono && <p className="text-red-500 text-sm">{errors.telefono}</p>}
          </div>
          <div>
            <label className="block">{dict.checkout.email}</label>
            <input name="email" value={formData.email} onChange={handleChange} className="input" />
            {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
          </div>
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
          <div className="md:col-span-2">
            <label className="block">{dict.checkout.address}</label>
            <input name="direccion" value={formData.direccion} onChange={handleChange} className="input" />
            {errors.direccion && <p className="text-red-500 text-sm">{errors.direccion}</p>}
            </div>
          <div className="md:col-span-2">
            <label className="block">{dict.checkout.instructions}</label>
            <textarea name="instrucciones" value={formData.instrucciones} onChange={handleChange} className="input"></textarea>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold">{dict.checkout.payment}</h2>
      {clientSecret ? (
        <StripePaymentForm clientSecret={clientSecret} />
      ) : (
        <button
          onClick={handleCheckout}
          className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 flex justify-center items-center space-x-2"
        >
          <CreditCard size={18} />
          <span>{dict.checkout.pay} {`$${total.toFixed(2)}`}</span>
        </button>
      )}
    </div>
  )
}
