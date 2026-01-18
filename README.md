# AskDocs: AI-Powered Document Intelligence

**AskDocs** is a high-performance Retrieval-Augmented Generation (RAG) system that allows users to chat with their PDF documents. By combining the speed of **Groq** with the precision of **Google Gemini Embeddings**, it transforms static text into an interactive knowledge base.

---

# Working


https://github.com/user-attachments/assets/5fee58ca-2ffa-45d4-8b4f-7537375e1980

<img width="960" height="504" alt="pinecone" src="https://github.com/user-attachments/assets/e7eab3cc-246a-4050-8e8d-338c8ec72488" />


## 🚀 The AI Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **LLM Inference** | **Llama 3.3 (via Groq)** | Sub-second response generation. |
| **Embeddings** | **Google Gemini (text-004)** | High-dimensional semantic vectorization. |
| **Vector Store** | **Pinecone** | Serverless vector indexing and retrieval. |
| **Framework** | **LangChain** | Document orchestration and chunking. |
| **Backend** | **Node.js / Express** | Stateless API with automated file cleanup. |

---

## ✨ Key Features

* **Intelligent Chunking:** Utilizes `RecursiveCharacterTextSplitter` (850-character chunks) to maintain semantic context.
* **Context-Aware Chat:** Rephrases user queries into standalone search terms for optimized vector matching.
* **Strict "Expert Teacher" Persona:** Ensures answers are grounded **only** in provided documents to prevent hallucinations.
* **Automated Resource Management:** Real-time cleanup of temporary `/uploads` directory to ensure efficient memory usage.
* **Security & Limits:** Implemented duplicate file detection and a hard limit of 5 documents per session.

---

## 🛠️ Installation & Setup

### **Prerequisites**
- Node.js installed on your machine.
- API Keys for **Groq**, **Pinecone**, and **Google Gemini**.

### **1. Clone and Install**
```bash
git clone [https://https://github.com/Gol0DRoger/AskDocs.git](https://github.com/Gol0DRoger/AskDocs)
cd AskDocs
npm install
```

### **2. Create .env file with reference from .env.example**

### **3. Run the project in backend directory**
```
npm start
```
Access the system at http://localhost:3000
