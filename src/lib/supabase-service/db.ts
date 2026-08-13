import { supabase } from '../supabase';

// Helper to check if a string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function enhanceSupabaseError(error: any): Error {
  if (!error) return new Error('Unknown database error');
  const message = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
  if (message.toLowerCase().includes('infinite recursion') || error.code === '42P17') {
    return new Error('Database Error: Infinite recursion detected in your Supabase RLS policies. Please apply the updated "supabase_schema.sql" file in your Supabase SQL Editor to fix this issue.');
  }
  if (error.code === 'PGRST205' || message.includes('Could not find the table')) {
    return new Error(`Database Table Missing: ${message}. Please run the latest "supabase_schema.sql" script in your Supabase SQL Editor to create missing database tables.`);
  }
  return new Error(message);
}

// 1. References
export class SupabaseRef {
  constructor(public path: string) {}
  get id() {
    const parts = this.path.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  }
}

export class DocumentReference extends SupabaseRef {}
export class CollectionReference extends SupabaseRef {}

export function collection(db: any, ...parts: string[]) {
  const path = parts.join('/');
  return new CollectionReference(path);
}

export function doc(db: any, ...parts: string[]) {
  const path = parts.join('/');
  return new DocumentReference(path);
}

// 2. Query structures
export class QueryCompat {
  public constraints: any[] = [];
  constructor(public ref: CollectionReference) {}
}

export function query(ref: CollectionReference | QueryCompat, ...constraints: any[]) {
  const q = new QueryCompat(ref instanceof QueryCompat ? ref.ref : ref);
  q.constraints = [...(ref instanceof QueryCompat ? ref.constraints : []), ...constraints];
  return q;
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

// 3. Mapping and Parsers
interface ParsedPath {
  table: string;
  id?: string;
  parentId?: string;
  parentField?: string;
}

function parsePath(path: string): ParsedPath {
  const parts = path.split('/').filter(Boolean);
  
  if (parts[0] === 'users') {
    if (parts.length >= 3 && parts[2] === 'investments') {
      return { 
        table: 'investments', 
        id: parts[3], 
        parentId: parts[1], 
        parentField: 'user_id' 
      };
    }
    return { table: 'profiles', id: parts[1] };
  }
  if (parts[0] === 'loans') {
    return { table: 'loans', id: parts[1] };
  }
  if (parts[0] === 'transactions') {
    return { table: 'transactions', id: parts[1] };
  }
  if (parts[0] === 'tax_refunds') {
    return { table: 'tax_refunds', id: parts[1] };
  }
  if (parts[0] === 'grants') {
    return { table: 'grants', id: parts[1] };
  }
  if (parts[0] === 'tax_filings') {
    return { table: 'tax_filings', id: parts[1] };
  }
  if (parts[0] === 'donations') {
    return { table: 'donations', id: parts[1] };
  }
  if (parts[0] === 'settings') {
    return { table: 'settings', id: parts[1] };
  }
  if (parts[0] === 'investments') {
    return { table: 'investments', id: parts[1] };
  }
  if (parts[0] === 'chats') {
    if (parts.length >= 3 && parts[2] === 'messages') {
      return { 
        table: 'messages', 
        id: parts[3], 
        parentId: parts[1], 
        parentField: 'chat_id' 
      };
    }
    return { table: 'chats', id: parts[1] };
  }
  if (parts[0] === 'notifications') {
    if (parts.length >= 3 && parts[2] === 'items') {
      return { 
        table: 'notifications', 
        id: parts[3], 
        parentId: parts[1], 
        parentField: 'user_id' 
      };
    }
    return { table: 'notifications', id: parts[1] };
  }
  
  return { table: parts[0], id: parts[1] };
}

function toCamelCase(str: string): string {
  if (str === 'user_id') return 'userId';
  if (str === 'chat_id') return 'chatId';
  if (str === 'sender_id') return 'senderId';
  if (str === 'sender_name') return 'senderName';
  if (str === 'sender_role') return 'senderRole';
  if (str === 'charity_id') return 'charityId';
  if (str === 'charity_name') return 'charityName';
  if (str === 'loan_id') return 'loanId';
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

function toSnakeCase(str: string): string {
  if (str === 'userId') return 'user_id';
  if (str === 'chatId') return 'chat_id';
  if (str === 'senderId') return 'sender_id';
  if (str === 'senderName') return 'sender_name';
  if (str === 'senderRole') return 'sender_role';
  if (str === 'charityId') return 'charity_id';
  if (str === 'charityName') return 'charity_name';
  if (str === 'loanId') return 'loan_id';
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function mapRowToSupabase(row: any): any {
  if (!row) return row;
  const res: any = {};
  for (const key of Object.keys(row)) {
    const camelKey = toCamelCase(key);
    res[camelKey] = row[key];
  }
  return res;
}

function mapSupabaseToRow(data: any): any {
  if (!data) return data;
  const res: any = {};
  for (const key of Object.keys(data)) {
    const snakeKey = toSnakeCase(key);
    let val = data[key];
    
    if (val && typeof val === 'object' && val._type === 'increment') {
      val = val.value;
    } else if (val && typeof val === 'object' && val._type === 'serverTimestamp') {
      val = new Date().toISOString();
    } else if (val && typeof val === 'object' && val._type === 'arrayUnion') {
      val = val.elements;
    }
    
    res[snakeKey] = val;
  }
  return res;
}

const VALID_COLUMNS: Record<string, string[]> = {
  profiles: [
    'id', 'full_name', 'email', 'phone', 'role', 'kyc_status', 'wallet_balance', 
    'investment_balance', 'grant_balance', 'savings', 'active_cards', 'country', 
    'address', 'address2', 'dob', 'ssn', 'employment_status', 'employer_name', 
    'job_title', 'monthly_income', 'marital_status', 'state_of_origin', 'sentry', 
    'last_return_calculation_date', 'credit_cards', 'bank_accounts', 'card_details', 
    'bank_details', 'created_at', 'updated_at', 'email_verified',
    'id_card_front_image', 'id_card_back_image', 'face_image', 'id_card_image',
    'kyc_submitted_at', 'rejection_reason', 'kyc_reviewed_at', 'kyc_reviewed_by'
  ],
  loans: [
    'id', 'user_id', 'amount', 'purpose', 'status', 'bank_details', 'additional_details', 
    'draft_data', 'pin_sent', 'pin_submitted', 'submitted_pin', 'pin_submitted_at', 
    'additional_details_submitted_at', 'created_at', 'updated_at'
  ],
  transactions: [
    'id', 'user_id', 'type', 'amount', 'currency', 'status', 'description', 'timestamp',
    'proof_of_payment', 'storage_path', 'account_details', 'user_email', 'method', 
    'created_at', 'reviewed_at', 'reviewed_by'
  ],
  chats: [
    'id', 'user_id', 'manager_id', 'participants', 'last_message', 'last_message_at', 
    'last_message_timestamp', 'unread_count', 'created_at', 'updated_at'
  ],
  messages: [
    'id', 'chat_id', 'sender_id', 'sender_name', 'sender_role', 'role', 'text', 
    'timestamp', 'created_at'
  ],
  tax_refunds: [
    'id', 'user_id', 'amount', 'status', 'created_at', 'updated_at'
  ],
  grants: [
    'id', 'user_id', 'type', 'amount', 'purpose', 'description', 'currency', 'status', 
    'timestamp', 'created_at', 'updated_at'
  ],
  tax_filings: [
    'id', 'user_id', 'filing_status', 'gross_income', 'deductions', 'tax_withheld', 
    'refund_amount', 'status', 'currency', 'timestamp', 'created_at', 'updated_at'
  ],
  donations: [
    'id', 'user_id', 'charity_id', 'charity_name', 'amount', 'anonymous', 'timestamp', 'created_at'
  ],
  notifications: [
    'id', 'user_id', 'type', 'title', 'message', 'loan_id', 'read', 'created_at'
  ],
  settings: [
    'id', 'usdt_address', 'btc_address', 'updated_at', 'updated_by'
  ],
  investments: [
    'id', 'user_id', 'title', 'amount', 'biweekly_return', 'status', 'timestamp', 'created_at', 'updated_at'
  ]
};

function filterColumns(row: any, table: string): any {
  const allowed = VALID_COLUMNS[table];
  if (!allowed) return row;
  const filtered: any = {};
  for (const key of Object.keys(row)) {
    if (allowed.includes(key)) {
      filtered[key] = row[key];
    }
  }
  return filtered;
}

// 4. CRUD Operations
export class DocumentSnapshotCompat {
  constructor(
    public ref: DocumentReference,
    private _data: any,
    private _exists: boolean
  ) {}

  exists() {
    return this._exists;
  }

  data() {
    return this._exists ? mapRowToSupabase(this._data) : undefined;
  }

  get id() {
    return this.ref.id;
  }
}

export class QueryDocumentSnapshotCompat {
  constructor(
    public ref: DocumentReference,
    private _data: any
  ) {}

  data() {
    return mapRowToSupabase(this._data);
  }

  get id() {
    return this.ref.id;
  }
}

export class QuerySnapshotCompat {
  constructor(
    public docs: QueryDocumentSnapshotCompat[],
    public empty: boolean
  ) {}

  forEach(callback: (doc: QueryDocumentSnapshotCompat) => void) {
    this.docs.forEach(callback);
  }
}

export async function getDoc(docRef: DocumentReference) {
  const { table, id } = parsePath(docRef.path);
  if (!id) throw new Error('[Supabase DB] Cannot get doc without ID.');

  try {
    let res = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (res.error && (res.error.message?.includes('AbortError') || res.error.message?.includes('steal') || res.error.message?.includes('Lock broken') || res.error.message?.includes('Failed to fetch'))) {
      // Retry once if request was aborted or failed due to network/lock contention
      res = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
    }

    const { data, error } = res;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn(`[Supabase DB] Table '${table}' does not exist in schema cache yet. Returning empty snapshot for ${docRef.path}.`);
        return new DocumentSnapshotCompat(docRef, null, false);
      }
      if (error.message?.includes('AbortError') || error.message?.includes('steal') || error.message?.includes('Lock broken') || error.message?.includes('Failed to fetch')) {
        console.warn(`[Supabase DB] Lock/Abort/Fetch issue on ${table}/${id}. Returning fallback snapshot.`);
        return new DocumentSnapshotCompat(docRef, null, false);
      }
      const errMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
      console.error(`[Supabase DB] Error in getDoc on ${table}/${id}:`, errMsg);
      throw enhanceSupabaseError(error);
    }

    return new DocumentSnapshotCompat(docRef, data, !!data);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (err?.name === 'TypeError' || msg.includes('Failed to fetch') || msg.includes('AbortError') || msg.includes('steal') || msg.includes('Lock broken')) {
      console.warn(`[Supabase DB] Network/Fetch exception on ${table}/${id}: ${msg}. Returning fallback empty snapshot.`);
      return new DocumentSnapshotCompat(docRef, null, false);
    }
    throw enhanceSupabaseError(err);
  }
}

export async function getDocs(queryRef: CollectionReference | QueryCompat) {
  const ref = queryRef instanceof QueryCompat ? queryRef.ref : queryRef;
  const constraints = queryRef instanceof QueryCompat ? queryRef.constraints : [];
  
  const { table, parentId, parentField } = parsePath(ref.path);

  try {
    let builder = supabase.from(table).select('*');
    
    if (parentId && parentField) {
      builder = builder.eq(parentField, parentId);
    }
    
    for (const c of constraints) {
      if (c.type === 'where') {
        const snakeField = toSnakeCase(c.field);
        if (c.op === '==' || c.op === '===') {
          builder = builder.eq(snakeField, c.value);
        } else if (c.op === '!=') {
          builder = builder.neq(snakeField, c.value);
        } else if (c.op === '>') {
          builder = builder.gt(snakeField, c.value);
        } else if (c.op === '>=') {
          builder = builder.gte(snakeField, c.value);
        } else if (c.op === '<') {
          builder = builder.lt(snakeField, c.value);
        } else if (c.op === '<=') {
          builder = builder.lte(snakeField, c.value);
        } else if (c.op === 'in') {
          builder = builder.in(snakeField, c.value);
        } else if (c.op === 'array-contains') {
          builder = builder.contains(snakeField, [c.value]);
        }
      } else if (c.type === 'orderBy') {
        const snakeField = toSnakeCase(c.field);
        builder = builder.order(snakeField, { ascending: c.direction === 'asc' });
      } else if (c.type === 'limit') {
        builder = builder.limit(c.value);
      }
    }

    let res = await builder;
    if (res.error && (res.error.message?.includes('AbortError') || res.error.message?.includes('steal') || res.error.message?.includes('Lock broken') || res.error.message?.includes('Failed to fetch'))) {
      res = await builder;
    }

    const { data, error } = res;
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn(`[Supabase DB] Table '${table}' does not exist in schema cache yet. Returning empty list for ${ref.path}.`);
        return new QuerySnapshotCompat([], true);
      }
      if (error.message?.includes('AbortError') || error.message?.includes('steal') || error.message?.includes('Lock broken') || error.message?.includes('Failed to fetch')) {
        console.warn(`[Supabase DB] Lock/Abort/Fetch issue on ${table}. Returning empty list.`);
        return new QuerySnapshotCompat([], true);
      }
      const errMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
      console.error(`[Supabase DB] Error in getDocs on ${table}:`, errMsg);
      throw enhanceSupabaseError(error);
    }

    const docs = (data || []).map(row => {
      const docRef = new DocumentReference(`${ref.path}/${row.id}`);
      return new QueryDocumentSnapshotCompat(docRef, row);
    });

    return new QuerySnapshotCompat(docs, docs.length === 0);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (err?.name === 'TypeError' || msg.includes('Failed to fetch') || msg.includes('AbortError') || msg.includes('steal') || msg.includes('Lock broken')) {
      console.warn(`[Supabase DB] Network/Fetch exception on ${table}: ${msg}. Returning empty snapshot list.`);
      return new QuerySnapshotCompat([], true);
    }
    throw enhanceSupabaseError(err);
  }
}

// Helper to automatically retry database operations stripping columns that don't exist in remote schema cache
async function executeWithoutMissingColumns<T>(
  row: any,
  action: (currentRow: any) => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  let currentRow = { ...row };
  let attempts = 0;
  while (attempts < 6) {
    attempts++;
    const res = await action(currentRow);
    if (res.error && (res.error.code === 'PGRST204' || res.error.message?.includes('Could not find the') || res.error.message?.includes('schema cache'))) {
      const match = res.error.message.match(/Could not find the ['"](.*?)['"] column/i);
      if (match && match[1] && match[1] in currentRow) {
        console.warn(`[Supabase DB] Column '${match[1]}' missing from table. Retrying without '${match[1]}'.`);
        delete currentRow[match[1]];
        continue;
      }
    }
    return res;
  }
  return action(currentRow);
}

export async function addDoc(collectionRef: CollectionReference, data: any) {
  const { table, parentId, parentField } = parsePath(collectionRef.path);

  const mergedData = { ...data };
  if (parentId && parentField) {
    mergedData[parentField] = parentId;
  }

  for (const key of Object.keys(mergedData)) {
    const val = mergedData[key];
    if (val && typeof val === 'object' && val._type === 'serverTimestamp') {
      mergedData[key] = new Date().toISOString();
    }
  }

  const row = mapSupabaseToRow(mergedData);
  const filteredRow = filterColumns(row, table);

  try {
    const res = await executeWithoutMissingColumns(filteredRow, async (r) => {
      let rRes = await supabase
        .from(table)
        .insert(r)
        .select('*')
        .single();

      if (rRes.error && (rRes.error.message?.includes('Failed to fetch') || rRes.error.message?.includes('AbortError') || rRes.error.message?.includes('steal') || rRes.error.message?.includes('Lock broken'))) {
        rRes = await supabase
          .from(table)
          .insert(r)
          .select('*')
          .single();
      }
      return rRes;
    });

    const { data: inserted, error } = res;

    if (error) {
      if (table === 'notifications' || error.code === '42501' || error.message?.includes('row-level security')) {
        console.warn(`[Supabase DB] RLS or notification policy warning adding doc to ${table}:`, error.message);
        return new DocumentReference(`${collectionRef.path}/notif-${Date.now()}`);
      }
      if (error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
        console.warn(`[Supabase DB] Network error adding doc to ${table}: ${error.message}`);
        return new DocumentReference(`${collectionRef.path}/temp-${Date.now()}`);
      }
      console.error(`[Supabase DB] Error adding doc to ${table}:`, error);
      throw enhanceSupabaseError(error);
    }

    return new DocumentReference(`${collectionRef.path}/${inserted.id}`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (table === 'notifications' || msg.includes('row-level security') || msg.includes('Failed to fetch') || msg.includes('AbortError') || err?.name === 'TypeError') {
      console.warn(`[Supabase DB] Exception adding doc to ${table}: ${msg}. Returning fallback reference.`);
      return new DocumentReference(`${collectionRef.path}/temp-${Date.now()}`);
    }
    throw enhanceSupabaseError(err);
  }
}

export async function setDoc(docRef: DocumentReference, data: any, options?: { merge?: boolean }) {
  const { table, id, parentId, parentField } = parsePath(docRef.path);
  if (!id) throw new Error('[Supabase DB] Cannot set doc without ID.');

  const mergedData = { ...data };
  if (parentId && parentField) {
    mergedData[parentField] = parentId;
  }
  mergedData.id = id;

  for (const key of Object.keys(mergedData)) {
    const val = mergedData[key];
    if (val && typeof val === 'object' && val._type === 'serverTimestamp') {
      mergedData[key] = new Date().toISOString();
    }
  }

  const row = mapSupabaseToRow(mergedData);
  const filteredRow = filterColumns(row, table);

  try {
    const res = await executeWithoutMissingColumns(filteredRow, async (r) => {
      let rRes = await supabase
        .from(table)
        .upsert(r);

      if (rRes.error && (rRes.error.message?.includes('Failed to fetch') || rRes.error.message?.includes('AbortError') || rRes.error.message?.includes('steal') || rRes.error.message?.includes('Lock broken'))) {
        rRes = await supabase
          .from(table)
          .upsert(r);
      }
      return rRes;
    });

    const { error } = res;

    if (error) {
      if (table === 'profiles' || table === 'notifications' || table === 'chats' || error.code === '42501' || error.message?.includes('row-level security')) {
        console.warn(`[Supabase DB] Warning/RLS setting doc in ${table} (${error.message}):`, error);
        return;
      }
      if (error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
        console.warn(`[Supabase DB] Network error setting doc in ${table}: ${error.message}`);
        return;
      }
      console.error(`[Supabase DB] Error setting doc in ${table}:`, error);
      throw enhanceSupabaseError(error);
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (table === 'profiles' || table === 'notifications' || table === 'chats' || msg.includes('row-level security') || msg.includes('Failed to fetch') || msg.includes('AbortError') || err?.name === 'TypeError') {
      console.warn(`[Supabase DB] Exception setting doc in ${table}: ${msg}`);
      return;
    }
    throw enhanceSupabaseError(err);
  }
}

export async function updateDoc(docRef: DocumentReference, data: any) {
  const { table, id } = parsePath(docRef.path);
  if (!id) throw new Error('[Supabase DB] Cannot update doc without ID.');

  try {
    // Fetch current to resolve increments and arrayUnion
    let { data: current } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const currentCamel = current ? mapRowToSupabase(current) : {};

    const mergedData: any = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val && typeof val === 'object' && val._type === 'increment') {
        const currentVal = Number(currentCamel[key] || 0);
        mergedData[key] = currentVal + val.value;
      } else if (val && typeof val === 'object' && val._type === 'arrayUnion') {
        const currentVal = Array.isArray(currentCamel[key]) ? currentCamel[key] : [];
        mergedData[key] = [...currentVal, ...val.elements];
      } else if (val && typeof val === 'object' && val._type === 'serverTimestamp') {
        mergedData[key] = new Date().toISOString();
      } else {
        mergedData[key] = val;
      }
    }

    const row = mapSupabaseToRow(mergedData);
    const filteredRow = filterColumns(row, table);

    const res = await executeWithoutMissingColumns(filteredRow, async (r) => {
      let rRes = await supabase
        .from(table)
        .update(r)
        .eq('id', id);

      if (rRes.error && (rRes.error.message?.includes('Failed to fetch') || rRes.error.message?.includes('AbortError') || rRes.error.message?.includes('steal') || rRes.error.message?.includes('Lock broken'))) {
        rRes = await supabase
          .from(table)
          .update(r)
          .eq('id', id);
      }
      return rRes;
    });

    const { error } = res;

    if (error) {
      if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('Failed to fetch') || error.message?.includes('AbortError')) {
        console.warn(`[Supabase DB] Warning updating ${table}/${id}: ${error.message}`);
        return;
      }
      console.error(`[Supabase DB] Error updating ${table}/${id}:`, error);
      throw enhanceSupabaseError(error);
    }
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('row-level security') || msg.includes('Failed to fetch') || msg.includes('AbortError') || err?.name === 'TypeError') {
      console.warn(`[Supabase DB] Exception updating ${table}/${id}: ${msg}`);
      return;
    }
    throw enhanceSupabaseError(err);
  }
}

// 5. Real-time Listening
export function onSnapshot(
  ref: DocumentReference | CollectionReference | QueryCompat,
  next: (snapshot: any) => void,
  error?: (err: any) => void
) {
  let active = true;

  const isDoc = ref instanceof DocumentReference;
  const targetRef = ref instanceof QueryCompat ? ref.ref : ref;
  const { table } = parsePath(targetRef.path);

  const run = async () => {
    try {
      if (isDoc) {
        const snap = await getDoc(ref as DocumentReference);
        if (active) next(snap);
      } else {
        const snap = await getDocs(ref as CollectionReference | QueryCompat);
        if (active) next(snap);
      }
    } catch (err) {
      if (active && error) error(err);
    }
  };

  run();

  const channel = supabase
    .channel(`supabase-onSnapshot-${targetRef.path}-${Math.random()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table
      },
      () => {
        if (active) {
          run();
        }
      }
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

// 6. Batches
export class WriteBatchCompat {
  private operations: (() => Promise<void>)[] = [];

  set(docRef: DocumentReference, data: any, options?: any) {
    this.operations.push(() => setDoc(docRef, data, options));
  }

  update(docRef: DocumentReference, data: any) {
    this.operations.push(() => updateDoc(docRef, data));
  }

  async commit() {
    for (const op of this.operations) {
      await op();
    }
  }
}

export function writeBatch(db: any) {
  return new WriteBatchCompat();
}

// 7. Supabase Database Instance
export const dbInstance = { name: '[Supabase Database]' };

export function getFirestore(app?: any) {
  return dbInstance;
}

export function initializeFirestore(app: any, settings?: any, databaseId?: string) {
  return dbInstance;
}

// Helpers
export function increment(value: number) {
  return { _type: 'increment', value };
}

export function serverTimestamp() {
  return { _type: 'serverTimestamp' };
}

export function arrayUnion(...elements: any[]) {
  return { _type: 'arrayUnion', elements };
}
