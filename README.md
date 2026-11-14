# 🧾 Receipt Extractor — Local Multimodal AI

A privacy-first, full-stack receipt and invoice information extraction system powered by a local Vision-Language Model (**Qwen2.5-VL / Qwen3-VL** via **Ollama**), an asynchronous **Django REST Framework** backend, and a modern **React (Vite)** chat interface.

---

## 📌 Project Overview

**Receipt Extractor** transforms unstructured receipt scans and camera snapshots into clean, structured, and validated JSON data. Built completely on a local inference stack, no receipt data or private financial documents ever leave your machine.

Users can attach receipt images (or paste screenshots directly via clipboard), type optional instructions (e.g., *"focus on tax details"* or *"extract tip"*), and receive structured JSON extraction alongside real-time token performance metrics.

---

## 🎯 Learning Objectives & Motivation

This project was built from scratch as an end-to-end full-stack and local AI engineering learning journey:

1. **Django & DRF Foundations**:
   - Understanding Django’s architectural mental model: distinguishing between the global **Project** (`core`) and domain-specific **Apps** (`extractor`).
   - Implementing Django REST Framework API views with `@api_view` decorators and custom parsers (`MultiPartParser`, `FormParser`).
   - Mastering Django URL routing hierarchies, trailing slash conventions, and route resolution.
   - Configuring middleware pipelines and securing Cross-Origin Resource Sharing (`django-cors-headers`).

2. **Multimodal Local LLMs with Ollama**:
   - Communicating with local Vision-Language Models (VLMs) via Ollama’s HTTP REST API (`/api/generate`).
   - Managing multimodal payloads: converting uploaded binary files into UTF-8 Base64 string representations.
   - Constraining LLM output spaces using Ollama’s `"format": "json"` mode to eliminate conversational chatter and guarantee parseable outputs.
   - Profiling inference cost and efficiency by tracking prompt evaluation tokens (`prompt_eval_count`) and generated response tokens (`eval_count`).

3. **Modern Frontend Engineering**:
   - Building a responsive, paper-inspired cream/white UI in React 19 and Vite.
   - Handling binary file inputs, drag-and-drop, and native clipboard image paste events (`Cmd + V` / `Ctrl + V`).
   - Implementing interactive UI elements: click-to-expand image lightbox modal, one-click clipboard copying, and live token metrics badges.

---

## 📊 Dataset & Feature Design: SROIE Benchmark

The target feature schema is inspired by the **ICDAR 2019 Robust Reading Challenge on Scanned Receipts Information Extraction (SROIE)**:
- **Benchmark Reference**: [ICDAR 2019 SROIE Challenge](https://rrc.cvc.uab.es/?ch=13)

The SROIE dataset evaluates models on extracting key fields from real-world scanned receipts with variations in rotation, print quality, wrinkles, and complex layouts. We used this benchmark to define our foundational data schema:

* **Merchant / Company Name** (`merchant`)
* **Transaction Date** (`date`)
* **Grand Total Amount** (`total_amount`)
* **Tax Breakdown** (`tax_amount`)
* **Currency Detection** (`currency`)
* **Itemized Line Items** (`items`: description, quantity, price)

---

## 🏗️ System Architecture

```
[ User Browser / Screenshot ]
              │
              ▼ (1. Multipart upload / Clipboard paste)
┌──────────────────────────────────────────────┐
│          React Frontend (Vite)               │
│  - Port: 5173                                │
│  - Warm cream aesthetic                      │
│  - Lightbox modal preview                    │
│  - One-click JSON copy & Token Badge         │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ (2. HTTP POST /api/extractor/extract/)
┌──────────────────────────────────────────────┐
│          Django Backend (DRF)                │
│  - Port: 8000                                │
│  - MultiPartParser binary ingestion          │
│  - Base64 image encoding                     │
│  - Dynamic prompt & instruction injection    │
│  - JSON response validation & error handling │
└──────────────────────┬───────────────────────┘
                       │
                       ▼ (3. HTTP POST /api/generate)
┌──────────────────────────────────────────────┐
│           Ollama Daemon                      │
│  - Port: 11434                               │
│  - Vision Model: qwen3-vl:4b                 │
│  - Constrained JSON sampling mode            │
│  - Token performance metrics tracking        │
└──────────────────────────────────────────────┘
```

---

## 🛡️ Validations & Gatekeeps

To ensure durability, security, and graceful failure handling, multiple guards are implemented at both layers:

### 1. Client-Side Gatekeeps (React)
- **MIME Type Validation**: Blocks non-image file uploads on selection (`file.type.startsWith('image/')`).
- **Empty State Prevention**: Disables send triggers if neither an image nor text is present.
- **Escape Key & Backdrop Listener**: Modal listeners cleanly destroy preview states without memory leaks.

### 2. Server-Side Gatekeeps (Django)
- **CORS Protection**: Whitelisted origin policies (`CORS_ALLOWED_ORIGINS`) allow only designated frontend hosts (`localhost:5173`, `127.0.0.1:5173`).
- **Multipart Form Parser**: Enforces `MultiPartParser` and `FormParser` to safely parse binary stream headers.
- **Input Integrity Check**: Verifies `'image'` exists in `request.FILES` before initiating compute; returns HTTP 400 with a descriptive error if missing.
- **Base64 Safety**: Encapsulates binary-to-string transformation inside isolated `try...except` blocks.
- **Constrained JSON Generation**: Forces Ollama into strict JSON mode (`"format": "json"`), preventing LLM preambles (e.g., *"Here is the JSON you requested:"*).
- **Two-Tier JSON Parsing Guard**:
  - Validates model output using `json.loads()`.
  - If output fails JSON validation, captures raw output and returns a structured fallback without crashing the server.
- **Connection & Timeout Guards**:
  - Implements a 60-second request timeout on Ollama calls to prevent worker starvation.
  - Catches `requests.exceptions.ConnectionError` and returns an HTTP 503 Service Unavailable alert if the Ollama daemon is offline.

---

## 🚀 Installation & Setup Guide

### Prerequisites
- **macOS / Linux / Windows**
- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Ollama**: [Download & Install Ollama](https://ollama.com/)

---

### Step 1: Start & Prepare Ollama

1. Pull the multimodal vision model:
   ```bash
   ollama pull qwen3-vl:4b
   ```
   *(Note: You can also use other vision models like `llama3.2-vision` or `llava` by changing `VISION_MODEL` in `server/extractor/views.py`).*

2. Start the Ollama server:
   ```bash
   ollama serve
   ```
   Verify it is running:
   ```bash
   curl http://localhost:11434/
   # Expected output: "Ollama is running"
   ```

---

### Step 2: Backend Setup (Django)

1. Open a new terminal and navigate to the `server/` directory:
   ```bash
   cd reciept-extractor/server
   ```

2. Create and activate a virtual environment:
   ```bash
   # Create virtual environment
   python3 -m venv .venv

   # Activate on macOS/Linux:
   source .venv/bin/activate

   # Activate on Windows:
   # .venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install django djangorestframework django-cors-headers requests
   ```

4. Verify settings and run migrations:
   ```bash
   python manage.py check
   python manage.py migrate
   ```

5. Start the Django development server:
   ```bash
   python manage.py runserver 8000
   ```
   Backend will be active at: `http://127.0.0.1:8000/`

---

### Step 3: Frontend Setup (React + Vite)

1. Open another terminal and navigate to the `frontend/` directory:
   ```bash
   cd reciept-extractor/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 💡 How to Use

1. **Attach Image**: Click the paperclip icon or simply take a screenshot and paste with **`Cmd + V`** / **`Ctrl + V`**.
2. **Preview Image**: Click on the thumbnail in the chat to open it full-screen in a lightbox popup.
3. **Add Instructions (Optional)**: Type any specific request in the input field (e.g. *"Check if tax is included"*).
4. **Extract**: Press **Enter** or click the send button.
5. **View Results**:
   - Review the extracted JSON directly in the chat.
   - Inspect token counts in the amber badge (`⚡ [Prompt] in / [Output] out`).
   - Click **Copy** to copy the clean JSON string to your clipboard.

---

## 🔮 Roadmap & Future Enhancements

- [ ] **Decoupled S3 / MinIO Storage**: Persist receipt images to an object store before processing to ensure zero data loss.
- [ ] **Batch Concurrency**: Process up to 20 files simultaneously using `OLLAMA_NUM_PARALLEL=3` and Python's `ThreadPoolExecutor`.
- [ ] **Export Options**: One-click export to CSV / Excel or direct synchronization into QuickBooks / Notion.
- [ ] **Database Persistence**: Store extraction history in SQLite / PostgreSQL with user authentication.

