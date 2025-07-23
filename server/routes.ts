import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    // Auth middleware - only in production
    await setupAuth(app);
  }

  // Conditional authentication middleware
  const conditionalAuth = isDevelopment ? 
    (req: any, res: any, next: any) => {
      // Mock user for development
      req.user = {
        claims: {
          sub: 'dev-user',
          email: 'dev@localhost',
          first_name: 'Dev',
          last_name: 'User'
        }
      };
      next();
    } : 
    isAuthenticated;

  // Auth routes
  app.get('/api/auth/user', conditionalAuth, async (req: any, res) => {
    try {
      if (isDevelopment) {
        // Return mock user for development
        res.json({
          id: 'dev-user',
          email: 'dev@localhost',
          firstName: 'Dev',
          lastName: 'User',
          profileImageUrl: null
        });
        return;
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Protected route example
  app.get("/api/protected", conditionalAuth, async (req, res) => {
    const userId = req.user?.claims?.sub;
    // Do something with the user id.
    res.json({ message: "This is a protected route", userId });
  });

  // Admin routes for user management
  app.get("/api/admin/users", conditionalAuth, async (req, res) => {
    try {
      if (isDevelopment) {
        // Return mock users for development
        res.json([{
          id: 'dev-user',
          email: 'dev@localhost',
          firstName: 'Dev',
          lastName: 'User',
          profileImageUrl: null
        }]);
        return;
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete("/api/admin/users/:userId", conditionalAuth, async (req, res) => {
    try {
      if (isDevelopment) {
        // Mock deletion for development
        res.json({ message: "User deletion not available in development mode" });
        return;
      }
      
      const { userId } = req.params;
      const deleted = await storage.deleteUser(userId);
      
      if (deleted) {
        res.json({ message: "User deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // More routes can be added here

  const httpServer = createServer(app);
  return httpServer;
}
