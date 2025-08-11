import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">404</h1>
              <h2 className="text-xl font-semibold text-gray-700 mt-2">Page Not Found</h2>
            </div>
            
            <p className="text-sm text-gray-600">
              The page you're looking for doesn't exist or has been moved.
            </p>

            <div className="pt-4">
              <Button 
                onClick={() => setLocation("/")} 
                className="w-full"
                data-testid="button-home"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
