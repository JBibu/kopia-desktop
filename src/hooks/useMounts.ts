import { useKopiaStore } from '@/stores/kopia';

export function useMounts() {
  return {
    mounts: useKopiaStore((state) => state.mounts),
    isLoading: useKopiaStore((state) => state.isMountsLoading),
    error: useKopiaStore((state) => state.mountsError),
    refresh: useKopiaStore((state) => state.refreshMounts),
    mount: useKopiaStore((state) => state.mountSnapshot),
    unmount: useKopiaStore((state) => state.unmountSnapshot),
    getMountForObject: useKopiaStore((state) => state.getMountForObject),
  };
}
