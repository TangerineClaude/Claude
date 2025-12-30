# Cloud Docs Vault - AI-Readable Document Store

## Overview
Secure document vault where AI can read and learn from your docs for Q&A, summaries, and insights.

## Outcome
Upload PDFs, notes, and documents once. Ask questions, get summaries, and extract insights - all with proper citations.

## MVP Features

### Core Functionality
- **Document Upload**: PDFs, DOCX, TXT, MD, images
- **Intelligent Chunking**: Smart document splitting for AI processing
- **Vector Search**: Semantic search across all documents
- **AI Q&A**: Ask questions about your documents
- **Summarization**: Generate summaries of any document
- **Citations**: Always provide source references
- **Organization**: Folders, tags, collections
- **Access Control**: Private, shared, or team access

### Privacy & Security
- End-to-end encryption for stored documents
- Zero-trust architecture
- No document content used for model training
- Granular access permissions
- Audit logs for all access
- Data retention policies

## Tech Stack

### Frontend
- **Web App**: React/TypeScript with Next.js
- **File Upload**: React Dropzone
- **PDF Viewer**: PDF.js or react-pdf
- **UI**: TailwindCSS + shadcn/ui

### Backend
- **API**: Python/FastAPI
- **Storage**: S3-compatible object storage
- **Database**: PostgreSQL for metadata
- **Vector Store**: Pinecone, Qdrant, or Weaviate
- **Queue**: Celery + Redis for processing

### AI/ML
- **Embeddings**: OpenAI embeddings or sentence-transformers
- **Q&A**: Claude API or GPT-4
- **OCR**: Tesseract or Cloud Vision for images
- **Chunking**: LangChain or custom chunking logic

## Architecture

```
┌─────────────────────┐
│    Web Client       │
│  (Upload & Query)   │
└──────────┬──────────┘
           │
      ┌────▼─────┐
      │   API    │
      │ (FastAPI)│
      └────┬─────┘
           │
    ┌──────┴──────┐
    │             │
┌───▼────┐   ┌───▼────┐
│Document│   │ Vector │
│ Store  │   │ Store  │
│  (S3)  │   │(Pinecone)
└───┬────┘   └───┬────┘
    │            │
    └─────┬──────┘
          │
     ┌────▼────┐
     │ Claude  │
     │   API   │
     └─────────┘
```

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- S3-compatible storage (AWS S3, MinIO, etc.)
- Vector database (Pinecone, Qdrant, etc.)

### Installation

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Configure .env with credentials

# Database setup
alembic upgrade head

# Start services
docker-compose up -d  # Postgres, Redis, MinIO (optional)
celery -A worker worker --loglevel=info &
python main.py

# Frontend
cd ../frontend
npm install
npm run dev
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/docs_vault
REDIS_URL=redis://localhost:6379

# Object Storage
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=docs-vault
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Vector Store
PINECONE_API_KEY=your_api_key
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=docs-vault

# AI
ANTHROPIC_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key  # for embeddings

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Features
MAX_FILE_SIZE_MB=100
ALLOWED_FILE_TYPES=pdf,docx,txt,md,png,jpg
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/download` - Download original
- `POST /api/documents/:id/reprocess` - Reprocess document

### AI Operations
- `POST /api/ask` - Ask question about documents
- `POST /api/summarize/:id` - Summarize document
- `POST /api/search` - Semantic search across documents
- `POST /api/chat` - Chat with documents

### Organization
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `POST /api/documents/:id/move` - Move to folder
- `GET /api/tags` - List tags
- `POST /api/documents/:id/tag` - Add tags

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size BIGINT,
  storage_key VARCHAR(255),  -- S3 key
  encryption_iv BYTEA,  -- For E2E encryption
  status VARCHAR(20),  -- uploading, processing, ready, error
  page_count INTEGER,
  word_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chunks (for vector search)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  chunk_index INTEGER,
  content TEXT,
  page_number INTEGER,
  embedding_id VARCHAR(255),  -- Pinecone vector ID
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Folders
CREATE TABLE folders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  parent_folder_id UUID REFERENCES folders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document Folders (many-to-many)
CREATE TABLE document_folders (
  document_id UUID REFERENCES documents(id),
  folder_id UUID REFERENCES folders(id),
  PRIMARY KEY (document_id, folder_id)
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(100) UNIQUE,
  color VARCHAR(7)  -- hex color
);

-- Document Tags
CREATE TABLE document_tags (
  document_id UUID REFERENCES documents(id),
  tag_id UUID REFERENCES tags(id),
  PRIMARY KEY (document_id, tag_id)
);

-- Query History (for analytics)
CREATE TABLE queries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  query TEXT,
  documents_searched UUID[],
  response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Document Processing Pipeline

```python
# document_processor.py
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import PyPDFLoader
import openai

class DocumentProcessor:
    def __init__(self):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    async def process_document(self, document_id: str, file_path: str):
        # Step 1: Extract text
        if file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
            pages = loader.load_and_split()
            text = "\n\n".join([page.page_content for page in pages])
        elif file_path.endswith('.txt') or file_path.endswith('.md'):
            with open(file_path, 'r') as f:
                text = f.read()
        else:
            raise ValueError(f"Unsupported file type: {file_path}")

        # Step 2: Chunk text
        chunks = self.text_splitter.split_text(text)

        # Step 3: Generate embeddings
        embeddings = await self.generate_embeddings(chunks)

        # Step 4: Store in vector database
        await self.store_embeddings(document_id, chunks, embeddings)

        return len(chunks)

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        # Using OpenAI embeddings
        response = openai.Embedding.create(
            model="text-embedding-ada-002",
            input=texts
        )
        return [item['embedding'] for item in response['data']]

    async def store_embeddings(self, document_id: str, chunks: list[str], embeddings: list):
        # Store in Pinecone or other vector DB
        vectors = [
            {
                "id": f"{document_id}_{i}",
                "values": embedding,
                "metadata": {
                    "document_id": document_id,
                    "chunk_index": i,
                    "content": chunk
                }
            }
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        pinecone.Index("docs-vault").upsert(vectors)
```

## AI Q&A Implementation

```python
# qa_service.py
from anthropic import Anthropic

class QAService:
    def __init__(self):
        self.client = Anthropic()

    async def ask_question(self, question: str, document_ids: list[str] = None):
        # Step 1: Search for relevant chunks
        query_embedding = await generate_embedding(question)
        results = search_vector_db(query_embedding, document_ids=document_ids, top_k=5)

        # Step 2: Build context from chunks
        context = "\n\n---\n\n".join([
            f"[Document: {r['metadata']['filename']}, Page: {r['metadata']['page']}]\n{r['content']}"
            for r in results
        ])

        # Step 3: Generate answer with Claude
        prompt = f"""Based on the following document excerpts, answer the user's question.
Always cite the source document and page number for your answer.

Context:
{context}

Question: {question}

Provide a detailed answer with citations."""

        response = self.client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        return {
            "answer": response.content[0].text,
            "sources": [
                {
                    "document_id": r['metadata']['document_id'],
                    "page": r['metadata']['page'],
                    "excerpt": r['content'][:200]
                }
                for r in results
            ]
        }
```

## Features

### 1. Smart Chunking
- Respect paragraph boundaries
- Keep code blocks together
- Preserve tables and lists
- Maintain context across chunks

### 2. Semantic Search
```python
# Example search
results = await search_documents(
    query="What are the privacy requirements?",
    filters={"tags": ["compliance", "legal"]},
    top_k=10
)
```

### 3. Document Summarization
```python
# Example summarization
summary = await summarize_document(
    document_id="doc-123",
    summary_type="executive",  # executive, detailed, bullet
    max_length=500
)
```

### 4. Multi-Document Chat
```python
# Example chat
chat_response = await chat_with_documents(
    messages=[
        {"role": "user", "content": "What do all these documents say about security?"}
    ],
    document_ids=["doc-1", "doc-2", "doc-3"]
)
```

## Security Features

1. **End-to-End Encryption**: Documents encrypted before upload
2. **Access Control**: Role-based permissions (owner, editor, viewer)
3. **Audit Logs**: Track all document access and queries
4. **Data Retention**: Auto-delete after specified period
5. **Secure Sharing**: Time-limited share links

## Testing

```bash
# Backend tests
pytest tests/

# Test document processing
pytest tests/test_document_processor.py

# Test vector search accuracy
pytest tests/test_search_accuracy.py
```

## Deployment

### Backend
- **Platform**: AWS ECS, Google Cloud Run, or Fly.io
- **Storage**: AWS S3, Google Cloud Storage, or Wasabi
- **Vector DB**: Pinecone Cloud, Qdrant Cloud
- **Database**: AWS RDS or Supabase

### Frontend
- **Hosting**: Vercel or Netlify

## Roadmap

### Phase 1 (MVP) - 8 weeks
- [x] Document upload (PDF, TXT, MD)
- [x] Vector search
- [x] Basic Q&A
- [x] Simple summarization
- [x] Web UI

### Phase 2 - 12 weeks
- [ ] Multi-document chat
- [ ] Advanced organization (folders, tags)
- [ ] Shared documents
- [ ] Mobile app
- [ ] OCR for images

### Phase 3 - 16 weeks
- [ ] DOCX, PPTX support
- [ ] Collaborative annotations
- [ ] API for third-party apps
- [ ] Slack/Teams integration
- [ ] Advanced analytics

## License

Proprietary - All rights reserved

---

**Status**: 🚧 In Development
**Target Launch**: Q3 2025
