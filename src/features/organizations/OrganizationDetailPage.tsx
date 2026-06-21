import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { extractApiError } from "@/api/errors";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useLanguage } from "@/lib/i18n";
import type { components } from "@/api/types";

type OrgPublic = components["schemas"]["OrgPublic"];
type OrgMemberPublic = components["schemas"]["OrgMemberPublic"];

function EditOrgDialog({
  org,
  onClose,
}: {
  org: OrgPublic;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.PATCH("/organizations/{org_id}", {
        params: { path: { org_id: org.id } },
        body: {
          name: name.trim() !== org.name ? name.trim() : null,
          slug: slug.trim() !== org.slug ? slug.trim() : null,
        },
      });
      if (error) throw new Error(extractApiError(error, t("failedUpdateOrg")));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizations"] });
      void queryClient.invalidateQueries({ queryKey: ["org", org.id] });
      toast.success(t("orgUpdated"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const hasChanges = name.trim() !== org.name || slug.trim() !== org.slug;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editOrg")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label htmlFor="edit-org-name" className="text-sm font-medium">
              {t("orgName")}
            </label>
            <Input
              id="edit-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-org-slug" className="text-sm font-medium">
              {t("orgSlug")}
            </label>
            <Input
              id="edit-org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              !hasChanges || !name.trim() || !slug.trim() || mutation.isPending
            }
          >
            {mutation.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    id: number;
    username: string;
  } | null>(null);
  const [role, setRole] = useState("STAFF");
  const queryClient = useQueryClient();

  const usersQ = useQuery({
    queryKey: ["user-search", search],
    queryFn: async () => {
      const { data } = await api.GET("/users/", {
        params: { query: { q: search } },
      });
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST(
        "/organizations/{org_id}/members/{user_id}",
        {
          params: { path: { org_id: orgId, user_id: selected!.id } },
          body: { role },
        },
      );
      if (error) throw new Error(extractApiError(error, t("failedAddMember")));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-members", orgId] });
      toast.success(t("memberAdded"));
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("addMember")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input
            placeholder={t("username")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected(null);
            }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {usersQ.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {!usersQ.isLoading && (usersQ.data?.length ?? 0) === 0 && search && (
            <p className="text-sm text-muted-foreground text-center py-2">
              {t("noStaffAccounts")}
            </p>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {usersQ.data?.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setSelected({ id: u.id, username: u.username });
                  setSearch(u.username);
                }}
                className={`w-full text-left flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  selected?.id === u.id
                    ? "bg-secondary text-foreground font-medium"
                    : "hover:bg-secondary/50 text-muted-foreground"
                }`}
              >
                <span>{u.username}</span>
                <span className="text-xs opacity-50">#{u.id}</span>
              </button>
            ))}
          </div>
          {selected && (
            <div className="space-y-1 pt-1 border-t border-border">
              <label className="text-sm font-medium">{t("role")}</label>
              <Select
                value={role}
                onValueChange={(v) => v !== null && setRole(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">{t("roleStaff")}</SelectItem>
                  <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selected || mutation.isPending}
          >
            {mutation.isPending ? t("adding") : t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersSection({
  orgId,
  members,
  isLoading,
  isError,
  refetch,
  currentUserId,
}: {
  orgId: string;
  members: OrgMemberPublic[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  currentUserId: number | undefined;
}) {
  const { t } = useLanguage();
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateRoleMutation = useMutation({
    mutationFn: async ({
      member,
      newRole,
    }: {
      member: OrgMemberPublic;
      newRole: string;
    }) => {
      const { error } = await api.PATCH(
        "/organizations/{org_id}/members/{user_id}",
        {
          params: { path: { org_id: orgId, user_id: member.user_id } },
          body: { role: newRole },
        },
      );
      if (error) throw new Error(extractApiError(error, t("roleUpdated")));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-members", orgId] });
      toast.success(t("roleUpdated"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (member: OrgMemberPublic) => {
      const { error } = await api.DELETE(
        "/organizations/{org_id}/members/{user_id}",
        { params: { path: { org_id: orgId, user_id: member.user_id } } },
      );
      if (error)
        throw new Error(extractApiError(error, t("failedRemoveMember")));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["org-members", orgId] });
      toast.success(t("memberRemoved"));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {t("orgMembers")}
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          {t("addMember")}
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            {t("failedLoadOrgs")}
            <Button variant="ghost" size="sm" onClick={refetch}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("userId")}</TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && (members?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground py-6"
                >
                  {t("noStaffAccounts")}
                </TableCell>
              </TableRow>
            )}
            {members?.map((m) => {
              const isSelf = m.user_id === currentUserId;
              return (
                <TableRow key={m.user_id}>
                  <TableCell className="font-medium">{m.user_id}</TableCell>
                  <TableCell>
                    <Select
                      value={m.role}
                      onValueChange={(newRole) =>
                        newRole !== null &&
                        updateRoleMutation.mutate({ member: m, newRole })
                      }
                      disabled={isSelf}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STAFF">{t("roleStaff")}</SelectItem>
                        <SelectItem value="ADMIN">{t("roleAdmin")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeMutation.mutate(m)}
                      disabled={removeMutation.isPending || isSelf}
                    >
                      {removeMutation.isPending
                        ? t("removing")
                        : t("removeMember")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {addOpen && (
        <AddMemberDialog orgId={orgId} onClose={() => setAddOpen(false)} />
      )}
    </div>
  );
}

export function OrganizationDetailPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";

  const orgQ = useQuery({
    queryKey: ["org", orgId],
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/{org_id}", {
        params: { path: { org_id: orgId! } },
      });
      if (error) throw new Error("Failed to load organization");
      return data;
    },
    enabled: !!orgId,
  });

  const membersQ = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: async () => {
      const { data, error } = await api.GET("/organizations/{org_id}/members", {
        params: { path: { org_id: orgId! } },
      });
      if (error) throw new Error("Failed to load members");
      return data;
    },
    enabled: !!orgId,
  });

  const org = orgQ.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/organizations")}
          className="h-8 w-8 p-0 mt-1 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {orgQ.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-24" />
            </div>
          ) : orgQ.isError ? (
            <Alert variant="destructive">
              <AlertDescription>{t("failedLoadOrgs")}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <h1 className="text-2xl font-semibold truncate">{org?.name}</h1>
                <Badge variant="secondary">{org?.slug}</Badge>
              </div>
              {isSiteAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("editOrg")}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Members */}
      <MembersSection
        orgId={orgId!}
        members={membersQ.data?.members}
        isLoading={membersQ.isLoading}
        isError={membersQ.isError}
        refetch={() => membersQ.refetch()}
        currentUserId={user?.id}
      />

      {isSiteAdmin && org && editOpen && (
        <EditOrgDialog org={org} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}
