import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import type { TimeOfDay } from '@/lib/kopia';

// ============================================================================
// Shared Types
// ============================================================================

interface PolicyFieldProps {
  label: string;
  isDefined: boolean;
  effectiveValue?: unknown;
  help?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function timeOfDayToString(tod: TimeOfDay): string {
  return `${tod.hour.toString().padStart(2, '0')}:${tod.min.toString().padStart(2, '0')}`;
}

// ============================================================================
// Field Components
// ============================================================================

interface PolicyNumberFieldProps extends PolicyFieldProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

export function PolicyNumberField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  help,
}: PolicyNumberFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && typeof effectiveValue === 'number' && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}: {effectiveValue}
          </span>
        )}
      </div>
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        placeholder={typeof effectiveValue === 'number' ? String(effectiveValue) : undefined}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicyTextFieldProps extends PolicyFieldProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

export function PolicyTextField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  placeholder,
  help,
}: PolicyTextFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && typeof effectiveValue === 'string' && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}: {effectiveValue}
          </span>
        )}
      </div>
      <Input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={
          placeholder || (typeof effectiveValue === 'string' ? effectiveValue : undefined)
        }
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicyBooleanFieldProps extends PolicyFieldProps {
  value?: boolean;
  onChange: (value: boolean | undefined) => void;
}

export function PolicyBooleanField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  help,
}: PolicyBooleanFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}:{' '}
            {effectiveValue ? t('policies.enabled') : t('policies.disabled')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Switch checked={value ?? false} onCheckedChange={(checked) => onChange(checked)} />
        <span className="text-sm text-muted-foreground">
          {value ? t('policies.enabled') : t('policies.disabled')}
        </span>
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicyArrayFieldProps extends PolicyFieldProps {
  value?: string[];
  onChange: (value: string[] | undefined) => void;
  placeholder?: string;
}

export function PolicyArrayField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  placeholder,
  help,
}: PolicyArrayFieldProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (!inputValue.trim()) return;
    const newValue = [...(value || []), inputValue.trim()];
    onChange(newValue);
    setInputValue('');
  };

  const handleRemove = (index: number) => {
    const newValue = [...(value || [])];
    newValue.splice(index, 1);
    onChange(newValue.length > 0 ? newValue : undefined);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && Array.isArray(effectiveValue) && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}: {effectiveValue.length} {t('policies.rules')}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button type="button" size="sm" onClick={handleAdd}>
          {t('common.add')}
        </Button>
      </div>
      {value && value.length > 0 && (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 text-sm bg-muted rounded"
            >
              <code className="font-mono">{item}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(idx)}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicyTimeOfDayFieldProps extends Omit<PolicyFieldProps, 'effectiveValue'> {
  value?: TimeOfDay[];
  onChange: (value: TimeOfDay[] | undefined) => void;
  placeholder?: string;
  effectiveValue?: TimeOfDay[];
}

// Generate hour options (00-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
// Generate minute options (00, 05, 10, ..., 55) - 5-minute increments for usability
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

export function PolicyTimeOfDayField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  help,
}: PolicyTimeOfDayFieldProps) {
  const { t } = useTranslation();
  const [selectedHour, setSelectedHour] = useState<string>('09');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');

  const handleAdd = () => {
    const newTime: TimeOfDay = {
      hour: parseInt(selectedHour, 10),
      min: parseInt(selectedMinute, 10),
    };
    // Check if this time already exists
    const exists = value?.some((v) => v.hour === newTime.hour && v.min === newTime.min);
    if (exists) return;

    const newValue = [...(value || []), newTime];
    // Sort by time
    newValue.sort((a, b) => a.hour * 60 + a.min - (b.hour * 60 + b.min));
    onChange(newValue);
  };

  const handleRemove = (index: number) => {
    const newValue = [...(value || [])];
    newValue.splice(index, 1);
    onChange(newValue.length > 0 ? newValue : undefined);
  };

  // Convert effective value for display
  const effectiveStrings = effectiveValue?.map(timeOfDayToString);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveStrings !== undefined && !isDefined && effectiveStrings.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}: {effectiveStrings.join(', ')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Select value={selectedHour} onValueChange={setSelectedHour}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((hour) => (
              <SelectItem key={hour} value={hour}>
                {hour}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-lg font-medium">:</span>
        <Select value={selectedMinute} onValueChange={setSelectedMinute}>
          <SelectTrigger className="w-20">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((minute) => (
              <SelectItem key={minute} value={minute}>
                {minute}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          {t('common.add')}
        </Button>
      </div>
      {value && value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted rounded-full"
            >
              <code className="font-mono">{timeOfDayToString(item)}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(idx)}
                className="h-5 w-5 p-0 hover:bg-destructive/20 rounded-full"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

interface PolicySelectFieldProps extends PolicyFieldProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  options: Array<{ value: string; label: string }>;
}

export function PolicySelectField({
  label,
  value,
  onChange,
  isDefined,
  effectiveValue,
  options,
  help,
}: PolicySelectFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isDefined && <Badge variant="outline">{t('policies.overridden')}</Badge>}
        </Label>
        {effectiveValue !== undefined && !isDefined && typeof effectiveValue === 'string' && (
          <span className="text-xs text-muted-foreground">
            {t('policies.inherited')}:{' '}
            {options.find((o) => o.value === effectiveValue)?.label || effectiveValue}
          </span>
        )}
      </div>
      <Select value={value ?? ''} onValueChange={(v) => onChange(v || undefined)}>
        <SelectTrigger>
          <SelectValue placeholder={t('policies.notSet')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{t('policies.notSet')}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
