import { Shield, AlertTriangle, Clock, LogOut, User, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const DashboardHeader = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive' as const;
      case 'analyst':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Ethical AI Policing Platform
              </h1>
              <p className="text-sm text-muted-foreground">
                Chicago Crime Analysis • 6.2M Records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              System Active
            </Badge>
            <Badge variant="secondary" className="gap-2 hidden sm:flex">
              <Clock className="h-3 w-3" />
              Last Updated: 2m ago
            </Badge>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.email}</span>
                    {userRole && (
                      <Badge variant={getRoleBadgeVariant(userRole)} className="ml-1">
                        {userRole}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    Role: {userRole || 'loading...'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate('/auth')} size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-muted-foreground">
            Fairness constraints active • Geographic cross-validation enabled • 
            Temporal validation preventing data leakage
          </span>
        </div>
      </div>
    </header>
  );
};
