// lib/products.ts

export const allProducts = [
    {
      id: '1',
      name: 'Cafe La Llave',
      price: 5,
      imageSrc: '/products/cafeLaLlave.jpg',
      category: 'food',
    },
    {
      id: '2',
      name: 'Blusa Casual',
      price: 49.99,
      imageSrc: '/products/blusa.jpg',
      category: 'clothing',
    },
    {
      id: '3',
      name: 'TV',
      price: 299.99,
      imageSrc: '/products/tv.jpg',
      category: 'appliances',
    },
    {
        id: '4',
        name: 'Cafe Bustelo',
        price: 5,
        imageSrc: '/products/cafeBustelo.jpg',
        category: 'food',
      },
      {
        id: '5',
        name: 'Pantalon Blanco',
        price: 30,
        imageSrc: '/products/pantalon.webp',
        category: 'clothing',
      },
      {
        id: '6',
        name: 'TV',
        price: 350,
        imageSrc: '/products/lavadora.jpg',
        category: 'appliances',
      },
    // Agrega más productos de prueba
  ]
  
  export function getProductsByCategory(category: string) {
    return allProducts.filter((product) => product.category === category)
  }
  