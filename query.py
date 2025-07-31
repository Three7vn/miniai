from pinecone import Pinecone
import os
from dotenv import load_dotenv
import time
from tqdm import tqdm

load_dotenv()

PINECONE_API_KEY=os.getenv("PINECONE_API_KEY")
PINECONE_ENVIRONMENT="us-east-1"

# Initialize Pinecone client
pc = Pinecone(api_key=PINECONE_API_KEY)

print("Pinecone client initialized successfully!")
print(f"Available indexes: {[idx.name for idx in pc.list_indexes()]}")

# Create index if it doesn't exist
index_name = "miniai"
dense_index = pc.Index(index_name)

def get_info(query, top_k = 10):
    # Search the dense index and rerank results
    results = dense_index.search(
        namespace="data",
        query={
            "top_k": top_k,
            "inputs": {
                'text': query
            }
        }
    )

    # Print the results
    for hit in results['result']['hits']:
            print(f"id: {hit['_id']:<5} | score: {round(hit['_score'], 2):<5} | text: {hit['fields']['memory']:<50}")
            
query = "I went to the store and some groceries."
(get_info(query, top_k = 10))