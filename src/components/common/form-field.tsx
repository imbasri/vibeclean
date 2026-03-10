"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

// ============================================
// TYPES
// ============================================

interface FormFieldBaseProps {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

interface FormInputFieldProps extends FormFieldBaseProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: "text" | "email" | "tel" | "number" | "password" | "url";
  inputClassName?: string;
}

interface FormTextareaFieldProps extends FormFieldBaseProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  textareaClassName?: string;
}

interface FormSelectFieldProps extends FormFieldBaseProps {
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  selectClassName?: string;
}

// ============================================
// ERROR MESSAGE COMPONENT
// ============================================

function FormErrorMessage({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-red-500 mt-1.5">
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}

// ============================================
// FORM DESCRIPTION COMPONENT
// ============================================

function FormDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-500 mt-1">{children}</p>
  );
}

// ============================================
// FORM INPUT FIELD
// ============================================

export const FormInputField = React.forwardRef<HTMLInputElement, FormInputFieldProps>(
  function FormInputField(
    {
      label,
      name,
      type = "text",
      placeholder,
      disabled,
      autoComplete,
      error,
      description,
      required,
      className,
      inputClassName,
      ...props
    },
    ref
  ) {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={cn("space-y-1.5", className)}>
        <Label htmlFor={name} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            ref={ref}
            id={name}
            name={name}
            type={inputType}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            className={cn(
              error && "border-red-500 focus-visible:ring-red-500",
              isPassword && "pr-10",
              inputClassName
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        {description && !error && (
          <FormDescription>{description}</FormDescription>
        )}
        <FormErrorMessage error={error} />
      </div>
    );
  }
);

// ============================================
// FORM TEXTAREA FIELD
// ============================================

export const FormTextareaField = React.forwardRef<HTMLTextAreaElement, FormTextareaFieldProps>(
  function FormTextareaField(
    {
      label,
      name,
      placeholder,
      disabled,
      rows = 3,
      error,
      description,
      required,
      className,
      textareaClassName,
      ...props
    },
    ref
  ) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <Label htmlFor={name} className="flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Textarea
          ref={ref}
          id={name}
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn(
            error && "border-red-500 focus-visible:ring-red-500",
            textareaClassName
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
          {...props}
        />
        {description && !error && (
          <FormDescription>{description}</FormDescription>
        )}
        <FormErrorMessage error={error} />
      </div>
    );
  }
);

// ============================================
// FORM SELECT FIELD (Native)
// ============================================

export function FormSelectField({
  label,
  name,
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  disabled,
  error,
  description,
  required,
  className,
  selectClassName,
}: FormSelectFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus-visible:ring-red-500",
          selectClassName
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {description && !error && (
        <FormDescription>{description}</FormDescription>
      )}
      <FormErrorMessage error={error} />
    </div>
  );
}

// ============================================
// FORM FIELD WRAPPER (for custom inputs)
// ============================================

interface FormFieldWrapperProps {
  label: string;
  name: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormFieldWrapper({
  label,
  name,
  error,
  description,
  required,
  className,
  children,
}: FormFieldWrapperProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {description && !error && (
        <FormDescription>{description}</FormDescription>
      )}
      <FormErrorMessage error={error} />
    </div>
  );
}

// ============================================
// FORM ROW (for side-by-side fields)
// ============================================

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FormRow({ children, className }: FormRowProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}>
      {children}
    </div>
  );
}

// ============================================
// EXPORT ALL
// ============================================

export { FormErrorMessage, FormDescription };
