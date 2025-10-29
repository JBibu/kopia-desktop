import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface OptionalFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  type?: 'text' | 'password' | 'email' | 'url' | 'number';
  className?: string;
}

export function OptionalField({
  label,
  name,
  value,
  onChange,
  placeholder,
  helpText,
  type = 'text',
  className,
}: OptionalFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
