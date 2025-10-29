import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface RequiredFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  type?: 'text' | 'password' | 'email' | 'url';
  autoFocus?: boolean;
  className?: string;
}

export function RequiredField({
  label,
  name,
  value,
  onChange,
  placeholder,
  helpText,
  type = 'text',
  autoFocus,
  className,
}: RequiredFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm">
        {label} <span className="text-destructive">*</span>
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoFocus={autoFocus}
        className={className}
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
