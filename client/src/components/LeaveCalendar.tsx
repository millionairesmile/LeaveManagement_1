import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  status: string;
  user: {
    name: string;
    email: string;
  };
}

interface LeaveCalendarProps {
  showAllEmployees?: boolean;
}

export default function LeaveCalendar({ showAllEmployees = false }: LeaveCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const { data: leaveRequests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests", { all: showAllEmployees }],
  });

  // Convert leave requests to calendar events
  const leaveDates = leaveRequests.reduce((acc, request) => {
    const start = parseISO(request.startDate);
    const end = parseISO(request.endDate);
    
    // Add all dates in the range
    const current = new Date(start);
    while (current <= end) {
      const dateKey = format(current, 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(request);
      current.setDate(current.getDate() + 1);
    }
    
    return acc;
  }, {} as Record<string, LeaveRequest[]>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const modifiers = {
    hasLeave: (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return !!leaveDates[dateKey];
    },
  };

  const modifiersStyles = {
    hasLeave: {
      backgroundColor: 'var(--primary)',
      color: 'white',
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="calendar-title">
          {showAllEmployees ? "Team Leave Calendar" : "My Leave Calendar"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Calendar
            mode="single"
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
            data-testid="leave-calendar"
          />
          
          {/* Legend */}
          <div className="space-y-2">
            <h4 className="font-semibold">Legend</h4>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-800">Approved</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
              <Badge className="bg-red-100 text-red-800">Rejected</Badge>
            </div>
          </div>

          {/* Leave requests for selected month */}
          <div className="space-y-2">
            <h4 className="font-semibold">
              Leave Requests for {format(selectedMonth, 'MMMM yyyy')}
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {leaveRequests
                .filter((request) => {
                  const startDate = parseISO(request.startDate);
                  return startDate.getMonth() === selectedMonth.getMonth() &&
                         startDate.getFullYear() === selectedMonth.getFullYear();
                })
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                    data-testid={`leave-request-${request.id}`}
                  >
                    <div>
                      <div className="font-medium">
                        {showAllEmployees ? request.user.name : "Your leave"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(request.startDate), 'MMM dd')} - {format(parseISO(request.endDate), 'MMM dd')}
                      </div>
                      <div className="text-sm capitalize">{request.leaveType}</div>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}