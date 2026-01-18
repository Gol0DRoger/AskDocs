import express from 'express';
import multer from 'multer';
import cors from 'cors';
import * as dotenv from 'dotenv';
import fs from 'fs';
import { Pinecone } from '@pinecone-database/pinecone';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });// Temp folder for uploads

app.use(cors()); // Allow website to talk to backend
app.use(express.json());

// INITIALIZATION
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const pinecone = new Pinecone();
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: 'text-embedding-004',
});

//HARD LIMIT
//We keep track of files uploaded
let uploadedSourceNames = new Set();
const MAX_FILES_ALLOWED = 5;

//UPLOAD ROUTE ---
app.post('/upload', upload.array('files'), async (req, res) => {
    try {
        //Validation
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded." });
        }

        //Check Hard Limit - 5 
        if (uploadedSourceNames.size + req.files.length > MAX_FILES_ALLOWED) {
            return res.status(403).json({ 
                error: `Limit reached! You can only have ${MAX_FILES_ALLOWED} files total. You already have ${uploadedSourceNames.size}.` 
            });
        }

        console.log(`Processing ${req.files.length} files...`);
        let totalChunks = 0;

        //Loop through files
        for (const file of req.files) {
            //Check for duplicates
            if (uploadedSourceNames.has(file.originalname)) {
                fs.unlinkSync(file.path); //Delete temp file
                continue; //Skip processing
            }

            const loader = new PDFLoader(file.path);
            const rawDocs = await loader.load();

            //CUSTOM METADATA (Source Only)
            //We map over docs and force the metadata to ONLY contain the source name
            const cleanDocs = rawDocs.map(doc => {
                doc.metadata = { source: file.originalname }; 
                return doc;
            });

            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 850,
                chunkOverlap: 150,
            });
            const chunkedDocs = await textSplitter.splitDocuments(cleanDocs);

            //Upload to Pinecone
            await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
                pineconeIndex,
                maxConcurrency: 5,
            });

            uploadedSourceNames.add(file.originalname);
            totalChunks += chunkedDocs.length;
            fs.unlinkSync(file.path); // Cleanup temp file
        }

        res.json({ 
            success: true, 
            message: `Successfully added. Total files in knowledge base: ${uploadedSourceNames.size}/${MAX_FILES_ALLOWED}`,
            fileCount: uploadedSourceNames.size
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
});

//CHAT ROUTE
let History = []; 

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (History.length > 8) History = History.slice(-8);

        //Rephrase for Search
        const rephraseSystem = { role: 'system', content: "Rephrase user input into a standalone search query. Output ONLY the query." };
        const queryResponse = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [rephraseSystem, ...History, { role: 'user', content: message }],
            temperature: 0, 
        });
        const standaloneQuery = queryResponse.choices[0].message.content;

        //Search Pinecone
        const queryVector = await embeddings.embedQuery(standaloneQuery);
        const searchResults = await pineconeIndex.query({
            topK: 5,
            vector: queryVector,
            includeMetadata: true,
        });

        //Build Context (Source Only)
        const context = searchResults.matches.map(m => 
            `[Source: ${m.metadata.source}]\n${m.metadata.text}`
        ).join("\n\n---\n\n");

        //Generate Answer
        History.push({ role: 'user', content: message });
        
        const systemPrompt = {
            role: "system",
            content: `You have to behave like an Expert Teacher.
            You will be given a context of relevant information and a user question.
            Your task is to answer the user's question based ONLY on the provided context.
            If the answer is not in the context, you must say "I could not find the answer in the provided document."
            Keep your answers clear, concise, and educational.
            
            <context>${context}</context>`
        };

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [systemPrompt, ...History],
        });

        const reply = completion.choices[0].message.content;
        History.push({ role: 'assistant', content: reply });

        res.json({ reply });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/clear-index', async (req, res) => {
    try {
        console.log("Wiping database..");
       //main ->
        await pineconeIndex.deleteAll();
        
        //Clear local memory
        uploadedSourceNames.clear();
        
        res.json({ message: "Database completely cleared. You can now upload fresh files." });
    } catch (error) {
        console.error("Clear Error:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));