import { create } from 'zustand';

interface RepositoryState {
  isConnected: boolean;
  repositoryPath: string | null;
  serverUrl: string | null;
  serverPort: number | null;
}

interface RepositoryActions {
  connect: (path: string, serverUrl: string, port: number) => void;
  disconnect: () => void;
}

type RepositoryStore = RepositoryState & RepositoryActions;

export const useRepositoryStore = create<RepositoryStore>()((set) => ({
  isConnected: false,
  repositoryPath: null,
  serverUrl: null,
  serverPort: null,

  connect: (path, serverUrl, port) =>
    set({
      isConnected: true,
      repositoryPath: path,
      serverUrl,
      serverPort: port,
    }),

  disconnect: () =>
    set({
      isConnected: false,
      repositoryPath: null,
      serverUrl: null,
      serverPort: null,
    }),
}));
