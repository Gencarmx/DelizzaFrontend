// Mock data for development
export const categories = [
  { id: 1, name: "Pizzas", icon: "https://replicate.delivery/xezq/aJmFH56nHHbWMhglLh405cYSCda46FGj3Aj7QADLFBx8QFcF/tmpg2olm87l.jpeg" },
  { id: 2, name: "Bebidas", icon: "https://replicate.delivery/xezq/KateLResDzg0uEuvIQZfokasNEwJfvEgH9uUDblTsQGBPUBXB/tmph79v_0qn.jpeg" },
  { id: 3, name: "Postres", icon: "https://replicate.delivery/xezq/1cthe3Z0MixtCa6r5yhVKcFnn8NvYFhB0cMHhYgO3qfxDVwVA/tmpkg3t8irh.jpeg" },
  { id: 4, name: "Burger", icon: "https://replicate.delivery/xezq/4Hlfioyf6Iid2kD1F3PeBilwy4qrjRSc4Vc1571ohFwcHqgrA/tmpt6pkkclu.jpeg" },
]

export const localFavorites = [
  {
    id: 1,
    name: "Tio hamburguesas",
    image: "https://replicate.delivery/xezq/Q3zjl87zffgLx08p5eKBp4cywHZT0fNbUejGWT2PMgXe7QFcF/tmpj0jptx0g.jpeg",
    deliveryTime: 35,
    deliveryCost: 30,
    rating: 4.3,
  },
  {
    id: 2,
    name: "Sushi roll",
    image: "https://replicate.delivery/xezq/OY5SgtbVcXqfCi2zPg664BeqGWNCQLhjmafeyO6fFhCEeQFcF/tmpm7jolm8o.jpeg",
    deliveryTime: 35,
    deliveryCost: 35,
    rating: 3.0,
  },
]

export const restaurants = [
  {
    id: 1,
    name: "China food express",
    image: "https://replicate.delivery/xezq/7Eg5frNdQfqHfJ4ISv8lqqiaXVKDkffSVfIUur9f3ADA6hK4KA/tmpl_qvibc2.jpeg",
    deliveryTime: 25,
    deliveryCost: 40,
    rating: 4.8,
    headerImage: "https://replicate.delivery/xezq/Ppd71sHjKdaCPlmyEYa6ewIjxTqlBG77H18B72Zyj9p8hK4KA/tmph2z3b7kp.jpeg",
  },
  {
    id: 2,
    name: "Kinch",
    image: "https://replicate.delivery/xezq/jI4Va64QnYotI5h5Y4Zb7baHnIfX3iIAeWDw3xOPeEeAPUBXB/tmp6leyuhu1.jpeg",
    deliveryTime: 20,
    deliveryCost: 37,
    rating: 4.4,
    headerImage: "https://replicate.delivery/xezq/2kWfvbFFAYwaGyVf1QAhaayke0YSRhiMj4qZdfpMCD2mPUBXB/tmpl48yksxg.jpeg",
  },
  {
    id: 3,
    name: "Tio hamburguesas",
    image: "https://replicate.delivery/xezq/QlzY5PAjsx67GpRMdxjS6UHef1i3pgHz48gq8aTMTlR7DVwVA/tmp3pnguzyw.jpeg",
    deliveryTime: 35,
    deliveryCost: 30,
    rating: 4.3,
    headerImage: "https://replicate.delivery/xezq/pNyMLLsHa9ryEpklUoBlsNbEOfL4RMSLefsWJBvc8x9oHqgrA/tmp5fbjqyph.jpeg",
  },
]

export const products = [
  {
    id: 1,
    restaurantId: 1,
    name: "Combo familiar",
    description:
      "3 hamburguesas con carne de res, queso, lechuga, jitomate, mayonesa, catsup y cebolla. Acompañadas de papas a la francesa y aderezos",
    price: 399,
    image: "/images/api-attachments-qwnwmdgr6dze8m7qjr1go.png",
    category: "Combos",
    ingredients: ["3 hamburguesas", "Papas", "Aderezos"],
  },
  {
    id: 2,
    restaurantId: 1,
    name: "Hamburguesa calsica",
    description: "Hamburguesa con carne de res y papas",
    price: 180,
    image: "https://replicate.delivery/xezq/4qWvLfBrgs3gcyCzeCAD3z3cuHDAZjwX7he4sgaGBVMfOUBXB/tmpp5957ijg.jpeg",
    category: "Promoción",
    ingredients: ["Hamburguesa", "Papas"],
  },
  {
    id: 3,
    restaurantId: 1,
    name: "Hot Dog clasico",
    description: "Hot Dog mediano y papas",
    price: 120,
    image: "https://replicate.delivery/xezq/Yk5qX1Z1RfT4bSAM5RI9opfrgtFklPs7lJPzwishG3w2DVwVA/tmpubf9gq2s.jpeg",
    category: "Promoción",
    ingredients: ["Hot Dog mediano", "Papas"],
  },
]

export const cartInitial = []

export const addresses = [
  {
    id: 1,
    name: "Oficina de trabajo",
    address: "Calle 25 77517 Izamal",
    isDefault: true,
  },
  {
    id: 2,
    name: "Oficina de trabajo",
    address: "Calle 25 77517 Izamal",
    isDefault: false,
  },
  {
    id: 3,
    name: "Oficina de trabajo",
    address: "Calle 25 77517 Izamal",
    isDefault: false,
  },
]

export const paymentMethods = [
  {
    id: 1,
    type: "visa",
    last4: "2398",
    isDefault: true,
  },
]

export const user = {
  name: "Usuario",
  email: "usuario@email.com",
  avatar: null,
}
