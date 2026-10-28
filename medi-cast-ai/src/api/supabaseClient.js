import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check whether a real, non-placeholder Supabase URL is configured
const hasValidSupabaseConfig = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('http') &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'placeholder'
);

let realSupabase = null;
if (hasValidSupabaseConfig) {
  try {
    realSupabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('[MediCast DB] Failed to initialize real Supabase client:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Resilient Local Persistent Storage Engine (Zero-Downtime Fallback)
// ─────────────────────────────────────────────────────────────
const STORAGE_PREFIX = 'medicast_db_';
const blobUrlCache = new Map();

function getTableRecords(table) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + table);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn(`[MediCast DB] Error reading ${table}:`, e);
    return [];
  }
}

function saveTableRecords(table, records) {
  try {
    localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('medicast_db_change', { detail: { table } }));
    }
  } catch (e) {
    console.warn(`[MediCast DB] Error writing ${table}:`, e);
  }
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'med_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

function createLocalQueryBuilder(table) {
  return {
    insert(payload) {
      const items = (Array.isArray(payload) ? payload : [payload]).map(item => ({
        id: item.id || generateUUID(),
        created_date: item.created_date || new Date().toISOString(),
        ...item
      }));

      const current = getTableRecords(table);
      saveTableRecords(table, [...items, ...current]);

      const chain = {
        select() {
          return {
            single() {
              return Promise.resolve({ data: items[0], error: null });
            },
            then(resolve, reject) {
              return Promise.resolve({ data: items, error: null }).then(resolve, reject);
            }
          };
        },
        single() {
          return Promise.resolve({ data: items[0], error: null });
        },
        then(resolve, reject) {
          return Promise.resolve({ data: items, error: null }).then(resolve, reject);
        }
      };
      return chain;
    },

    select(columns = '*') {
      let filtered = [...getTableRecords(table)];

      const chain = {
        eq(col, val) {
          filtered = filtered.filter(item => String(item[col]) === String(val));
          return chain;
        },
        order(col, { ascending = true } = {}) {
          filtered.sort((a, b) => {
            const valA = a[col];
            const valB = b[col];
            if (valA === valB) return 0;
            if (valA === undefined || valA === null) return ascending ? -1 : 1;
            if (valB === undefined || valB === null) return ascending ? 1 : -1;

            const isDate = typeof valA === 'string' && !isNaN(Date.parse(valA));
            if (isDate) {
              return ascending ? (new Date(valA) - new Date(valB)) : (new Date(valB) - new Date(valA));
            }
            return ascending ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
          });
          return chain;
        },
        limit(count) {
          filtered = filtered.slice(0, count);
          return chain;
        },
        single() {
          const item = filtered[0] || null;
          return Promise.resolve({
            data: item,
            error: item ? null : { message: 'Record not found', code: 'PGRST116' }
          });
        },
        then(resolve, reject) {
          return Promise.resolve({ data: filtered, error: null }).then(resolve, reject);
        }
      };
      return chain;
    },

    update(updates) {
      const chain = {
        eq(col, val) {
          const current = getTableRecords(table);
          let updatedItem = null;
          const next = current.map(item => {
            if (String(item[col]) === String(val)) {
              updatedItem = { ...item, ...updates };
              return updatedItem;
            }
            return item;
          });
          saveTableRecords(table, next);
          return Promise.resolve({ data: updatedItem, error: null });
        },
        then(resolve, reject) {
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
      };
      return chain;
    },

    delete() {
      const chain = {
        eq(col, val) {
          const current = getTableRecords(table);
          const next = current.filter(item => String(item[col]) !== String(val));
          saveTableRecords(table, next);

          // If deleting a surgery video, cascade delete related analysis results
          if (table === 'SurgeryVideo' && col === 'id') {
            const analyses = getTableRecords('AnalysisResult');
            const remainingAnalyses = analyses.filter(a => String(a.surgery_video_id) !== String(val));
            saveTableRecords('AnalysisResult', remainingAnalyses);
          }

          return Promise.resolve({ data: null, error: null });
        },
        then(resolve, reject) {
          return Promise.resolve({ data: null, error: null }).then(resolve, reject);
        }
      };
      return chain;
    }
  };
}

const localAuth = {
  async getSession() {
    try {
      const raw = localStorage.getItem('medicast_auth_user');
      const user = raw ? JSON.parse(raw) : null;
      return { data: { session: user ? { user } : null }, error: null };
    } catch {
      return { data: { session: null }, error: null };
    }
  },
  onAuthStateChange(callback) {
    this.getSession().then(({ data: { session } }) => {
      callback('INITIAL_SESSION', session);
    });
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  async signInWithPassword({ email }) {
    const user = { id: generateUUID(), email, role: 'surgeon' };
    localStorage.setItem('medicast_auth_user', JSON.stringify(user));
    return { data: { user, session: { user } }, error: null };
  },
  async signUp({ email }) {
    const user = { id: generateUUID(), email, role: 'surgeon' };
    localStorage.setItem('medicast_auth_user', JSON.stringify(user));
    return { data: { user, session: { user } }, error: null };
  },
  async signInWithOAuth() {
    const user = { id: 'usr_oauth', email: 'surgeon@medicast.ai', role: 'surgeon' };
    localStorage.setItem('medicast_auth_user', JSON.stringify(user));
    if (typeof window !== 'undefined') window.location.href = '/';
    return { data: null, error: null };
  },
  async signOut() {
    localStorage.removeItem('medicast_auth_user');
    return { error: null };
  },
  async getUser() {
    return (await this.getSession()).data;
  },
  async resetPasswordForEmail() {
    return { data: {}, error: null };
  },
  async updateUser() {
    return { data: {}, error: null };
  }
};

const localStorageClient = {
  from(bucket) {
    return {
      async upload(fileName, file) {
        if (file && typeof URL !== 'undefined' && URL.createObjectURL) {
          try {
            const blobUrl = URL.createObjectURL(file);
            blobUrlCache.set(fileName, blobUrl);
          } catch (e) {}
        }
        return { data: { path: fileName, fullPath: `${bucket}/${fileName}` }, error: null };
      },
      getPublicUrl(fileName) {
        const publicUrl = blobUrlCache.get(fileName) || '';
        return { data: { publicUrl } };
      }
    };
  }
};

// ─────────────────────────────────────────────────────────────
// Resilient Client Wrapper
// ─────────────────────────────────────────────────────────────
export const supabase = {
  from(table) {
    if (!realSupabase) {
      return createLocalQueryBuilder(table);
    }

    const realBuilder = realSupabase.from(table);
    const localBuilder = createLocalQueryBuilder(table);

    // Proxy with automatic fallback on network error / TypeError: Failed to fetch
    return {
      insert(payload) {
        try {
          const req = realBuilder.insert(payload);
          return {
            select(...args) {
              const sel = req.select(...args);
              return {
                async single() {
                  try {
                    const res = await sel.single();
                    if (res.error) throw res.error;
                    return res;
                  } catch (err) {
                    console.warn(`[MediCast DB] Supabase insert.select.single failed (${err.message}). Using local store fallback.`);
                    return localBuilder.insert(payload).select().single();
                  }
                },
                then(resolve, reject) {
                  sel.then(res => {
                    if (res.error) throw res.error;
                    resolve(res);
                  }).catch(err => {
                    console.warn(`[MediCast DB] Supabase insert.select failed (${err.message}). Using local store fallback.`);
                    localBuilder.insert(payload).select().then(resolve, reject);
                  });
                }
              };
            },
            single() {
              return req.single().catch(() => localBuilder.insert(payload).single());
            },
            then(resolve, reject) {
              req.then(res => {
                if (res.error) throw res.error;
                resolve(res);
              }).catch(() => {
                localBuilder.insert(payload).then(resolve, reject);
              });
            }
          };
        } catch {
          return localBuilder.insert(payload);
        }
      },

      select(columns = '*') {
        try {
          const req = realBuilder.select(columns);
          const chain = {
            eq(col, val) {
              req.eq(col, val);
              localBuilder.select(columns).eq(col, val);
              return chain;
            },
            order(col, opts) {
              req.order(col, opts);
              return chain;
            },
            limit(count) {
              req.limit(count);
              return chain;
            },
            async single() {
              try {
                const res = await req.single();
                if (res.error) throw res.error;
                return res;
              } catch (err) {
                console.warn(`[MediCast DB] Supabase select.single failed (${err.message}). Falling back to local store.`);
                return localBuilder.select(columns).single();
              }
            },
            then(resolve, reject) {
              req.then(res => {
                if (res.error) throw res.error;
                resolve(res);
              }).catch(err => {
                console.warn(`[MediCast DB] Supabase select failed (${err.message}). Falling back to local store.`);
                localBuilder.select(columns).then(resolve, reject);
              });
            }
          };
          return chain;
        } catch {
          return localBuilder.select(columns);
        }
      },

      update(updates) {
        return {
          eq(col, val) {
            return realBuilder.update(updates).eq(col, val).catch(() => {
              return localBuilder.update(updates).eq(col, val);
            });
          }
        };
      },

      delete() {
        return {
          eq(col, val) {
            return realBuilder.delete().eq(col, val).catch(() => {
              return localBuilder.delete().eq(col, val);
            });
          }
        };
      }
    };
  },

  storage: realSupabase?.storage || localStorageClient,
  auth: realSupabase?.auth || localAuth,
};

