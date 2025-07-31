// Global variables
let isRecording = false;
let recognition = null;
let transcripts = [];

// API base URL (for transcript storage only)
const API_BASE = 'http://localhost:5000/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSpeechRecognition();
    checkWhisperStatus();
    loadTranscripts();
    
    // Set up keyboard listener for chat
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', handleKeyPress);
    }
});

// Initialize Web Speech API
function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = function() {
            console.log('Speech recognition started');
        };
        
        recognition.onresult = function(event) {
            let finalTranscript = '';
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update status with interim results
            const voiceStatus = document.getElementById('voiceStatus');
            if (interimTranscript) {
                voiceStatus.textContent = `Listening: "${interimTranscript}"`;
            }
            
            // Store final transcript
            if (finalTranscript) {
                window.currentTranscript = finalTranscript.trim();
                voiceStatus.textContent = `Transcription complete: "${finalTranscript}"`;
                
                // Auto-save transcript
                if (finalTranscript.trim()) {
                    addTranscriptToUI(finalTranscript.trim());
                }
            }
        };
        
        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            const voiceStatus = document.getElementById('voiceStatus');
            voiceStatus.textContent = `Speech recognition error: ${event.error}`;
            isRecording = false;
            updateRecordingUI();
        };
        
        recognition.onend = function() {
            console.log('Speech recognition ended');
            isRecording = false;
            updateRecordingUI();
        };
    } else {
        console.error('Speech recognition not supported');
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) {
            voiceStatus.textContent = 'Speech recognition not supported in this browser';
        }
    }
}

// Voice Recording Functions using Web Speech API
function startRecording() {
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (!recognition) {
        voiceStatus.textContent = 'Speech recognition not available';
        return;
    }
    
    if (isRecording) {
        // Stop recording
        recognition.stop();
        isRecording = false;
        updateRecordingUI();
        voiceStatus.textContent = 'Recording stopped';
    } else {
        // Start recording
        try {
            recognition.start();
            isRecording = true;
            updateRecordingUI();
            voiceStatus.textContent = 'Listening... Speak now!';
        } catch (error) {
            voiceStatus.textContent = `Error starting speech recognition: ${error.message}`;
            console.error('Error starting speech recognition:', error);
        }
    }
}

function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const transcribeBtn = document.getElementById('transcribeBtn');
    
    if (isRecording) {
        recordBtn.textContent = 'Stop Recording';
        recordBtn.style.backgroundColor = '#ff4444';
        transcribeBtn.disabled = true;
    } else {
        recordBtn.textContent = 'Record Voice';
        recordBtn.style.backgroundColor = '';
        transcribeBtn.disabled = true; // No longer needed with real-time transcription
    }
}

// Transcribe function is no longer needed but kept for compatibility
function transcribeAudio() {
    const voiceStatus = document.getElementById('voiceStatus');
    voiceStatus.textContent = 'Transcription happens automatically with Web Speech API!';
}

// Transcript Management Functions
async function loadTranscripts() {
    try {
        const response = await fetch(`${API_BASE}/transcripts`);
        const data = await response.json();
        
        if (data.status === 'success') {
            transcripts = data.transcripts;
            displayTranscripts();
        }
    } catch (error) {
        console.error('Error loading transcripts:', error);
        // If backend is not available, use local storage
        const localTranscripts = localStorage.getItem('transcripts');
        if (localTranscripts) {
            transcripts = JSON.parse(localTranscripts);
            displayTranscripts();
        }
    }
}

function addTranscriptToUI(transcriptText) {
    const transcript = {
        id: Date.now(), // Use timestamp as ID
        text: transcriptText,
        timestamp: new Date().toISOString()
    };
    
    transcripts.push(transcript);
    displayTranscripts();
    
    // Save to backend if available, otherwise use local storage
    saveTranscript(transcript);
}

async function saveTranscript(transcript) {
    try {
        // Try to save to backend
        const response = await fetch(`${API_BASE}/transcripts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transcript)
        });
        
        if (!response.ok) {
            throw new Error('Backend not available');
        }
    } catch (error) {
        // Fallback to local storage
        localStorage.setItem('transcripts', JSON.stringify(transcripts));
    }
}

function displayTranscripts() {
    const transcriptsList = document.getElementById('transcriptsList');
    
    if (transcripts.length === 0) {
        transcriptsList.innerHTML = '<p><em>No transcripts yet. Click "Record Voice" and speak to see results here.</em></p>';
        return;
    }
    
    let html = '';
    transcripts.forEach(transcript => {
        const timestamp = new Date(transcript.timestamp).toLocaleString();
        html += `
            <div class="transcript-item" data-id="${transcript.id}" style="margin-bottom: 10px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;" onclick="selectTranscript(${transcript.id})">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">${timestamp}</div>
                <div style="font-weight: bold;">${transcript.text}</div>
                <button onclick="deleteTranscript(${transcript.id}); event.stopPropagation();" style="float: right; font-size: 12px; margin-top: 4px;">Delete</button>
            </div>
        `;
    });
    
    transcriptsList.innerHTML = html;
}

let selectedTranscriptId = null;

function selectTranscript(transcriptId) {
    // Remove previous selection
    const previousSelected = document.querySelector('.transcript-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
        previousSelected.style.backgroundColor = '';
    }
    
    // Select new transcript
    const transcriptElement = document.querySelector(`[data-id="${transcriptId}"]`);
    if (transcriptElement) {
        transcriptElement.classList.add('selected');
        transcriptElement.style.backgroundColor = '#e6f3ff';
        selectedTranscriptId = transcriptId;
    }
}

async function deleteTranscript(transcriptId) {
    try {
        const response = await fetch(`${API_BASE}/transcripts/${transcriptId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Backend not available');
        }
    } catch (error) {
        // Continue with local deletion even if backend fails
    }
    
    transcripts = transcripts.filter(t => t.id !== transcriptId);
    displayTranscripts();
    localStorage.setItem('transcripts', JSON.stringify(transcripts));
    
    if (selectedTranscriptId === transcriptId) {
        selectedTranscriptId = null;
    }
}

async function clearTranscripts() {
    if (!confirm('Are you sure you want to clear all transcripts?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/transcripts/clear`, {
            method: 'DELETE'
        });
    } catch (error) {
        // Continue even if backend fails
    }
    
    transcripts = [];
    selectedTranscriptId = null;
    displayTranscripts();
    localStorage.setItem('transcripts', JSON.stringify(transcripts));
}

function uploadSelectedToMemory() {
    if (!selectedTranscriptId) {
        alert('Please select a transcript first.');
        return;
    }
    
    const selectedTranscript = transcripts.find(t => t.id === selectedTranscriptId);
    if (selectedTranscript) {
        // Add to memory section (placeholder implementation)
        addMemory(selectedTranscript.text);
        alert('Transcript uploaded to memory!');
    }
}

// Status and Connection Functions
async function checkWhisperStatus() {
    const whisperStatus = document.getElementById('whisperStatus');
    
    if (recognition) {
        whisperStatus.textContent = 'Web Speech API Ready';
        whisperStatus.style.color = 'green';
    } else {
        whisperStatus.textContent = 'Not Supported';
        whisperStatus.style.color = 'red';
    }
}

// Chat Functions (existing functionality)
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const message = chatInput.value.trim();
    
    if (message) {
        // Add user message
        const userMessage = document.createElement('p');
        userMessage.innerHTML = `<strong>You:</strong> ${message}`;
        chatMessages.appendChild(userMessage);
        
        // Simple AI response (placeholder)
        setTimeout(() => {
            const aiResponse = document.createElement('p');
            aiResponse.innerHTML = `<strong>Capsule AI:</strong> I received your message: "${message}". This is a placeholder response.`;
            chatMessages.appendChild(aiResponse);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
        
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Memory Functions (placeholder implementations)
function loadRandomMemories() {
    const memoriesList = document.getElementById('memoriesList');
    if (memoriesList) {
        memoriesList.innerHTML = '<p><em>Random memories would be loaded here...</em></p>';
    }
}

function addMemory(text = null) {
    const memoryInput = document.getElementById('memoryInput');
    const memoriesList = document.getElementById('memoriesList');
    
    const memoryText = text || (memoryInput ? memoryInput.value.trim() : '');
    
    if (memoryText) {
        if (memoriesList) {
            const memoryItem = document.createElement('div');
            memoryItem.style.cssText = 'margin-bottom: 10px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;';
            memoryItem.innerHTML = `
                <div style="font-size: 12px; color: #666;">${new Date().toLocaleString()}</div>
                <div>${memoryText}</div>
            `;
            memoriesList.appendChild(memoryItem);
        }
        
        if (memoryInput && !text) {
            memoryInput.value = '';
        }
    }
}

function searchMemories() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const query = searchInput.value.trim();
        if (query) {
            alert(`Searching for: "${query}". This is a placeholder implementation.`);
        }
    }
}

function playResponse() {
    alert('Text-to-speech playback would be implemented here.');
}
