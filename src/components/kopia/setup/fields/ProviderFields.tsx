import { FormField } from './FormField';
import type { PartialStorageConfig } from '../types';
import { useProviderConfig } from '@/hooks';
import { useTranslation } from 'react-i18next';

/**
 * Field definition for schema-driven provider forms
 */
export interface FieldDef {
  name: string;
  labelKey: string;
  placeholder: string;
  helpKey: string;
  type?: 'text' | 'password' | 'number';
  required?: boolean;
  autoFocus?: boolean;
}

interface ProviderFieldsProps {
  config: PartialStorageConfig;
  onChange: (config: PartialStorageConfig) => void;
  fields: FieldDef[];
}

/**
 * Schema-driven provider form fields.
 * Renders a list of FormField components based on field definitions.
 */
export function ProviderFields({ config, onChange, fields }: ProviderFieldsProps) {
  const { t } = useTranslation();
  const { handleChange } = useProviderConfig(config, onChange);

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FormField
          key={field.name}
          label={t(field.labelKey)}
          name={field.name}
          value={(config[field.name] as string | number | undefined)?.toString() ?? ''}
          onChange={(v) =>
            handleChange(field.name, field.type === 'number' ? parseInt(v) || undefined : v)
          }
          placeholder={field.placeholder}
          helpText={t(field.helpKey)}
          type={field.type}
          required={field.required}
          autoFocus={field.autoFocus}
        />
      ))}
    </div>
  );
}
