import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  type?: 'text' | 'password' | 'email' | 'url' | 'number';
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Unified form field component that replaces RequiredField and OptionalField.
 * Use the `required` prop to show the asterisk and mark the field as required.
 */
export function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  helpText,
  type = 'text',
  required = false,
  autoFocus,
  className,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className={className}
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
