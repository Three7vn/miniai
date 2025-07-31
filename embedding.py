'''
This script will:
- upsert the users memories from Memory Bank
- retrieve the top 5 most relevant memories in AI conversation.
'''

from pinecone import Pinecone
import os
from dotenv import load_dotenv
import time
from tqdm import tqdm

load_dotenv()

data = {
  "id": "1753986909103",
  "memory": "This is a test",
  "timestamp": "2025-07-31T18:35:09.103Z"
}

PINECONE_API_KEY=os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT="us-east-1"

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

print("Pinecone client initialized successfully!")
print(f"Available indexes: {[idx.name for idx in pc.list_indexes()]}")

# Create index if it doesn't exist
index_name = "miniai"
if not pc.has_index(index_name):
    pc.create_index_for_model(
        name=index_name,
        cloud="aws",
        region="us-east-1",
        embed={
            "model":"llama-text-embed-v2",
            "field_map":{"text": "memory"}
        }
    )

dense_index = pc.Index(index_name)

dense_index.upsert_records(
    records=[data],
    namespace="data"
)

stats = dense_index.describe_index_stats()
print("Index stats:", stats)