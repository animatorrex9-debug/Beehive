import { authInstance } from "./auth";
import { dbInstance } from "./db";
import { supabase } from "../supabase";

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

export function handleSupabaseError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = '';
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (error && typeof error === 'object') {
    const errObj = error as any;
    errorMessage = errObj.message || errObj.details || errObj.hint || JSON.stringify(error);
  } else {
    errorMessage = String(error);
  }
  console.error(`[Supabase Error] ${operationType} on ${path}:`, errorMessage);
}
