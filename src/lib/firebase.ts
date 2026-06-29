/// <reference types="vite/client" />
import { authInstance, FirebaseUserCompat } from "./supabase-compat/auth";
import { dbInstance } from "./supabase-compat/firestore";
import { supabase } from "./supabase";

export const auth = authInstance;
export const db = dbInstance;
export const storage = supabase.storage;
export const isConfigured = true;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[Supabase Compatibility Error] ${operationType} on ${path}:`, errorMessage);
  throw new Error(errorMessage);
}

const app = { name: '[Supabase Firebase Compat App]' };
export default app;
