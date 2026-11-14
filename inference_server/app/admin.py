import httpx
import os, time, shutil, subprocess
import psutil
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.database import get_db_pool

router = APIRouter(prefix="/api/admin", tags=["admin"])
SUPER_ADMIN_EMAILS = {"erixpanda16@gmail.com"}
START_TIME = time.time()

async def ensure_admin_tables(pool):
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS hospitals (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                location TEXT DEFAULT '',
                tier TEXT DEFAULT 'hospital',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS admin_users (
                email TEXT PRIMARY KEY,
                full_name TEXT DEFAULT '',
                role TEXT DEFAULT 'user',
                hospital_id INTEGER REFERENCES hospitals(id) ON DELETE SET NULL,
                hospital_name TEXT DEFAULT '',
                subscription_tier TEXT DEFAULT 'free',
                subscription_status TEXT DEFAULT 'active',
                last_active_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS or_count INTEGER DEFAULT 1;
            ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS cases_this_month INTEGER DEFAULT 0;
            ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'Pilot';
            CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW());
            INSERT INTO system_settings (key, value) VALUES ('shadow_mode', 'true') ON CONFLICT (key) DO NOTHING;
            CREATE TABLE IF NOT EXISTS admin_activities (
                id SERIAL PRIMARY KEY,
                actor_email TEXT NOT NULL,
                action TEXT NOT NULL,
                target TEXT DEFAULT '',
                details TEXT DEFAULT '',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        """)
        for email in SUPER_ADMIN_EMAILS:
            await conn.execute("""
                INSERT INTO admin_users (email, full_name, role, subscription_tier, subscription_status)
                VALUES ($1, 'Super Admin', 'super_admin', 'hospital', 'active')
                ON CONFLICT (email) DO UPDATE SET role = 'super_admin', subscription_tier = 'hospital', subscription_status = 'active';
            """, email)

async def require_admin(authorization: Optional[str] = None, x_admin_email: Optional[str] = None):
    token = (authorization or "").replace("Bearer ", "").strip()
    sb_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    sb_key = os.getenv("SUPABASE_ANON_KEY", "")
    email = ""
    if token and sb_url and sb_key:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{sb_url}/auth/v1/user", headers={"Authorization": f"Bearer {token}", "apikey": sb_key})
            if r.status_code == 200:
                email = (r.json().get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Valid Supabase session token required")
    if email in SUPER_ADMIN_EMAILS:
        return email
    pool = await get_db_pool()
    if pool:
        await ensure_admin_tables(pool)
        async with pool.acquire() as conn:
            row = await conn.fetchrow("SELECT role FROM admin_users WHERE email = $1", email)
            if row and row["role"] in ("admin", "super_admin"):
                return email
    raise HTTPException(status_code=403, detail="Admin access required")

def service_status(name: str) -> str:
    try:
        r = subprocess.run(["systemctl", "is-active", name], capture_output=True, text=True, timeout=2)
        return r.stdout.strip() or "unknown"
    except Exception:
        return "unknown"

class SyncUserReq(BaseModel):
    email: str
    full_name: Optional[str] = ""

class OnboardUserReq(BaseModel):
    email: str
    full_name: Optional[str] = ""
    role: str = "admin"
    hospital_id: Optional[int] = None
    subscription_tier: str = "hospital"

class HospitalReq(BaseModel):
    name: str
    location: Optional[str] = ""
    tier: Optional[str] = "hospital"
    or_count: Optional[int] = 1
    billing_mode: Optional[str] = "Pilot"

class AssignHospitalReq(BaseModel):
    email: str
    hospital_id: int

@router.post("/sync-login")
async def sync_login(body: SyncUserReq):
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    pool = await get_db_pool()
    role = "super_admin" if email in SUPER_ADMIN_EMAILS else "user"
    tier = "hospital" if email in SUPER_ADMIN_EMAILS else "free"
    hospital_name = ""
    if pool:
        await ensure_admin_tables(pool)
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO admin_users (email, full_name, role, subscription_tier, last_active_at)
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (email) DO UPDATE SET
                    full_name = COALESCE(NULLIF($2, ''), admin_users.full_name),
                    last_active_at = NOW();
            """, email, body.full_name or "", role, tier)
            row = await conn.fetchrow("SELECT role, subscription_tier, subscription_status, hospital_name FROM admin_users WHERE email = $1", email)
            if row:
                role = row["role"]
                tier = row["subscription_tier"]
                hospital_name = row["hospital_name"] or ""
            await conn.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1, 'user_login', $1, $2)", email, f"role={role}")
    return {"email": email, "role": role, "subscription_tier": tier, "hospital_name": hospital_name}

@router.get("/overview")
async def admin_overview(authorization: Optional[str] = Header(default=None)):
    await require_admin(authorization=authorization)
    mem = psutil.virtual_memory()
    disk = shutil.disk_usage("/")
    cpu_pct = psutil.cpu_percent(interval=0.2)
    load1, load5, load15 = os.getloadavg()
    health = {
        "cpu_percent": cpu_pct,
        "load_avg": [round(load1, 2), round(load5, 2), round(load15, 2)],
        "ram_percent": mem.percent,
        "ram_used_gb": round(mem.used / (1024**3), 2),
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "disk_percent": round(disk.used * 100 / disk.total, 1),
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "uptime_hours": round((time.time() - START_TIME) / 3600, 2),
        "services": {
            "backend": service_status("medicast-backend"),
            "nginx": service_status("nginx"),
            "redis": service_status("redis-server"),
            "postgresql": service_status("postgresql"),
        },
        "text_model": os.getenv("TEXT_MODEL", ""),
        "vision_model": os.getenv("VISION_MODEL", ""),
        "shadow_mode": True,
        "total_events": 0,
        "ack_count": 0,
    }
    users, hospitals, activities = [], [], []
    pool = await get_db_pool()
    if pool:
        await ensure_admin_tables(pool)
        async with pool.acquire() as conn:
            u_rows = await conn.fetch("SELECT email, full_name, role, hospital_id, hospital_name, subscription_tier, subscription_status, last_active_at, created_at FROM admin_users ORDER BY created_at DESC")
            users = [dict(r) for r in u_rows]
            h_rows = await conn.fetch("""
                SELECT h.id, h.name, h.location, h.tier, COALESCE(h.or_count,1) AS or_count, COALESCE(h.cases_this_month,0) AS cases_this_month, COALESCE(h.billing_mode,'Pilot') AS billing_mode, h.created_at, COUNT(u.email)::int AS staff_count
                FROM hospitals h LEFT JOIN admin_users u ON u.hospital_id = h.id
                GROUP BY h.id ORDER BY h.created_at DESC
            """)
            hospitals = [dict(r) for r in h_rows]
            a_rows = await conn.fetch("SELECT id, actor_email, action, target, details, created_at FROM admin_activities ORDER BY created_at DESC LIMIT 100")
            activities = [dict(r) for r in a_rows]
            sm = await conn.fetchval("SELECT value FROM system_settings WHERE key = 'shadow_mode'")
            health["shadow_mode"] = (sm != "false")
            health["total_events"] = await conn.fetchval("SELECT COUNT(*)::int FROM admin_activities") or 0
            health["ack_count"] = await conn.fetchval("SELECT COUNT(*)::int FROM admin_activities WHERE action = 'clinician_ack'") or 0
    subscribers = [u for u in users if u.get("subscription_tier") and u["subscription_tier"] != "free"]
    return {"health": health, "users": users, "subscribers": subscribers, "hospitals": hospitals, "activities": activities}

@router.post("/users/onboard")
async def onboard_user(body: OnboardUserReq, authorization: Optional[str] = Header(default=None)):
    actor = await require_admin(authorization=authorization)
    email = body.email.strip().lower()
    if body.role not in ("user", "admin", "super_admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    pool = await get_db_pool()
    await ensure_admin_tables(pool)
    async with pool.acquire() as conn:
        h_name = ""
        if body.hospital_id:
            h_row = await conn.fetchrow("SELECT name FROM hospitals WHERE id = $1", body.hospital_id)
            h_name = h_row["name"] if h_row else ""
        await conn.execute("""
            INSERT INTO admin_users (email, full_name, role, hospital_id, hospital_name, subscription_tier, subscription_status)
            VALUES ($1, $2, $3, $4, $5, $6, 'active')
            ON CONFLICT (email) DO UPDATE SET
                full_name = COALESCE(NULLIF($2, ''), admin_users.full_name),
                role = $3,
                hospital_id = COALESCE($4, admin_users.hospital_id),
                hospital_name = CASE WHEN $5 != '' THEN $5 ELSE admin_users.hospital_name END,
                subscription_tier = $6,
                subscription_status = 'active';
        """, email, body.full_name or "", body.role, body.hospital_id, h_name, body.subscription_tier)
        await conn.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1, 'onboard_user', $2, $3)", actor, email, f"role={body.role}, tier={body.subscription_tier}")
    return {"status": "ok", "email": email, "role": body.role}

@router.post("/hospitals")
async def create_hospital(body: HospitalReq, authorization: Optional[str] = Header(default=None)):
    actor = await require_admin(authorization=authorization)
    pool = await get_db_pool()
    await ensure_admin_tables(pool)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("INSERT INTO hospitals (name, location, tier, or_count, billing_mode) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO UPDATE SET location = $2, tier = $3, or_count = $4, billing_mode = $5 RETURNING id, name, location, tier", body.name.strip(), body.location or "", body.tier or "hospital", body.or_count or 1, body.billing_mode or "Pilot")
        await conn.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1, 'create_hospital', $2, $3)", actor, body.name.strip(), body.location or "")
    return dict(row)

@router.post("/users/assign-hospital")
async def assign_hospital(body: AssignHospitalReq, authorization: Optional[str] = Header(default=None)):
    actor = await require_admin(authorization=authorization)
    email = body.email.strip().lower()
    pool = await get_db_pool()
    await ensure_admin_tables(pool)
    async with pool.acquire() as conn:
        h = await conn.fetchrow("SELECT id, name FROM hospitals WHERE id = $1", body.hospital_id)
        if not h:
            raise HTTPException(status_code=404, detail="Hospital not found")
        await conn.execute("UPDATE admin_users SET hospital_id = $1, hospital_name = $2 WHERE email = $3", h["id"], h["name"], email)
        await conn.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1, 'assign_hospital', $2, $3)", actor, email, h["name"])
    return {"status": "ok", "email": email, "hospital": h["name"]}

class ShadowReq(BaseModel):
    enabled: bool

@router.get("/settings")
async def get_settings():
    pool = await get_db_pool()
    shadow = True
    if pool:
        await ensure_admin_tables(pool)
        async with pool.acquire() as conn:
            v = await conn.fetchval("SELECT value FROM system_settings WHERE key = 'shadow_mode'")
            shadow = (v != "false")
    return {"shadow_mode": shadow}

@router.post("/settings/shadow-mode")
async def set_shadow_mode(body: ShadowReq, authorization: Optional[str] = Header(default=None)):
    actor = await require_admin(authorization=authorization)
    pool = await get_db_pool()
    await ensure_admin_tables(pool)
    val = "true" if body.enabled else "false"
    async with pool.acquire() as conn:
        await conn.execute("INSERT INTO system_settings (key, value, updated_at) VALUES ('shadow_mode', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()", val)
        await conn.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1, 'shadow_mode', 'system', $2)", actor, f"enabled={val}")
    return {"shadow_mode": body.enabled}

@router.post("/hospitals/{hospital_id}/log-case")
async def log_hospital_case(hospital_id: int, authorization: Optional[str] = Header(default=None)):
    actor = await require_admin(authorization=authorization)
    pool = await get_db_pool()
    await ensure_admin_tables(pool)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("UPDATE hospitals SET cases_this_month = COALESCE(cases_this_month, 0) + 1 WHERE id = $1 RETURNING name, cases_this_month", hospital_id)
        if not row:
            raise HTTPException(status_code=404, detail="Hospital not found")
        await conn.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1, 'log_case', $2, $3)", actor, row["name"], f"cases={row['cases_this_month']}")
    return dict(row)
