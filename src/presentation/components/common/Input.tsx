import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-2 w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
          w-full px-4 py-3.5 rounded-lg bg-gray-50 border border-gray-200
          transition-all duration-200 outline-none text-gray-900 
          placeholder:text-gray-400 text-[15px]
          hover:border-gray-300 hover:bg-white
          focus:border-yellow-400 focus:bg-white focus:ring-2 focus:ring-yellow-400/20
          ${
            error
              ? "border-red-400 focus:border-red-400 focus:ring-red-400/20"
              : ""
          }
          ${className}
        `}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500 ml-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
