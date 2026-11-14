import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Send,
  Receipt,
  Bot,
  User,
  X,
  Loader2,
  AlertCircle,
  Maximize2,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import './App.css';

const API_ENDPOINT = 'http://localhost:8000/api/extractor/extract/';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hello! I am your AI Receipt Extractor powered by Ollama. Attach a photo or scan of any receipt or invoice, optionally add instructions, and press Enter!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  const handleCopy = (id, data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalImageUrl(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP, etc.)');
      return;
    }
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Support pasting screenshots directly from clipboard
  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        handleFileSelect(blob);
        break;
      }
    }
  };


  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();

    if (!selectedFile && !inputText.trim()) {
      return;
    }

    if (!selectedFile) {
      alert('Please attach a receipt image to extract data.');
      return;
    }

    const currentFile = selectedFile;
    const currentPreview = previewUrl;
    const currentText = inputText.trim();

    // 1. Add User message to the chat
    const userMessageId = Date.now();
    const newUserMessage = {
      id: userMessageId,
      sender: 'user',
      text: currentText,
      imagePreview: currentPreview,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText('');
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsLoading(true);

    // 2. Prepare multipart FormData for Django
    const formData = new FormData();
    formData.append('image', currentFile);
    if (currentText) {
      formData.append('text', currentText);
    }

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Server returned ${response.status}`);
      }

      // 3. Add Bot response
      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        data: result.data,
        tokens: result.tokens,
        rawText: result.raw_text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        error: err.message || 'Failed to process receipt. Make sure Django and Ollama are running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container" onPaste={handlePaste}>
      {/* Top Header */}
      <header className="chat-header">
        <div className="header-left">
          <div className="header-icon">
            <Receipt size={20} />
          </div>
          <div className="header-title">
            <h1>Receipt Extractor</h1>
            <div className="header-subtitle">Local AI Multimodal Chat</div>
          </div>
        </div>

        <div className="status-badge">
          <span className="status-dot"></span>
          <span>Ollama Vision Ready</span>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <main className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-row ${msg.sender}`}>
            <div className={`avatar ${msg.sender}`}>
              {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>

            <div className="message-bubble">
              {/* If user sent an image preview */}
              {msg.imagePreview && (
                <div
                  className="image-attachment-preview clickable"
                  onClick={() => setModalImageUrl(msg.imagePreview)}
                  title="Click to expand"
                >
                  <img src={msg.imagePreview} alt="Receipt Preview" />
                  <div className="zoom-overlay">
                    <Maximize2 size={14} />
                    <span>Click to view</span>
                  </div>
                </div>
              )}

              {/* Message text */}
              {msg.text && <p>{msg.text}</p>}

              {/* Error display */}
              {msg.error && (
                <div className="error-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span>{msg.error}</span>
                </div>
              )}

              {/* Clean Simple JSON View */}
              {msg.data && (
                <div className="json-container">
                  <div className="json-header">
                    <div className="json-header-left">
                      <span className="json-tag">JSON</span>
                      {msg.tokens && (
                        <div className="token-badge" title="Tokens used for this extraction">
                          <Zap size={13} className="token-icon" />
                          <span>
                            <b>{msg.tokens.prompt ?? 0}</b> in / <b>{msg.tokens.output ?? 0}</b> out
                            {msg.tokens.prompt !== undefined && msg.tokens.output !== undefined && (
                              <span className="token-total-count">
                                {' '}(Total: {(msg.tokens.prompt || 0) + (msg.tokens.output || 0)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="json-copy-btn"
                      onClick={() => handleCopy(msg.id, msg.data)}
                      title="Copy JSON to clipboard"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={13} className="check-icon" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="json-code">
                    {JSON.stringify(msg.data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Raw fallback if JSON couldn't be parsed */}
              {msg.rawText && (
                <pre className="json-code" style={{ marginTop: '8px' }}>
                  {msg.rawText}
                </pre>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="message-row bot">
            <div className="avatar bot">
              <Bot size={18} />
            </div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <Loader2 size={16} className="spin-icon" />
                <span>Ollama is analyzing the receipt...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {/* Input / Control Area */}
      <footer className="input-container">
        <form className="input-wrapper" onSubmit={handleSendMessage}>
          {/* File Chip Preview before sending */}
          {previewUrl && (
            <div className="selected-file-chip">
              <img src={previewUrl} alt="Thumbnail" className="file-chip-thumb" />
              <span>{selectedFile?.name || 'Attached image'}</span>
              <button
                type="button"
                className="chip-remove-btn"
                onClick={clearSelectedFile}
                title="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="input-box">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />

            {/* Attachment Button */}
            <button
              type="button"
              className="attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach receipt image"
            >
              <Paperclip size={20} />
            </button>

            {/* Text Input */}
            <input
              type="text"
              className="chat-input"
              placeholder={
                selectedFile
                  ? 'Add instructions (e.g. "focus on tax") or hit Enter...'
                  : 'Attach a receipt or paste image with Ctrl+V...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
            />

            {/* Send Button */}
            <button
              type="submit"
              className="send-btn"
              disabled={isLoading || (!selectedFile && !inputText.trim())}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>

          <div className="input-hint">
            Tip: You can take a screenshot and paste it directly with <b>Cmd + V</b> / <b>Ctrl + V</b>
          </div>
        </form>
      </footer>

      {/* Full Image Modal Popup */}
      {modalImageUrl && (
        <div className="image-modal-backdrop" onClick={() => setModalImageUrl(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setModalImageUrl(null)}
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
            <img src={modalImageUrl} alt="Full Receipt View" className="modal-full-image" />
          </div>
        </div>
      )}
    </div>
  );
}
