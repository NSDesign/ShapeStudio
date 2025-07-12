import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";
import ShapeEditor from "@/components/ShapeEditor";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-50 overflow-hidden">
      {/* Top bar with user info */}
      <div className="absolute top-4 right-4 z-50">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.firstName?.[0] || user?.email?.[0] || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || 'User'
                  }
                </span>
                <span className="text-xs text-slate-400">{user?.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
                className="text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Shape Editor */}
      <ShapeEditor />
    </div>
  );
}