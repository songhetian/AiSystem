import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppScope } from "@/hooks/useAppScope";

export const useSystemCrud = <T>(queryKey: string[], apiMethod: any) => {
  const queryClient = useQueryClient();
  const { platformId, deptId } = useAppScope();

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiMethod.create({
        ...payload,
        platform_id: platformId,
        dept_id: deptId,
      }),
    onSuccess: refresh,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      apiMethod.update(id, { ...payload, platform_id: platformId }),
    onSuccess: refresh,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiMethod.delete(id),
    onSuccess: refresh,
  });

  return {
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    refresh,
    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
};
