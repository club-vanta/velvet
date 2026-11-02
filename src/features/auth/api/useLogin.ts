import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/domain/session";

type Credentials = { username: string; password: string };

/** Signs in; on success the route table swaps to the signed-in pages. */
export function useLogin() {
  const { login } = useAuth();
  return useMutation({
    mutationFn: ({ username, password }: Credentials) =>
      login(username, password),
  });
}
