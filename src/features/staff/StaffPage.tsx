import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { useAllStaff, usePendingStaff } from "./api/useStaff";
import { LoadError } from "./components/LoadError";
import { StaffTable } from "./components/StaffTable";

export function StaffPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const allQ = useAllStaff();
  const pendingQ = usePendingStaff();
  const pendingCount = pendingQ.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("staffManagement")}</h1>

      {allQ.isError && (
        <LoadError
          data-cy="staff-error"
          message={t("failedLoadStaff")}
          onRetry={() => allQ.refetch()}
        />
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" data-cy="staff-tab-all">
            {t("allStaff")}
          </TabsTrigger>
          <TabsTrigger value="pending" data-cy="staff-tab-pending">
            {t("pendingApproval")}
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 px-1.5 text-xs"
                data-cy="staff-pending-count"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <StaffTable
            users={allQ.data ?? []}
            currentUserId={user?.id}
            isLoading={allQ.isLoading}
            isError={allQ.isError}
          />
        </TabsContent>
        <TabsContent value="pending" className="mt-4 space-y-4">
          {pendingQ.isError && (
            <LoadError
              data-cy="staff-pending-error"
              message={t("failedLoadPending")}
              onRetry={() => pendingQ.refetch()}
            />
          )}
          <StaffTable
            users={pendingQ.data ?? []}
            currentUserId={user?.id}
            isLoading={pendingQ.isLoading}
            isError={pendingQ.isError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
