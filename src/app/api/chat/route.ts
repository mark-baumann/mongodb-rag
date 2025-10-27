import { StreamingTextResponse, LangChainStream, Message } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';

import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { vectorStore } from '@/utils/openai';
import { NextResponse } from 'next/server';
import { BufferMemory } from "langchain/memory";


export async function POST(req: Request) {
    try {
        const { stream, handlers } = LangChainStream();
        const body = await req.json();
        const messages: Message[] = body.messages ?? [];
        const question = messages[messages.length - 1]?.content ?? '';
        const documentId: string | undefined = body.documentId;

        if (!question) {
            return NextResponse.json({ message: 'No question provided' }, { status: 400 });
        }

        const model = new ChatOpenAI({
            temperature: 0.8,
            streaming: true,
            callbacks: [handlers],
        });

        const retrieverFields: any = {
            searchType: 'mmr',
            searchKwargs: { fetchK: 10, lambda: 0.25 },
        };
        if (documentId) {
            // Restrict retrieval to the selected document via metadata preFilter
            retrieverFields.filter = { preFilter: { documentId } };
        }

        const retriever = vectorStore().asRetriever(retrieverFields);

        const conversationChain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
            memory: new BufferMemory({
              memoryKey: "chat_history",
            }),
        });

        conversationChain.invoke({
            question,
        });

        return new StreamingTextResponse(stream);
    }
    catch (e) {
        return NextResponse.json({ message: 'Error Processing' }, { status: 500 });
    }
}
