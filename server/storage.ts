import {
  users,
  userPreferences,
  type User,
  type UpsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type UpdateUserPreferences,
  type SidebarSectionConfig,
  type ShapeSet,
  DEFAULT_SIDEBAR_SECTIONS,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User preferences operations
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(userId: string, preferences: UpdateUserPreferences): Promise<UserPreferences>;
  createDefaultUserPreferences(userId: string): Promise<UserPreferences>;
  
  // Shape sets operations
  saveUserShapeSets(userId: string, shapeSets: ShapeSet[], currentSetId?: string | null): Promise<void>;
  loadUserShapeSets(userId: string): Promise<{ shapeSets: ShapeSet[], currentSetId?: string | null }>;
  
  // Other operations
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // User preferences operations
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return preferences;
  }

  async upsertUserPreferences(userId: string, preferences: UpdateUserPreferences): Promise<UserPreferences> {
    const preferencesId = `${userId}-preferences`;
    
    // Check if preferences exist
    const existing = await this.getUserPreferences(userId);
    
    if (existing) {
      // Update existing preferences
      const [result] = await db
        .update(userPreferences)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.id, preferencesId))
        .returning();
      return result;
    } else {
      // Insert new preferences
      const [result] = await db
        .insert(userPreferences)
        .values({
          id: preferencesId,
          userId,
          ...preferences,
        })
        .returning();
      return result;
    }
  }

  async createDefaultUserPreferences(userId: string): Promise<UserPreferences> {
    const [result] = await db
      .insert(userPreferences)
      .values({
        id: `${userId}-preferences`,
        userId,
        sidebarSections: DEFAULT_SIDEBAR_SECTIONS,
        shapeSets: [] as any,
        currentShapeSetId: null,
      })
      .onConflictDoUpdate({
        target: userPreferences.id,  // Use primary key, not foreign key
        set: {
          sidebarSections: DEFAULT_SIDEBAR_SECTIONS,
          shapeSets: [] as any,
          currentShapeSetId: null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Shape sets operations
  async saveUserShapeSets(
    userId: string, 
    shapeSets: ShapeSet[], 
    currentSetId?: string | null
  ): Promise<void> {
    await this.upsertUserPreferences(userId, {
      shapeSets: shapeSets as any,
      currentShapeSetId: currentSetId || null,
    });
  }

  async loadUserShapeSets(
    userId: string
  ): Promise<{ shapeSets: ShapeSet[], currentSetId?: string | null }> {
    const preferences = await this.getUserPreferences(userId);
    
    return {
      shapeSets: (preferences?.shapeSets as ShapeSet[]) || [],
      currentSetId: preferences?.currentShapeSetId || null,
    };
  }

  // Other operations
}

export const storage = new DatabaseStorage();