import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Textarea({
  label,
  error,
  helperText,
  className = "",
  ...props
}: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <textarea
        className={`w-full px-4 py-2.5 bg-gray-50 border ${
          error ? "border-red-300" : "border-gray-200"
        } rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
          error ? "focus:ring-red-400" : "focus:ring-amber-400"
        } focus:border-transparent transition-all resize-none ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
