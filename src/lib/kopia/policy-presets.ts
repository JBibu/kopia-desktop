import type { LucideIcon } from 'lucide-react';
import { Calendar, CalendarClock, CalendarDays, Clock, Settings2 } from 'lucide-react';
import type { PolicyDefinition } from './types';

/**
 * Policy preset identifiers
 */
export type PolicyPresetId = 'QUICK_START' | 'DAILY_30' | 'WEEKLY_YEAR' | 'HOURLY_WEEK' | 'CUSTOM';

/**
 * Policy preset definition
 * Provides pre-configured policy templates for common backup scenarios
 */
export interface PolicyPreset {
  id: PolicyPresetId;
  nameKey: string; // i18n key for preset name
  descriptionKey: string; // i18n key for preset description
  icon: LucideIcon;
  policyDefinition: PolicyDefinition | null; // null for CUSTOM preset
  retentionSummary: {
    duration: string; // Human-readable duration (e.g., "30 days", "1 year")
    frequency: string; // Human-readable frequency (e.g., "Daily", "Weekly")
  };
}

/**
 * Pre-defined policy presets covering common backup scenarios
 *
 * Each preset configures:
 * - Retention rules (how long to keep snapshots)
 * - Scheduling (when backups run)
 * - Compression (how to compress data)
 * - Error handling (how to handle failures)
 */
export const POLICY_PRESETS: Record<PolicyPresetId, PolicyPreset> = {
  /**
   * QUICK_START: For onboarding new users
   * - Daily backups at 2:00 AM
   * - Keep 10 latest + 30 daily snapshots
   * - Conservative retention for first-time users
   */
  QUICK_START: {
    id: 'QUICK_START',
    nameKey: 'presets.quickStart.name',
    descriptionKey: 'presets.quickStart.description',
    icon: CalendarClock,
    retentionSummary: {
      duration: '30 days',
      frequency: 'Daily',
    },
    policyDefinition: {
      retention: {
        keepLatest: 10,
        keepDaily: 30,
        ignoreIdenticalSnapshots: true,
      },
      scheduling: {
        timeOfDay: [{ hour: 2, min: 0 }], // 2:00 AM daily
        manual: false,
      },
      compression: {
        compressorName: 'zstd',
        onlyCompress: [],
        neverCompress: [],
        minSize: 0,
        maxSize: 0,
      },
      errorHandling: {
        ignoreFileErrors: true,
        ignoreDirectoryErrors: false,
        ignoreUnknownTypes: true,
      },
      files: {
        ignoreCacheDirs: true,
        oneFileSystem: false,
      },
    },
  },

  /**
   * DAILY_30: Daily backups with 30-day retention
   * - Runs every 24 hours
   * - Keeps 30 daily snapshots
   * - Good for documents, code, configurations
   */
  DAILY_30: {
    id: 'DAILY_30',
    nameKey: 'presets.daily30.name',
    descriptionKey: 'presets.daily30.description',
    icon: CalendarDays,
    retentionSummary: {
      duration: '30 days',
      frequency: 'Daily',
    },
    policyDefinition: {
      retention: {
        keepLatest: 5,
        keepDaily: 30,
        ignoreIdenticalSnapshots: true,
      },
      scheduling: {
        intervalSeconds: 86400, // 24 hours
        manual: false,
      },
      compression: {
        compressorName: 'zstd',
        onlyCompress: [],
        neverCompress: [],
        minSize: 0,
        maxSize: 0,
      },
      errorHandling: {
        ignoreFileErrors: true,
        ignoreDirectoryErrors: false,
        ignoreUnknownTypes: true,
      },
      files: {
        ignoreCacheDirs: true,
        oneFileSystem: false,
      },
    },
  },

  /**
   * WEEKLY_YEAR: Weekly backups for 1 year
   * - Runs every 7 days
   * - Keeps 52 weekly snapshots
   * - Good for long-term archives, media libraries
   */
  WEEKLY_YEAR: {
    id: 'WEEKLY_YEAR',
    nameKey: 'presets.weeklyYear.name',
    descriptionKey: 'presets.weeklyYear.description',
    icon: Calendar,
    retentionSummary: {
      duration: '1 year',
      frequency: 'Weekly',
    },
    policyDefinition: {
      retention: {
        keepLatest: 3,
        keepWeekly: 52,
        ignoreIdenticalSnapshots: true,
      },
      scheduling: {
        intervalSeconds: 604800, // 7 days
        manual: false,
      },
      compression: {
        compressorName: 'zstd',
        onlyCompress: [],
        neverCompress: [],
        minSize: 0,
        maxSize: 0,
      },
      errorHandling: {
        ignoreFileErrors: true,
        ignoreDirectoryErrors: false,
        ignoreUnknownTypes: true,
      },
      files: {
        ignoreCacheDirs: true,
        oneFileSystem: false,
      },
    },
  },

  /**
   * HOURLY_WEEK: Hourly backups for 7 days
   * - Runs every hour
   * - Keeps 168 hourly snapshots (24 * 7)
   * - Good for frequently changing data, development work
   */
  HOURLY_WEEK: {
    id: 'HOURLY_WEEK',
    nameKey: 'presets.hourlyWeek.name',
    descriptionKey: 'presets.hourlyWeek.description',
    icon: Clock,
    retentionSummary: {
      duration: '7 days',
      frequency: 'Hourly',
    },
    policyDefinition: {
      retention: {
        keepLatest: 10,
        keepHourly: 168, // 7 days * 24 hours
        ignoreIdenticalSnapshots: true,
      },
      scheduling: {
        intervalSeconds: 3600, // 1 hour
        manual: false,
      },
      compression: {
        compressorName: 'zstd',
        onlyCompress: [],
        neverCompress: [],
        minSize: 0,
        maxSize: 0,
      },
      errorHandling: {
        ignoreFileErrors: true,
        ignoreDirectoryErrors: false,
        ignoreUnknownTypes: true,
      },
      files: {
        ignoreCacheDirs: true,
        oneFileSystem: false,
      },
    },
  },

  /**
   * CUSTOM: User manages policy directly
   * - No pre-defined policy
   * - User has full control via PolicyEditor
   * - For power users with specific requirements
   */
  CUSTOM: {
    id: 'CUSTOM',
    nameKey: 'presets.custom.name',
    descriptionKey: 'presets.custom.description',
    icon: Settings2,
    retentionSummary: {
      duration: 'Custom',
      frequency: 'Custom',
    },
    policyDefinition: null, // No preset - user defines their own
  },
};

/**
 * Get preset by ID with type safety
 */
export function getPolicyPreset(id: PolicyPresetId): PolicyPreset {
  return POLICY_PRESETS[id];
}

/**
 * Get all presets except CUSTOM (for preset selector)
 */
export function getStandardPresets(): PolicyPreset[] {
  return [
    POLICY_PRESETS.QUICK_START,
    POLICY_PRESETS.DAILY_30,
    POLICY_PRESETS.WEEKLY_YEAR,
    POLICY_PRESETS.HOURLY_WEEK,
  ];
}

/**
 * Get all presets including CUSTOM
 */
export function getAllPresets(): PolicyPreset[] {
  return [
    POLICY_PRESETS.QUICK_START,
    POLICY_PRESETS.DAILY_30,
    POLICY_PRESETS.WEEKLY_YEAR,
    POLICY_PRESETS.HOURLY_WEEK,
    POLICY_PRESETS.CUSTOM,
  ];
}

/**
 * Check if a policy definition matches a preset
 * Used during migration to classify existing profiles
 */
export function matchPolicyToPreset(policy: PolicyDefinition | undefined): PolicyPresetId {
  if (!policy) {
    return 'CUSTOM';
  }

  // Check each preset (except CUSTOM) for a match
  const presets = getStandardPresets();

  for (const preset of presets) {
    if (!preset.policyDefinition) continue;

    // Compare retention settings
    const retentionMatches =
      policy.retention?.keepLatest === preset.policyDefinition.retention?.keepLatest &&
      policy.retention?.keepHourly === preset.policyDefinition.retention?.keepHourly &&
      policy.retention?.keepDaily === preset.policyDefinition.retention?.keepDaily &&
      policy.retention?.keepWeekly === preset.policyDefinition.retention?.keepWeekly &&
      policy.retention?.keepMonthly === preset.policyDefinition.retention?.keepMonthly &&
      policy.retention?.keepAnnual === preset.policyDefinition.retention?.keepAnnual;

    // Compare scheduling settings
    const schedulingMatches =
      policy.scheduling?.intervalSeconds === preset.policyDefinition.scheduling?.intervalSeconds ||
      (policy.scheduling?.timeOfDay?.[0]?.hour ===
        preset.policyDefinition.scheduling?.timeOfDay?.[0]?.hour &&
        policy.scheduling?.timeOfDay?.[0]?.min ===
          preset.policyDefinition.scheduling?.timeOfDay?.[0]?.min);

    if (retentionMatches && schedulingMatches) {
      return preset.id;
    }
  }

  // No match found - user has custom policy
  return 'CUSTOM';
}
