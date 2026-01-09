import type { ComponentProps } from "react";
import { ShoppingCart } from "lucide-react";

export function Header(props: ComponentProps<"header">) {
  return (
    <header
      className={`flex items-center justify-between p-4 bg-white sticky top-0 z-50 ${props.className}`}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">
          D
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-xl leading-none text-gray-900">
            LIZZA
          </span>
          <span className="text-[10px] text-gray-400 tracking-wider">
            DELIVERY APP
          </span>
        </div>
      </div>
      <button className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
        <ShoppingCart className="w-6 h-6 text-gray-900" />
      </button>
    </header>
  );
}
