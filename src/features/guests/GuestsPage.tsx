import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { formatDateTime } from "@/lib/format";
import type { components } from "@/api/types";

type Guest = components["schemas"]["GuestPublic"];
type BannedGuest = components["schemas"]["BannedGuestPublic"];

function BanDialog({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.PATCH("/guests/{mazmo_user_id}/ban", {
        params: { path: { mazmo_user_id: guest.mazmo_user_id } },
        body: { reason },
      });
      if (error) throw new Error((error as { detail?: string }).detail ?? "Ban failed");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
      toast.success(`${guest.displayname} has been banned`);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {guest.displayname}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label className="text-sm font-medium">Reason (required)</label>
          <Textarea
            placeholder="e.g. Aggressive behaviour at Alter #40"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{reason.length}/500</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={reason.length < 5 || reason.length > 500 || mutation.isPending}
          >
            {mutation.isPending ? "Banning…" : "Ban guest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AllGuestsTab({ isAdmin }: { isAdmin: boolean }) {
  const [banTarget, setBanTarget] = useState<Guest | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/");
      if (error) throw new Error("Failed to load guests");
      return data;
    },
  });

  return (
    <>
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            Failed to load guests.
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>@Username</TableHead>
              <TableHead>Mazmo ID</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                {isAdmin && <TableCell><Skeleton className="h-4 w-12" /></TableCell>}
              </TableRow>
            ))}
            {!isLoading && (data?.guests.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                  No guests yet.
                </TableCell>
              </TableRow>
            )}
            {data?.guests.map((g) => (
              <TableRow key={g.mazmo_user_id}>
                <TableCell className="font-medium">{g.displayname}</TableCell>
                <TableCell className="text-muted-foreground">@{g.username}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{g.mazmo_user_id}</TableCell>
                <TableCell>
                  {g.is_banned && <Badge variant="destructive">Banned</Badge>}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {!g.is_banned && (
                      <Button variant="ghost" size="sm" onClick={() => setBanTarget(g)}>Ban</Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {banTarget && <BanDialog guest={banTarget} onClose={() => setBanTarget(null)} />}
    </>
  );
}

function BannedGuestsTab({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guests-banned"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/banned");
      if (error) throw new Error("Failed to load banned guests");
      return data;
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (guest: BannedGuest) => {
      const { error } = await api.PATCH("/guests/{mazmo_user_id}/unban", {
        params: { path: { mazmo_user_id: guest.mazmo_user_id } },
      });
      if (error) throw new Error((error as { detail?: string }).detail ?? "Unban failed");
      return guest;
    },
    onSuccess: (guest) => {
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      void queryClient.invalidateQueries({ queryKey: ["guests-banned"] });
      toast.success(`${guest.displayname} unbanned`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            Failed to load banned guests.
            <Button variant="ghost" size="sm" onClick={() => refetch()}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Display Name</TableHead>
              <TableHead>@Username</TableHead>
              <TableHead>Banned At</TableHead>
              <TableHead>Reason</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                {isAdmin && <TableCell><Skeleton className="h-4 w-16" /></TableCell>}
              </TableRow>
            ))}
            {!isLoading && (data?.guests.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground py-8">
                  No banned guests.
                </TableCell>
              </TableRow>
            )}
            {data?.guests.map((g) => (
              <TableRow key={g.mazmo_user_id}>
                <TableCell className="font-medium text-destructive">{g.displayname}</TableCell>
                <TableCell className="text-muted-foreground">@{g.username}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {g.banned_at ? formatDateTime(g.banned_at) : "—"}
                </TableCell>
                <TableCell className="text-sm max-w-xs truncate">{g.banned_reason}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unbanMutation.mutate(g)}
                      disabled={unbanMutation.isPending}
                    >
                      Unban
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function GuestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role.name === "ADMIN";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Guests</h1>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Guests</TabsTrigger>
          <TabsTrigger value="banned">Banned</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <AllGuestsTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="banned" className="mt-4">
          <BannedGuestsTab isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
