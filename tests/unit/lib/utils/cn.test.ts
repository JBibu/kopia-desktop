/**
 * Unit tests for cn utility (Tailwind CSS class merging)
 */

import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
  });

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar');
  });

  it('merges Tailwind classes correctly (overrides)', () => {
    // tailwind-merge should keep the last conflicting class
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('keeps non-conflicting Tailwind classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
    expect(cn('text-red-500', 'font-bold')).toBe('text-red-500 font-bold');
  });

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn(['foo', false && 'bar', 'baz'])).toBe('foo baz');
  });

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles mixed inputs', () => {
    expect(cn('foo', ['bar', 'baz'], { qux: true, quux: false })).toBe('foo bar baz qux');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(undefined, null, false)).toBe('');
  });

  it('trims whitespace', () => {
    expect(cn('  foo  ', '  bar  ')).toBe('foo bar');
  });

  it('handles complex Tailwind scenarios', () => {
    // Responsive modifiers should work
    expect(cn('px-2 md:px-4', 'px-3')).toBe('md:px-4 px-3');

    // Hover states should work
    expect(cn('hover:text-red-500', 'hover:text-blue-500')).toBe('hover:text-blue-500');

    // Dark mode should work
    expect(cn('dark:bg-gray-800', 'dark:bg-gray-900')).toBe('dark:bg-gray-900');
  });
});
