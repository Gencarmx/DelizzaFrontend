import { useState } from "react";
import { Link } from "react-router";
import reactLogo from "@assets/images/react.svg";
import appLogo from "/favicon.svg";
import PWABadge from "@presentation/components/common/PWABadge";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center max-w-7xl mx-auto">
      <div className="flex justify-center gap-8 mb-8">
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={appLogo}
            className="h-24 md:h-32 p-4 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] will-change-[filter]"
            alt="dlizza-frontend logo"
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={reactLogo}
            className="h-24 md:h-32 p-4 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] motion-safe:animate-[spin_20s_linear_infinite] will-change-[filter]"
            alt="React logo"
          />
        </a>
      </div>

      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
        dlizza-frontend
      </h1>

      <div className="mb-8">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-6 py-3 rounded-lg border border-transparent bg-[#1a1a1a] font-medium cursor-pointer transition-colors duration-300 hover:border-[#646cff] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#646cff]"
        >
          count is {count}
        </button>
        <p className="mt-4 text-sm md:text-base">
          Edit{" "}
          <code className="bg-[#1a1a1a] px-2 py-1 rounded">src/App.tsx</code>{" "}
          and save to test HMR
        </p>
      </div>

      <p className="text-gray-400 mb-8 text-sm md:text-base">
        Click on the Vite and React logos to learn more
      </p>

      <nav className="flex flex-wrap gap-4 justify-center">
        <Link
          to="/"
          className="text-[#646cff] hover:text-[#535bf2] font-medium no-underline transition-colors"
        >
          Home
        </Link>
        <Link
          to="/about"
          className="text-[#646cff] hover:text-[#535bf2] font-medium no-underline transition-colors"
        >
          About
        </Link>
        <Link
          to="/user/123"
          className="text-[#646cff] hover:text-[#535bf2] font-medium no-underline transition-colors"
        >
          User Profile
        </Link>
        <Link
          to="/products"
          className="text-[#646cff] hover:text-[#535bf2] font-medium no-underline transition-colors"
        >
          Products
        </Link>
      </nav>

      <PWABadge />
    </div>
  );
}
