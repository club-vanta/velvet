import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { extractApiError } from "@/api/errors";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/api/client";
import { formatDate } from "@/lib/format";

function NewMeetupDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/meetups/", {
        body: { name, mazmo_meetup_url: url },
      });
      if (error)
        throw new Error(extractApiError(error, "Failed to create meetup"));
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meetups"] });
      toast.success("Meetup created");
      setName("");
      setUrl("");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Meetup</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label htmlFor="meetup-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="meetup-name"
              placeholder="Alter #42 — Octubre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="meetup-url" className="text-sm font-medium">
              Mazmo URL
            </label>
            <Input
              id="meetup-url"
              placeholder="https://mazmo.net/eventos-reuniones-argentina/alter-..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name || !url || mutation.isPending}
          >
            {mutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MeetupsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["meetups"],
    queryFn: async () => {
      const { data, error } = await api.GET("/meetups/");
      if (error) throw new Error("Failed to load meetups");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Meetups</h1>
        <Button onClick={() => setDialogOpen(true)}>New Meetup</Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            Failed to load meetups.
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Mazmo URL</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-56" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && (data?.meetups.length ?? 0) === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  No meetups yet. Create the first one.
                </TableCell>
              </TableRow>
            )}

            {data?.meetups.map((meetup) => (
              <TableRow key={meetup.id}>
                <TableCell className="font-medium">{meetup.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(meetup.date)}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  <a
                    href={meetup.mazmo_meetup_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {meetup.mazmo_meetup_url}
                  </a>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/meetups/${meetup.id}`)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <NewMeetupDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
