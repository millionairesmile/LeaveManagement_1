import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const leaveRequestSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  leaveType: z.enum(["annual", "sick", "personal", "emergency"]),
  reason: z.string().min(1, "Reason is required"),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

type LeaveRequestFormData = z.infer<typeof leaveRequestSchema>;

interface LeaveRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRequest?: any;
}

export default function LeaveRequestForm({ open, onOpenChange, editingRequest }: LeaveRequestFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<LeaveRequestFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      startDate: editingRequest ? new Date(editingRequest.startDate) : new Date(),
      endDate: editingRequest ? new Date(editingRequest.endDate) : new Date(),
      leaveType: editingRequest?.leaveType || "annual",
      reason: editingRequest?.reason || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LeaveRequestFormData) => {
      const payload = {
        ...data,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
      };

      if (editingRequest) {
        return apiRequest("PUT", `/api/leave-requests/${editingRequest.id}`, payload);
      } else {
        return apiRequest("POST", "/api/leave-requests", payload);
      }
    },
    onSuccess: () => {
      toast({
        title: editingRequest ? "Leave request updated" : "Leave request submitted",
        description: editingRequest 
          ? "Your leave request has been updated successfully." 
          : "Your leave request has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit leave request. Please try again.",
      });
    },
  });

  const onSubmit = (data: LeaveRequestFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">
            {editingRequest ? "Edit Leave Request" : "Submit Leave Request"}
          </DialogTitle>
          <DialogDescription>
            {editingRequest 
              ? "Update your leave request details below." 
              : "Fill out the form below to submit your leave request."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date)}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                        data-testid="calendar-start-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date)}
                        disabled={(date) => date < form.watch("startDate")}
                        className="rounded-md border"
                        data-testid="calendar-end-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="leaveType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Leave Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-leave-type">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal Leave</SelectItem>
                      <SelectItem value="emergency">Emergency Leave</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter reason for leave"
                      data-testid="textarea-reason"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                data-testid="button-submit"
              >
                {mutation.isPending 
                  ? (editingRequest ? "Updating..." : "Submitting...") 
                  : (editingRequest ? "Update Request" : "Submit Request")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
