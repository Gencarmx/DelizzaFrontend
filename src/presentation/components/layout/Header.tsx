import type { ComponentProps } from "react";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router";
import { useCart } from "@core/context/CartContext";

export function Header(props: ComponentProps<"header">) {
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const totalItems = getTotalItems();

  return (
    <header
      className={`flex items-center justify-between p-4 bg-white dark:bg-gray-800 sticky top-0 z-50 ${props.className}`}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-sm">
          D
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-xl leading-none text-gray-900 dark:text-white">
            LIZZA
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 tracking-wider">
            DELIVERY APP
          </span>
        </div>
      </div>
      <button
        onClick={() => navigate("/cart")}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
      >
        <ShoppingCart className="w-6 h-6 text-gray-900 dark:text-white" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {totalItems > 9 ? "9+" : totalItems}
          </span>
        )}
      </button>
    </header>
  );
}
