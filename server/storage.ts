import {
  users,
  userPreferences,
  type User,
  type UpsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type UpdateUserPreferences,
  type SidebarSectionConfig,
  type GenerationSet,
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
  
  // Generation sets operations
  saveUserGenerationSets(userId: string, generationSets: GenerationSet[], currentSetId?: string | null): Promise<void>;
  loadUserGenerationSets(userId: string): Promise<{ generationSets: GenerationSet[], currentSetId?: string | null }>;
  
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
        generationSets: [] as any,
        currentGenerationSetId: null,
      })
      .onConflictDoUpdate({
        target: userPreferences.id,  // Use primary key, not foreign key
        set: {
          sidebarSections: DEFAULT_SIDEBAR_SECTIONS,
          generationSets: [] as any,
          currentGenerationSetId: null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // Generation sets operations
  async saveUserGenerationSets(
    userId: string, 
    generationSets: GenerationSet[], 
    currentSetId?: string | null
  ): Promise<void> {
    await this.upsertUserPreferences(userId, {
      generationSets: generationSets as any,
      currentGenerationSetId: currentSetId || null,
    });
  }

  async loadUserGenerationSets(
    userId: string
  ): Promise<{ generationSets: GenerationSet[], currentSetId?: string | null }> {
    const preferences = await this.getUserPreferences(userId);
    
    return {
      generationSets: (preferences?.generationSets as GenerationSet[]) || [],
      currentSetId: preferences?.currentGenerationSetId || null,
    };
  }

  // Other operations
}

export const storage = new DatabaseStorage();