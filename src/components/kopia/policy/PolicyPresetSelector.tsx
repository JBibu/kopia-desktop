import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getAllPresets, type PolicyPresetId, type PolicyPreset } from '@/lib/kopia/policy-presets';
import { cn } from '@/lib/utils';

interface PolicyPresetSelectorProps {
  value: PolicyPresetId;
  onChange: (presetId: PolicyPresetId) => void;
  className?: string;
}

/**
 * PolicyPresetSelector - Radio group for selecting backup policy presets
 *
 * Displays preset cards with:
 * - Icon
 * - Name (translated)
 * - Description (translated)
 * - Retention summary (frequency + duration)
 *
 * Used in:
 * - ProfileFormDialog (profile creation)
 * - Onboarding wizard (quick start)
 */
export function PolicyPresetSelector({ value, onChange, className }: PolicyPresetSelectorProps) {
  const presets = getAllPresets();

  return (
    <div className={cn('space-y-3', className)}>
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {presets.map((preset) => (
            <PresetCard key={preset.id} preset={preset} selected={value === preset.id} />
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}

interface PresetCardProps {
  preset: PolicyPreset;
  selected: boolean;
}

function PresetCard({ preset, selected }: PresetCardProps) {
  const { t } = useTranslation();
  const Icon = preset.icon;

  return (
    <label
      htmlFor={`preset-${preset.id}`}
      className={cn(
        'cursor-pointer transition-all',
        selected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <Card className={cn('hover:border-primary/50', selected && 'border-primary bg-accent/5')}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Radio button */}
            <RadioGroupItem value={preset.id} id={`preset-${preset.id}`} className="mt-1" />

            {/* Icon */}
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-lg',
                selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <Icon className="size-5" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="font-medium leading-none">{t(preset.nameKey)}</div>
              <CardDescription className="text-xs">{t(preset.descriptionKey)}</CardDescription>

              {/* Retention summary */}
              {preset.id !== 'CUSTOM' && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-1">
                    {preset.retentionSummary.frequency}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1">
                    {preset.retentionSummary.duration}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </label>
  );
}
