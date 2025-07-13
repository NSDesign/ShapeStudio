import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export default function AuthHeader() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="absolute top-4 right-4 z-50">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/api/login'}
          className="bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700"
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full hover:bg-slate-700"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-slate-700 text-slate-100">
                {user?.firstName?.[0] || user?.email?.[0] || <User className="w-4 h-4" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end" forceMount>
          <DropdownMenuLabel className="font-normal text-slate-100">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email || 'User'
                }
              </p>
              <p className="text-xs leading-none text-slate-400">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem className="text-slate-100 hover:bg-slate-700">
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-700" />
          <DropdownMenuItem 
            className="text-slate-100 hover:bg-slate-700"
            onClick={() => window.location.href = '/api/logout'}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}