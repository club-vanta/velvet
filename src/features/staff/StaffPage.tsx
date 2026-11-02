import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { useAllStaff, usePendingStaff } from "./api/useStaff";
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
        <Alert variant="destructive" data-cy="staff-error">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadStaff")}
            <Button variant="ghost" size="sm" onClick={() => allQ.refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
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
          />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <StaffTable
            users={pendingQ.data ?? []}
            currentUserId={user?.id}
            isLoading={pendingQ.isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
