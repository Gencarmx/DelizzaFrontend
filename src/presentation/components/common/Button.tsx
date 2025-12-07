import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  isLoading,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-[15px]";

  const variants = {
    primary:
      "bg-yellow-400 hover:bg-yellow-500 text-black shadow-sm shadow-yellow-400/20 active:translate-y-[1px]",
    secondary:
      "bg-gray-900 hover:bg-gray-800 text-white shadow-sm active:translate-y-[1px]",
    outline:
      "border-2 border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
