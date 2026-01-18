// --- DOM ELEMENTS ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const statusMsg = document.getElementById('statusMsg');
const chatContainer = document.getElementById('chatContainer');
const chatForm = document.getElementById('chatForm');

//STATE
let selectedFiles = [];
const MAX_LIMIT = 5;

//DRAG & DROP HANDLERS
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => { 
    e.preventDefault(); 
    dropZone.classList.add('bg-gray-700', 'border-emerald-500'); 
});

dropZone.addEventListener('dragleave', () => { 
    dropZone.classList.remove('bg-gray-700', 'border-emerald-500'); 
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('bg-gray-700', 'border-emerald-500');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

//FILE HANDLING LOGIC
function handleFiles(files) {
    const newFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    
    // Check limit immediately on selection
    if (selectedFiles.length + newFiles.length > MAX_LIMIT) {
        alert(`You can only select ${MAX_LIMIT} files total.`);
        return;
    }

    selectedFiles = [...selectedFiles, ...newFiles];
    renderFileList();
}

function renderFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center bg-gray-700 p-3 rounded-lg border border-gray-600';
        div.innerHTML = `
            <div class="flex items-center gap-2 overflow-hidden">
                <i class="fa-regular fa-file-pdf text-red-400"></i>
                <span class="text-sm text-gray-200 truncate">${file.name}</span>
            </div>
            <button onclick="removeFile(${index})" class="text-gray-400 hover:text-red-400"><i class="fa-solid fa-xmark"></i></button>
        `;
        fileList.appendChild(div);
    });
}

//Global function for the onclick event in HTML
window.removeFile = (index) => {
    selectedFiles.splice(index, 1);
    renderFileList();
};

//UPLOAD TO BACKEND
uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    statusMsg.textContent = "Reading & Embedding... Please wait.";
    statusMsg.className = "text-xs text-center mt-3 text-yellow-400";

    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('files', file));

    try {
        const res = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            statusMsg.textContent = "Success! " + data.message;
            statusMsg.className = "text-xs text-center mt-3 text-emerald-400";
            selectedFiles = []; // Clear list after successful upload
            renderFileList();
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        statusMsg.textContent = "Error: " + err.message;
        statusMsg.className = "text-xs text-center mt-3 text-red-400";
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Process Files";
    }
});

//CHAT
function appendMessage(text, isUser) {
    const div = document.createElement('div');
    div.className = `flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`;
    
    div.innerHTML = `
        <div class="w-10 h-10 rounded-full ${isUser ? 'bg-blue-600' : 'bg-emerald-600'} flex items-center justify-center shrink-0">
            <i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'}"></i>
        </div>
        <div class="${isUser ? 'bg-blue-700' : 'bg-gray-800 border border-gray-700'} p-4 rounded-2xl ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'} max-w-2xl shadow-md">
            <p class="text-gray-200 leading-relaxed">${text.replace(/\n/g, '<br>')}</p>
        </div>
    `;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('userMessage');
    const message = input.value.trim();
    if (!message) return;

    appendMessage(message, true);
    input.value = '';

    //Add loading bubble
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingBubble';
    loadingDiv.className = "flex items-start gap-4";
    loadingDiv.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0"><i class="fa-solid fa-robot"></i></div>
        <div class="bg-gray-800 p-4 rounded-2xl rounded-tl-none border border-gray-700"><p class="text-gray-400 animate-pulse">Thinking..</p></div>
    `;
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const res = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        
        document.getElementById('loadingBubble').remove();
        
        if (data.error) {
            appendMessage("Error: " + data.error, false);
        } else {
            appendMessage(data.reply, false);
        }
    } catch (err) {
        document.getElementById('loadingBubble').remove();
        appendMessage("Server connection failed.", false);
    }
});

//existing code
const clearBtn = document.getElementById('clearBtn'); // Add this to top selectors

//existing code

//CLEAR DATABASE
clearBtn.addEventListener('click', async () => {
    if (!confirm("Are you sure? This will delete ALL embeddings from Pinecone. This cannot be undone.")) {
        return;
    }

    clearBtn.disabled = true;
    clearBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Wiping...';

    try {
        const res = await fetch('http://localhost:3000/clear-index', {
            method: 'DELETE'
        });
        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            //Reset Frontend State
            selectedFiles = [];
            renderFileList();
            statusMsg.textContent = "Database cleared. Ready for new files.";
            statusMsg.className = "text-xs text-center mt-3 text-gray-500";
        } else {
            throw new Error(data.error);
        }
    } catch (err) {
        alert("Error clearing database: " + err.message);
    } finally {
        clearBtn.disabled = false;
        clearBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Reset Database';
    }
});