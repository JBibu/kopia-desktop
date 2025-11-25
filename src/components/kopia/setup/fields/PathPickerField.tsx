import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { selectFolder } from '@/lib/kopia/client';

interface PathPickerFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
}

export function PathPickerField({
  label,
  name,
  value,
  onChange,
  placeholder,
  helpText,
  required,
}: PathPickerFieldProps) {
  const { t } = useTranslation();
  const [isPicking, setIsPicking] = useState(false);

  const handleBrowse = async () => {
    setIsPicking(true);
    try {
      const selected = await selectFolder(value || undefined);
      if (selected) {
        onChange(selected);
      }
    } catch (err) {
      // Silently fail - user likely cancelled the dialog
      // Only log for debugging purposes
      if (import.meta.env.DEV) {
        console.error('Failed to open folder picker:', err);
      }
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <Input
          id={name}
          name={name}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1 font-mono text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void handleBrowse()}
          disabled={isPicking}
          title={t('setup.fields.common.browse')}
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
      </div>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}
