/**
 * Initial setup screen for when repository is not configured
 */

import { Titlebar } from '@/components/layout/Titlebar';
import { SetupRepository } from '@/components/kopia/setup/SetupRepository';

export function Setup() {
  return (
    <>
      <Titlebar />
      <div className="pt-14">
        <SetupRepository />
      </div>
    </>
  );
}
