import { OpenAIEmbeddings } from '@langchain/openai';
import {
  MongoDBAtlasVectorSearch,
  MongoDBAtlasVectorSearchLibArgs,
} from '@langchain/community/vectorstores/mongodb_atlas';
import { Collection, MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let embeddingsInstance: OpenAIEmbeddings | null = null;
let cachedClient: MongoClient | null = null;
let cachedCollection: Collection | null = null;

const DEFAULT_NAMESPACE = 'chatter.training_data';
const namespace = process.env.MONGODB_NAMESPACE ?? DEFAULT_NAMESPACE;
const [dbName, collectionName] = namespace.split('.');

export const getMongoClient = (): MongoClient => {
  if (cachedClient) {
    return cachedClient;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'Missing MONGODB_URI environment variable. Set it locally in .env or in your Vercel project settings.',
    );
  }

  cachedClient = new MongoClient(uri);
  return cachedClient;
};

export const getCollection = (): Collection => {
  if (cachedCollection) {
    return cachedCollection;
  }

  const client = getMongoClient();
  cachedCollection = client.db(dbName).collection(collectionName);

  return cachedCollection;
};

export function getEmbeddingsTransformer(openAiApiKey?: string): OpenAIEmbeddings {
  if (openAiApiKey) {
    return new OpenAIEmbeddings({ openAIApiKey: openAiApiKey });
  }

  if (!embeddingsInstance) {
    embeddingsInstance = new OpenAIEmbeddings();
  }

  return embeddingsInstance;
}

export function vectorStore(openAiApiKey?: string): MongoDBAtlasVectorSearch {
  return new MongoDBAtlasVectorSearch(getEmbeddingsTransformer(openAiApiKey), searchArgs());
}

export function searchArgs(): MongoDBAtlasVectorSearchLibArgs {
  const collection = getCollection();

  return {
    collection,
    indexName: 'vector_index',
    textKey: 'text',
    embeddingKey: 'text_embedding',
  };
}
