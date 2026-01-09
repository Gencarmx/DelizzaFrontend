import { ChevronDown, Heart, Star, Clock } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* Address Selector */}
      <button className="flex items-center gap-1 bg-white px-4 py-2 rounded-full w-fit shadow-sm border border-gray-100 cursor-pointer">
        <div className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-800">
          <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
        </div>
        <span className="text-sm font-medium text-gray-700">
          Calle 25 77517 Izamal
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {/* Hero/Search */}
      <div className="bg-amber-100/50 rounded-2xl p-6 text-center shadow-sm">
        <h2 className="text-xl font-medium text-gray-800 mb-0 tracking-wide font-serif">
          ¿Que se te antoja hoy?
        </h2>
      </div>

      {/* Categories */}
      <div className="flex justify-between px-2">
        {[
          { icon: "🍕", label: "Pizzas" },
          { icon: "🧋", label: "Bebidas" },
          { icon: "🍰", label: "Postres" },
          { icon: "🍔", label: "Burger" },
        ].map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-2xl shadow-sm group-hover:bg-white group-hover:shadow-md transition-all">
              {item.icon}
            </div>
            <span className="text-xs font-medium text-gray-600">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Favorites Section */}
      <section>
        <h3 className="font-bold text-lg text-gray-900 mb-4">
          El favorito entre los locales
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x hide-scrollbar">
          {[
            {
              name: "Tio hamburguesas",
              rating: "4.3",
              delivery: "$30",
              time: "35 min",
              image:
                "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnVyZ2VyfGVufDB8fDB8fHww",
            },
            {
              name: "Sushi roll",
              rating: "3",
              delivery: "$35",
              time: "40 min",
              image:
                "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8c3VzaGl8ZW58MHx8MHx8fDA%3D",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-3 min-w-[200px] shadow-sm border border-gray-100 flex flex-col gap-2 snap-start"
            >
              <div className="relative h-32 rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={item.image}
                  className="w-full h-full object-cover"
                  alt={item.name}
                />
                <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full cursor-pointer">
                  <Heart className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-sm truncate">
                  {item.name}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <Star className="w-3 h-3 fill-current" /> {item.rating}
                  </span>
                  <span>Envío: {item.delivery}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.time}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Restaurants List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900">Restaurantes</h3>
          <button className="text-amber-400 text-sm font-medium hover:text-amber-500 cursor-pointer">
            Ver mas &gt;
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {[
            {
              name: "China food express",
              delivery: "$40",
              time: "25 min",
              rating: "4.8",
              image:
                "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hpbmVzZSUyMGZvb2R8ZW58MHx8MHx8fDA%3D",
            },
            {
              name: "Kinich",
              delivery: "$37",
              time: "20 min",
              rating: "4.4",
              image:
                "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8Zm9vZHxlbnwwfHwwfHx8MA%3D%3D",
            },
          ].map((item, index) => (
            <div
              key={index}
              className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden">
                <img
                  src={item.image}
                  className="w-full h-full object-cover"
                  alt={item.name}
                />
              </div>
              <div className="flex-1 py-1">
                <h4 className="font-semibold text-gray-800">{item.name}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                  <span>Envío: {item.delivery}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.time}
                  </span>
                  <span className="flex items-center gap-1 text-amber-500 font-medium">
                    <Star className="w-3 h-3 fill-current" /> {item.rating}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
