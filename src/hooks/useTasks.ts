import { useKopiaStore } from '@/stores/kopia';

export function useTasks() {
  return {
    tasks: useKopiaStore((state) => state.tasks),
    summary: useKopiaStore((state) => state.tasksSummary),
    isLoading: useKopiaStore((state) => state.isTasksLoading),
    error: useKopiaStore((state) => state.tasksError),
    refresh: useKopiaStore((state) => state.refreshTasks),
    getTask: useKopiaStore((state) => state.getTask),
    cancelTask: useKopiaStore((state) => state.cancelTask),
  };
}
