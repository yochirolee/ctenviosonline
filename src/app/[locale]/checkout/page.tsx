"use client";

import { useCart } from "@/context/CartContext";
import { CreditCard } from "lucide-react";
import { useState } from "react";

const provinciasCuba = {
  "Pinar del Río": ["Pinar del Río", "Consolación del Sur", "San Juan y Martínez", "Guane", "San Luis"],
  "La Habana": ["Playa", "Plaza de la Revolución", "Centro Habana", "Habana Vieja", "10 de Octubre"],
  "Villa Clara": ["Santa Clara", "Camajuaní", "Caibarien", "Remedios"],
  "Santiago de Cuba": ["Santiago de Cuba", "Contramaestre", "San Luis"],
};

export default function CheckoutPage() {
  const { cartItems } = useCart();
  const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    ci: "",
    telefono: "",
    email: "",
    provincia: "",
    municipio: "",
    instrucciones: "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.nombre) newErrors.nombre = "El nombre es requerido";
    if (!formData.apellidos) newErrors.apellidos = "Los apellidos son requeridos";
    if (!/^[0-9]{11}$/.test(formData.ci)) newErrors.ci = "CI debe tener 11 dígitos";
    if (!/^\+53[0-9]{8}$/.test(formData.telefono)) newErrors.telefono = "Teléfono debe comenzar con +53 y tener 8 dígitos";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Email inválido";
    if (!formData.provincia) newErrors.provincia = "Provincia requerida";
    if (!formData.municipio) newErrors.municipio = "Municipio requerido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "provincia") {
      setFormData(prev => ({ ...prev, municipio: "" }));
    }
  };

  const handleCheckout = async () => {
    if (!validate()) return;
  
    try {
      // Guardar info de envío en localStorage
      localStorage.setItem("shippingInfo", JSON.stringify(formData));
  
      const response = await fetch("/api/checkout_sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems, formData }),
      });
  
      const data = await response.json();
      if (data.url) {
        localStorage.setItem('formData', JSON.stringify(formData))
        window.location.href = data.url;
      } else {
        alert("Algo salió mal. Intenta de nuevo.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Error en el checkout.");
    }
  };

  return (
    <div className="py-10 px-4 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Resumen de Productos</h1>
      <div className="bg-gray-100 p-4 rounded-lg space-y-4 shadow:md">
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-4">
              <img src={item.imageSrc || "/pasto.jpg"} alt={item.name} className="w-20 h-20 object-cover rounded-md" />
              <div>
                <p className="text-lg font-medium">{item.name} x{item.quantity}</p>
                <p className="text-gray-700">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">Tu carrito está vacío.</p>
        )}
        <div className="text-right font-semibold">Subtotal: ${total.toFixed(2)}</div>
      </div>

      <h2 className="text-2xl font-bold">Información de Envío</h2>
      <div className="bg-gray-100 p-4 rounded-lg space-y-4 shadow:md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block">Nombre</label>
          <input name="nombre" value={formData.nombre} onChange={handleChange} className="input" />
          {errors.nombre && <p className="text-red-500 text-sm">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block">Apellidos</label>
          <input name="apellidos" value={formData.apellidos} onChange={handleChange} className="input" />
          {errors.apellidos && <p className="text-red-500 text-sm">{errors.apellidos}</p>}
        </div>
        <div>
          <label className="block">Carné de Identidad</label>
          <input name="ci" value={formData.ci} onChange={handleChange} className="input" />
          {errors.ci && <p className="text-red-500 text-sm">{errors.ci}</p>}
        </div>
        <div>
          <label className="block">Teléfono (+53)</label>
          <input name="telefono" value={formData.telefono} onChange={handleChange} className="input" />
          {errors.telefono && <p className="text-red-500 text-sm">{errors.telefono}</p>}
        </div>
        <div>
          <label className="block">Correo Electrónico</label>
          <input name="email" value={formData.email} onChange={handleChange} className="input" />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>
        <div>
          <label className="block">Provincia</label>
          <select name="provincia" value={formData.provincia} onChange={handleChange} className="input">
            <option value="">Seleccione</option>
            {Object.keys(provinciasCuba).map((prov) => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
          {errors.provincia && <p className="text-red-500 text-sm">{errors.provincia}</p>}
        </div>
        <div>
          <label className="block">Municipio</label>
          <select name="municipio" value={formData.municipio} onChange={handleChange} className="input">
            <option value="">Seleccione</option>
            {Object.keys(provinciasCuba).includes(formData.provincia) &&
              provinciasCuba[formData.provincia as keyof typeof provinciasCuba].map((mun) => (
                <option key={mun} value={mun}>{mun}</option>
              ))
            }
          </select>
          {errors.municipio && <p className="text-red-500 text-sm">{errors.municipio}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block">Instrucciones para la entrega (opcional)</label>
          <textarea name="instrucciones" value={formData.instrucciones} onChange={handleChange} className="input"></textarea>
        </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold">Método de Pago</h2>
      <button
        onClick={handleCheckout}
        className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 flex justify-center items-center space-x-2"
      >
        <CreditCard size={18} />
        <span>Pagar ${total.toFixed(2)}</span>
      </button>
    </div>
  );
}
