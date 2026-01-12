import { useKopiaStore } from '@/stores/kopia';

export function useServerStatus() {
  return {
    status: useKopiaStore((state) => state.serverStatus),
    isLoading: useKopiaStore((state) => state.isServerLoading),
    error: useKopiaStore((state) => state.serverError),
    isRunning: useKopiaStore((state) => state.isServerRunning()),
    start: useKopiaStore((state) => state.startServer),
    stop: useKopiaStore((state) => state.stopServer),
  };
}
