import { Heart, Star, Clock } from "lucide-react";

export default function Favorites() {
  const favorites = [
    {
      id: 1,
      name: "Tio hamburguesas",
      rating: "4.3",
      delivery: "$30",
      time: "35 min",
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnVyZ2VyfGVufDB8fDB8fHww",
    },
    {
      id: 2,
      name: "China food express",
      rating: "4.8",
      delivery: "$40",
      time: "25 min",
      image:
        "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y2hpbmVzZSUyMGZvb2R8ZW58MHx8MHx8fDA%3D",
    },
    {
      id: 3,
      name: "Sushi roll",
      rating: "3",
      delivery: "$35",
      time: "40 min",
      image:
        "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8c3VzaGl8ZW58MHx8MHx8fDA%3D",
    },
  ];

  return (
    <div className="flex flex-col pt-2">
      <h2 className="font-bold text-lg text-gray-900 mb-4 bg-white sticky top-0 z-10 py-2">
        Favoritos
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {favorites.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl p-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col gap-2"
          >
            <div className="relative h-32 rounded-2xl overflow-hidden bg-gray-100">
              <img
                src={item.image}
                className="w-full h-full object-cover"
                alt={item.name}
              />
              <button className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full cursor-pointer hover:bg-white transition-colors">
                <Heart className="w-4 h-4 text-amber-400 fill-amber-400" />
              </button>
            </div>

            <div className="px-1">
              <h4 className="font-semibold text-gray-800 text-sm truncate mb-1">
                {item.name}
              </h4>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                <span className="flex items-center gap-0.5 text-gray-800">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="mt-0.5">{item.rating}</span>
                </span>
                <span className="text-gray-300">•</span>
                <span>Envío: {item.delivery}</span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-0.5 whitespace-nowrap">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="mt-0.5">{item.time}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
