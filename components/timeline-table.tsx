import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TimelineEvent } from "@/lib/witness/types";

export function TimelineTable({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <div className="console-panel overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Seq</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Decision</TableHead>
            <TableHead>Authority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {timeline.map((event) => (
            <TableRow key={`${event.seq}-${event.action}`}>
              <TableCell className="font-mono text-xs">{event.seq}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{event.actor}</TableCell>
              <TableCell className="whitespace-nowrap">{event.action}</TableCell>
              <TableCell className="max-w-64 truncate font-mono text-xs" title={event.resource}>
                {event.resource}
              </TableCell>
              <TableCell>
                <Badge variant={event.decision === "DENIED" || event.decision === "FAILED" || event.decision === "ESCALATED" ? "destructive" : "outline"}>
                  {event.decision}
                </Badge>
              </TableCell>
              <TableCell className="max-w-44 truncate font-mono text-xs" title={event.authorityId}>
                {event.authorityId}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
