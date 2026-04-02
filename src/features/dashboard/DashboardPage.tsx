import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { formatDate } from "@/lib/format";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role.name === "ADMIN";

  const meetupsQ = useQuery({
    queryKey: ["meetups"],
    queryFn: async () => {
      const { data, error } = await api.GET("/meetups/");
      if (error) throw new Error("Failed to load meetups");
      return data;
    },
  });

  const guestsQ = useQuery({
    queryKey: ["guests"],
    queryFn: async () => {
      const { data, error } = await api.GET("/guests/");
      if (error) throw new Error("Failed to load guests");
      return data;
    },
  });

  const pendingQ = useQuery({
    queryKey: ["staff", "pending"],
    queryFn: async () => {
      const { data, error } = await api.GET("/staff/pending");
      if (error) throw new Error("Failed to load pending staff");
      return data;
    },
    enabled: isAdmin,
  });

  const recentMeetups = meetupsQ.data?.meetups.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Button onClick={() => navigate("/meetups")}>New Meetup</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Meetups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetupsQ.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{meetupsQ.data?.total ?? 0}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Guests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guestsQ.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold">{guestsQ.data?.total ?? 0}</p>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingQ.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">
                  {pendingQ.data?.length ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent meetups */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Recent Meetups
        </h2>

        {meetupsQ.isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              Failed to load meetups.
              <Button
                variant="ghost"
                size="sm"
                onClick={() => meetupsQ.refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetupsQ.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                  </TableRow>
                ))}

              {!meetupsQ.isLoading && recentMeetups.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No meetups yet.
                  </TableCell>
                </TableRow>
              )}

              {recentMeetups.map((meetup) => (
                <TableRow key={meetup.id}>
                  <TableCell className="font-medium">{meetup.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(meetup.date)}
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
        </Card>
      </div>
    </div>
  );
}
