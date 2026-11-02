import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useLanguage } from "@/lib/i18n";

type Credentials = { username: string; password: string };

/** Creates a staff account. A taken username is the one error named. */
export function useRegister() {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (body: Credentials) => {
      const { data, error, response } = await api.POST("/auth/register", {
        body,
      });
      if (error) {
        throw new Error(
          t(response.status === 409 ? "usernameInUse" : "somethingWentWrong"),
        );
      }
      return data;
    },
  });
}
