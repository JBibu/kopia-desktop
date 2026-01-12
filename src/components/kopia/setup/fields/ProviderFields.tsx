import { FormField } from './FormField';
import { PathPickerField } from './PathPickerField';
import type { PartialStorageConfig } from '../types';
import { useProviderConfig } from '@/hooks';
import { useTranslation } from 'react-i18next';

/**
 * Field definition for schema-driven provider forms.
 *
 * Supports multiple field types:
 * - `text`: Standard text input (default)
 * - `password`: Password input with masking
 * - `number`: Numeric input
 * - `path`: Directory path picker with browse button
 */
export interface FieldDef {
  name: string;
  labelKey: string;
  placeholder: string;
  helpKey: string;
  /** Field type: 'text' (default), 'password', 'number', or 'path' (directory picker) */
  type?: 'text' | 'password' | 'number' | 'path';
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
 * Renders form fields based on field definitions, supporting text, password,
 * number, and path picker inputs.
 */
export function ProviderFields({ config, onChange, fields }: ProviderFieldsProps) {
  const { t } = useTranslation();
  const { handleChange } = useProviderConfig(config, onChange);

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        if (field.type === 'path') {
          return (
            <PathPickerField
              key={field.name}
              label={t(field.labelKey)}
              name={field.name}
              value={(config[field.name] as string) ?? ''}
              onChange={(v) => handleChange(field.name, v)}
              placeholder={field.placeholder}
              helpText={t(field.helpKey)}
              required={field.required}
            />
          );
        }

        return (
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
        );
      })}
    </div>
  );
}
