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

async def require_admin(x_admin_email: Optional[str]):
    email = (x_admin_email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Missing X-Admin-Email header")
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
async def admin_overview(x_admin_email: Optional[str] = Header(default=None)):
    await require_admin(x_admin_email)
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
    }
    users, hospitals, activities = [], [], []
    pool = await get_db_pool()
    if pool:
        await ensure_admin_tables(pool)
        async with pool.acquire() as conn:
            u_rows = await conn.fetch("SELECT email, full_name, role, hospital_id, hospital_name, subscription_tier, subscription_status, last_active_at, created_at FROM admin_users ORDER BY created_at DESC")
            users = [dict(r) for r in u_rows]
            h_rows = await conn.fetch("""
                SELECT h.id, h.name, h.location, h.tier, h.created_at, COUNT(u.email)::int AS staff_count
                FROM hospitals h LEFT JOIN admin_users u ON u.hospital_id = h.id
                GROUP BY h.id ORDER BY h.created_at DESC
            """)
            hospitals = [dict(r) for r in h_rows]
            a_rows = await conn.fetch("SELECT id, actor_email, action, target, details, created_at FROM admin_activities ORDER BY created_at DESC LIMIT 100")
            activities = [dict(r) for r in a_rows]
    subscribers = [u for u in users if u.get("subscription_tier") and u["subscription_tier"] != "free"]
    return {"health": health, "users": users, "subscribers": subscribers, "hospitals": hospitals, "activities": activities}

@router.post("/users/onboard")
async def onboard_user(body: OnboardUserReq, x_admin_email: Optional[str] = Header(default=None)):
    actor = await require_admin(x_admin_email)
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
async def create_hospital(body: HospitalReq, x_admin_email: Optional[str] = Header(default=None)):
    actor = await require_admin(x_admin_email)
    pool = await get_db_pool()
    await ensure_admin_tables(pool)
    async with pool.acquire() as conn:
        row = await conn.fetchrow("INSERT INTO hospitals (name, location, tier) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET location = $2, tier = $3 RETURNING id, name, location, tier", body.name.strip(), body.location or "", body.tier or "hospital")
        await conn.execute("INSERT INTO admin_activities (actor_email, action, target, details) VALUES ($1, 'create_hospital', $2, $3)", actor, body.name.strip(), body.location or "")
    return dict(row)

@router.post("/users/assign-hospital")
async def assign_hospital(body: AssignHospitalReq, x_admin_email: Optional[str] = Header(default=None)):
    actor = await require_admin(x_admin_email)
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
