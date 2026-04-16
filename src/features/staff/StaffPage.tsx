import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "@/api/errors";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";
import { useState } from "react";

type User = components["schemas"]["UserPublic"];

function StatusBadge({ user }: { user: User }) {
  const { t } = useLanguage();
  if (user.is_disabled)
    return <Badge variant="destructive">{t("statusDisabled")}</Badge>;
  if (!user.is_approved)
    return <Badge variant="secondary">{t("statusPending")}</Badge>;
  return <Badge>{t("statusActive")}</Badge>;
}

function DisableDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH("/staff/{user_id}/disable", {
        params: { path: { user_id: user.id } },
        body: { reason },
      });
      if (error) throw new Error(extractApiError(error, t("failedDisable")));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(`${user.username} disabled`);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("disableDialogTitle")} {user.username}?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="disable-reason" className="text-sm font-medium">
            {t("reasonRequired")}
          </label>
          <Textarea
            id="disable-reason"
            placeholder={t("disableReasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={reason.length < 5 || mutation.isPending}
          >
            {mutation.isPending ? t("disabling") : t("disableAccount")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecoveryCodeDialog({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [code, setCode] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setIsPending(true);
    try {
      const { data, error } = await api.POST("/staff/{user_id}/recovery-code", {
        params: { path: { user_id: user.id } },
      });
      if (error) throw new Error(t("failedGenerateCode"));
      setCode(data.code);
    } catch {
      toast.error(t("failedGenerateCode"));
      onClose();
    } finally {
      setIsPending(false);
    }
  }

  function copyCode() {
    if (!code) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {code === null ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("recoveryCodeDialogTitle")} {user.username}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              {t("recoveryCodeDialogBody")}
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button onClick={() => void generate()} disabled={isPending}>
                {isPending ? t("generatingCode") : t("generateCode")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {t("recoveryCodeGeneratedTitle").replace("{0}", user.username)}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center py-4">
              <span className="font-mono text-4xl font-bold tracking-widest">
                {code}
              </span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copyCode}>
                {copied ? t("codeCopied") : t("copyCode")}
              </Button>
              <Button onClick={onClose}>{t("close")}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StaffTable({
  users,
  currentUserId,
  isLoading,
}: {
  users: User[];
  currentUserId: number;
  isLoading: boolean;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [disableTarget, setDisableTarget] = useState<User | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<User | null>(null);

  const approveMutation = useMutation({
    mutationFn: async ({ id, approve }: { id: number; approve: boolean }) => {
      const { error } = await api.PATCH("/staff/{user_id}/approve", {
        params: { path: { user_id: id } },
        body: { is_approved: approve },
      });
      if (error)
        throw new Error(
          extractApiError(error, "Failed to update approval status"),
        );
    },
    onSuccess: (_, { approve }) => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(approve ? t("accountApproved") : t("approvalRevoked"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const roleMutation = useMutation({
    mutationFn: async ({
      id,
      role,
    }: {
      id: number;
      role: "STAFF" | "ADMIN";
    }) => {
      const { error } = await api.PATCH("/staff/{user_id}/role", {
        params: { path: { user_id: id } },
        body: { role },
      });
      if (error)
        throw new Error(extractApiError(error, "Failed to update role"));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(t("roleUpdated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const enableMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await api.PATCH("/staff/{user_id}/enable", {
        params: { path: { user_id: id } },
      });
      if (error)
        throw new Error(extractApiError(error, "Failed to enable account"));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(t("accountReenabled"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("username")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("joined")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("noStaffAccounts")}
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    {isSelf ? (
                      <Badge variant="outline">{u.role.name}</Badge>
                    ) : (
                      <Select
                        defaultValue={u.role.name}
                        onValueChange={(val) =>
                          roleMutation.mutate({
                            id: u.id,
                            role: val as "STAFF" | "ADMIN",
                          })
                        }
                        disabled={roleMutation.isPending}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STAFF">STAFF</SelectItem>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge user={u} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(u.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRecoveryTarget(u)}
                      >
                        {t("forgotPasswordButton")}
                      </Button>
                      {!isSelf && u.is_approved && !u.is_disabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            approveMutation.mutate({ id: u.id, approve: false })
                          }
                          disabled={approveMutation.isPending}
                        >
                          {t("revoke")}
                        </Button>
                      )}
                      {!u.is_approved && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            approveMutation.mutate({ id: u.id, approve: true })
                          }
                          disabled={approveMutation.isPending}
                        >
                          {t("approve")}
                        </Button>
                      )}
                      {!isSelf && !u.is_disabled && u.is_approved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDisableTarget(u)}
                        >
                          {t("disable")}
                        </Button>
                      )}
                      {!isSelf && u.is_disabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => enableMutation.mutate(u.id)}
                          disabled={enableMutation.isPending}
                        >
                          {t("enable")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {disableTarget && (
        <DisableDialog
          user={disableTarget}
          onClose={() => setDisableTarget(null)}
        />
      )}
      {recoveryTarget && (
        <RecoveryCodeDialog
          user={recoveryTarget}
          onClose={() => setRecoveryTarget(null)}
        />
      )}
    </>
  );
}

export function StaffPage() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();

  const {
    data: allStaff,
    isLoading: loadingAll,
    isError: errorAll,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await api.GET("/staff/");
      if (error) throw new Error("Failed to load staff");
      return data ?? [];
    },
  });

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ["staff", "pending"],
    queryFn: async () => {
      const { data, error } = await api.GET("/staff/pending");
      if (error) throw new Error("Failed to load pending staff");
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("staffManagement")}</h1>

      {errorAll && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadStaff")}
            <Button variant="ghost" size="sm" onClick={() => refetchAll()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t("allStaff")}</TabsTrigger>
          <TabsTrigger value="pending">
            {t("pendingApproval")}
            {(pending?.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {pending!.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <StaffTable
            users={allStaff ?? []}
            currentUserId={currentUser!.id}
            isLoading={loadingAll}
          />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <StaffTable
            users={pending ?? []}
            currentUserId={currentUser!.id}
            isLoading={loadingPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
