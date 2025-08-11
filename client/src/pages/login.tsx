import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import LoginForm from "@/components/LoginForm";
import { getQueryFn } from "@/lib/queryClient";

export default function LoginPage() {
  const [, setLocation] = useLocation();

  // Check if user is already authenticated
  const { data: user } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">LF</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">LeaveFlow</h2>
          <p className="mt-2 text-sm text-gray-600">
            Annual leave management for small teams
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}