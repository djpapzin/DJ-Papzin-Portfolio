import os
import json
import numpy as np
from fastembed import TextEmbedding
from sklearn.metrics.pairwise import cosine_similarity

# This function will be deployed as a Netlify Function. It expects the 
# embeddings and chunk metadata to be pre-generated and available in 
# its deployment directory.

# Initialize global variables to hold the loaded index data
embeddings_matrix = None
chunks_metadata = None
text_chunks = None
embedding_model = None

def load_vector_index():
    global embeddings_matrix, chunks_metadata, text_chunks, embedding_model

    if embeddings_matrix is not None and chunks_metadata is not None and text_chunks is not None and embedding_model is not None:
        return # Already loaded

    # Netlify Functions typically have their files in the same directory as the function handler
    function_dir = os.path.dirname(__file__)

    embeddings_path = os.path.join(function_dir, "embeddings.npy")
    chunks_metadata_path = os.path.join(function_dir, "chunks.json")
    text_chunks_path = os.path.join(function_dir, "texts.json")

    try:
        embeddings_matrix = np.load(embeddings_path)
        with open(chunks_metadata_path, "r") as f:
            chunks_metadata = json.load(f)
        with open(text_chunks_path, "r") as f:
            text_chunks = json.load(f)
        embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        print("Vector index loaded successfully.")
    except Exception as e:
        print(f"Error loading vector index: {e}")
        embeddings_matrix = None
        chunks_metadata = None
        text_chunks = None
        embedding_model = None
        raise RuntimeError(f"Failed to load vector index: {e}")

def search_vectors(query_text: str, top_k: int = 5) -> list:
    load_vector_index() # Ensure index is loaded

    if embedding_model is None or embeddings_matrix is None or chunks_metadata is None or text_chunks is None:
        return []

    # Embed the query
    query_embedding = list(embedding_model.embed([query_text]))[0]
    query_embedding = np.array(query_embedding, dtype=np.float32).reshape(1, -1)
    query_embedding = query_embedding / np.linalg.norm(query_embedding)

    # Calculate cosine similarity
    similarities = cosine_similarity(query_embedding, embeddings_matrix)[0]

    # Get top_k results
    top_indices = np.argsort(similarities)[::-1][:top_k]

    results = []
    for idx in top_indices:
        chunk_meta = chunks_metadata[idx]
        original_text = text_chunks[chunk_meta["original_text_index"]]
        results.append({
            "repo": chunk_meta["repo"],
            "file": chunk_meta["file"],
            "content": original_text,
            "score": float(similarities[idx]) # Convert numpy float to Python float for JSON serialization
        })
    return results

def handler(event, context):
    # Netlify function entry point
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            'body': '',
        }

    if event['httpMethod'] != 'POST':
        return {
            'statusCode': 405,
            'body': json.dumps({'error': 'Method Not Allowed'})
        }

    try:
        body = json.loads(event['body'])
        query = body.get('query')
        if not query:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Query parameter is required'})
            }
        
        search_results = search_vectors(query)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'results': search_results
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e), 'detail': 'Internal Server Error'})
        }


