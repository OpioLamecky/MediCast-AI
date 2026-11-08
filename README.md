# MediCast AI — Autonomous Surgical Vision & Video Intelligence Platform

[![Live App](https://img.shields.io/badge/Live%20Demo-Render-00c58e?style=for-the-badge&logo=render&logoColor=white)](https://medicast-ai-surgical-inteligence2.onrender.com)
[![React](https://img.shields.io/badge/React%2018-Vite-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.10+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%203-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MTN MoMo](https://img.shields.io/badge/Payments-MTN%20Mobile%20Money%20(UGX)-ffcc00?style=for-the-badge&logo=mtn&logoColor=black)](https://medicast-ai-surgical-inteligence2.onrender.com/subscription)

> **MediCast AI** is an advanced multimodal surgical intelligence platform engineered to co-pilot, record, and audit operative procedures in real time. Built for surgical residents, attending surgeons, and hospital operating suites, MediCast AI delivers intraoperative computer vision telemetry, objective OSATS/GOALS surgical skill scoring, real-time complication prevention alerts, and automated accredited clinical audit reporting.

---

## 🌐 Live Deployment

* **Production URL**: [https://medicast-ai-surgical-inteligence2.onrender.com](https://medicast-ai-surgical-inteligence2.onrender.com)
* **Backend API**: [https://medicast-backend.onrender.com](https://medicast-backend.onrender.com)

---

## 🚀 Key Modules & Capabilities

### 1. 🎥 Live Intraoperative Surgical Vision (`/live`)
* **Real-Time PC Camera & Laparoscope Capture**: Streams surgical feeds directly from connected PC webcams, capture cards, or endoscopic camera towers via WebRTC / `getUserMedia`.
* **<1ms Optical Clarity Telemetry**: Continuous on-screen HUD monitoring illumination, vascular redness ratio, motion velocity, and optical contrast.
* **Intelligent Anatomical Scene Gating**: Risk warnings, complication counters, and safety scores are paused when the scope is occluded or outside the surgical cavity to prevent false alarms.
* **Continuous Recording & Instant AI Synthesis**: Surgeons can record live procedures, pause/resume, or trigger immediate frame scans. On session completion, MediCast AI automatically generates a comprehensive post-operative case review.
* **Acoustic Hazard Warnings**: Browser-synthesized audio cues and speech alerts notify the surgical team of rapid bleeding, critical view of safety breach, or vital structure proximity without looking away from the operative field.

### 2. 🧠 Autonomous Surgical Video Analysis (`/analyses` & `/analysis/:id`)
* **Phase Timeline Segmentation**: Automatically segments operative procedures (e.g. Laparoscopic Cholecystectomy, Appendectomy, Knee Arthroscopy, Hernia Repair) into standardized surgical phases.
* **Kinematics & Skill Assessment**: Computes objective Global Operative Assessment of Laparoscopic Skills (GOALS) and Objective Structured Assessment of Technical Skill (OSATS) metrics.
* **Critical View of Safety (CVS) Dissection Audit**: Identifies cystic duct, hepatocystic triangle dissection, and gallbladder mobilization planes.
* **Accredited Word Report Export (`.docx`)**: Generates formal clinical audit reports ready for institutional Morbidity & Mortality (M&M) reviews, credentialing, and surgical registries.

### 3. 💬 Surgical AI Co-Pilot & Assistant (`/assistant`)
* Specialized clinical surgical chatbot powered by fine-tuned multi-provider models (Groq Llama 3.3 70B, Qwen, Gemini 2.0 Flash).
* Provides procedural guidance, risk mitigation checklists, anatomical landmark verification, and case-specific surgical literature retrieval.
* Persistent chat discussions with individual conversation history and thread management.

### 4. ⚖️ Procedure Comparison Studio (`/compare`)
* Side-by-side surgical video comparison tool.
* Allows surgical educators and trainees to compare operative efficiency, phase transition timing, instrument movement economy, and safety delta across two cases simultaneously.

### 5. 💳 MTN Mobile Money Subscription (UGX) (`/subscription`)
* **Localized Ugandan Pricing**: Clean, high-conversion tier cards priced in Ugandan Shillings (UGX).
  * **Resident Tier (Free)**: `UGX 0` — 3 videos / month, 10 AI queries / day, 1 Live Surgery preview trial.
  * **Pro Surgeon**: `UGX 85,000 / month` (or `UGX 780,000 / year` ~ `UGX 65,000 / month`) — Unlimited videos, unlimited AI queries, continuous PC camera OR streaming, voice hazard warnings, and accredited Word report downloads.
* **CeremonyWallet-Inspired Checkout Experience**:
  * Real-time validation for Ugandan MTN prefixes (`077`, `078`, `076`, `039`).
  * One-tap quick amount buttons (`UGX 50,000`, `UGX 85,000`, `UGX 100,000`, `UGX 200,000`).
  * Direct payment endpoint received under **Medicast AI** via **Lameck Opio (`0778543120`)**.
  * Animated USSD radar pulse with instant mobile 1-tap dialer (`tel:*165*...#`) and automated transaction receipts.
* **Firm, Stable Layout**: Strict vertical scrolling architecture engineered with zero horizontal layout wobble.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Radix UI Primitives, KaTeX, Supabase JS |
| **Inference Backend** | FastAPI (Python 3.10+), Uvicorn, LiteLLM, Groq Vision, Gemini 2.0 Flash, Pillow, AsyncPG, Redis |
| **Payment Gateway** | MTN Mobile Money Uganda (Direct API / Flutterwave MoMo Collection) |
| **Storage & Database**| Supabase PostgreSQL, Supabase Storage (Surgical Videos Bucket) |
| **Deployment** | Render Cloud (`render.yaml` Blueprint for frontend static web + backend API) |

---

## 📂 Project Structure

```
medicast/
├── inference_server/                # FastAPI Python AI Inference & Payment Server
│   ├── app/
│   │   ├── ai_assistant.py          # Multimodal Surgical Assistant Router
│   │   ├── analyze.py               # Frame & Video Vision Analysis Engine
│   │   ├── database.py              # PostgreSQL database & session persistence
│   │   ├── inference.py             # Groq / Gemini / LiteLLM Provider Chain
│   │   ├── main.py                  # FastAPI Application Entrypoint & CORS
│   │   ├── payment.py               # MTN Mobile Money USSD Push & Verification API
│   │   ├── telemetry.py             # Intraoperative Telemetry & Kinematics
│   │   └── websocket.py             # Real-time OR WebSocket Streaming
│   ├── requirements.txt             # Python Dependencies
│   └── .env.example                 # Backend Environment Template
│
├── medi-cast-ai/                    # React 18 Single-Page Application
│   ├── src/
│   │   ├── api/
│   │   │   ├── aiService.js         # Client-side AI Vision & Fallback Engine
│   │   │   └── supabaseClient.js    # Supabase Auth, DB & Storage Client
│   │   ├── components/
│   │   │   ├── layout/AppLayout.jsx # Firm Shell Navigation & Left Sidebar
│   │   │   ├── subscription/        # MTN Mobile Money Modal & Receipts
│   │   │   └── ui/                  # Accessible Design System Components
│   │   ├── lib/
│   │   │   ├── SubscriptionContext  # Global Usage & Quota State Management
│   │   │   └── subscriptionPlans.js # UGX Tiers & Official Payment Config
│   │   ├── pages/
│   │   │   ├── Analyses.jsx         # Case Registry & Filter Table
│   │   │   ├── AnalysisDetail.jsx   # Phase Timeline, Hazards & Word Export
│   │   │   ├── Assistant.jsx        # Multi-turn Clinical Chatbot
│   │   │   ├── Compare.jsx          # Side-by-side Case Delta Studio
│   │   │   ├── Dashboard.jsx        # Surgeon Performance Analytics
│   │   │   ├── LiveSurgery.jsx      # Intraoperative PC Camera Vision & HUD
│   │   │   ├── Subscription.jsx     # UGX Tier Cards & Quota Meters
│   │   │   └── UploadVideo.jsx      # Video Upload & Ingestion
│   │   ├── index.css                # Global Viewport Locks & Design Tokens
│   │   └── App.jsx                  # React Router Route Definitions
│   ├── package.json
│   └── vite.config.js
│
├── render.yaml                      # Render Infrastructure-as-Code Blueprint
└── README.md                        # Documentation
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: v3.10 or higher
* **Git**

### 2. Frontend Setup (`medi-cast-ai`)
```bash
cd medi-cast-ai
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Backend Setup (`inference_server`)
```bash
cd inference_server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt

# Create your .env file
cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be accessible at `http://localhost:8000/docs`.

---

## 🔐 Environment Variables

### Frontend (`medi-cast-ai/.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=gsk_your_groq_api_key
VITE_API_URL=https://medicast-backend.onrender.com
```

### Backend (`inference_server/.env`)
```env
PORT=8000
GROQ_API_KEY=gsk_your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key

# MTN Mobile Money Collection Gateway
FLW_SECRET_KEY=FLWSECK_your_flutterwave_secret_key
# or MTN MoMo Developer API
MTN_MOMO_SUBSCRIPTION_KEY=your_momo_primary_key
MTN_MOMO_API_USER=your_momo_api_user_uuid
MTN_MOMO_API_KEY=your_momo_api_key
MTN_MOMO_TARGET_ENV=live
```

---

## 💳 Official Payment Account

All official MediCast AI subscriptions in Uganda are processed via MTN Mobile Money:
* **Account Name**: `Medicast AI`
* **Receiving Representative**: `Lameck Opio`
* **Official Mobile Money Number**: `0778543120` (`+256 778 543 120`)
* **USSD Quick Dial**: `*165*1*1*0778543120#`

---

## 👨‍⚕️ Author & Leadership

* **Lead Developer & Clinical Lead**: **Lameck Opio**
* **Repository**: [https://github.com/OpioLamecky/MediCast-AI](https://github.com/OpioLamecky/MediCast-AI)
* **Application**: [https://medicast-ai-surgical-inteligence2.onrender.com](https://medicast-ai-surgical-inteligence2.onrender.com)

---

## 📄 License

This project is licensed under the MIT License — see the LICENSE file for details.
