from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from pinecone import Pinecone
import dotenv
import uuid

# Load environment variables
dotenv.load_dotenv()
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT = "us-east-1"
INDEX_NAME = os.getenv("INDEX_NAME")

# Ensure API key exists
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY is not set in .env")

# Initialize Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)

# Create index if it doesn't exist
if not pc.has_index(INDEX_NAME):
    pc.create_index_for_model(
        name=INDEX_NAME,
        cloud="aws",
        region=PINECONE_ENVIRONMENT,
        embed={
            "model": "llama-text-embed-v2",
            "field_map": {"text": "memory"}
        }
    )

# Connect to the index
dense_index = pc.Index(INDEX_NAME)

# FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Request model
class EmbedRequest(BaseModel):
    id: str
    text: str
    timestamp: str

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.post("/embed")
def embed(request: EmbedRequest):
    try:
        # Generate a random UUID for the record
        random_id = str(uuid.uuid4())
        
        data = {
            "id": random_id,  # Use random UUID instead of request.id
            "memory": request.text,
            "timestamp": request.timestamp
        }
        dense_index.upsert_records(
            records=[data],
            namespace="data"
        )
        return {"message": f"Record with ID '{random_id}' upserted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run locally
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
