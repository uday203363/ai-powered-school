import React, { useRef, useEffect, useState } from 'react';
import { Send, Loader2, BookOpen, Brain, AlertCircle } from 'lucide-react';
import { aiService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../common';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'study' | 'explain'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [guideSubject, setGuideSubject] = useState('');
  const [guideTopic, setGuideTopic] = useState('');
  const [explainInput, setExplainInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if student is active
  if (user?.role === 'student' && user?.status && user.status !== 'Active') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Inactive</h2>
          <p className="text-gray-600 mb-4">
            Your account status is <strong>{user.status}</strong>. 
            You cannot access the AI Assistant.
          </p>
          <p className="text-gray-500 text-sm">
            Please contact the school administration for more information.
          </p>
        </Card>
      </div>
    );
  }

  const subjects = ['Biology', 'Mathematics', 'Physics', 'Chemistry', 'History', 'Geography', 'English', 'Social Studies'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setLoading(true);

    try {
      const result = await aiService.chat(chatInput);
      const responseText = result.success ? result.message : `Error: ${result.message}`;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateGuide = async () => {
    if (!guideSubject.trim() || !guideTopic.trim()) {
      return;
    }

    const userQuery = `${guideSubject}: ${guideTopic}`;
    const userMessage: Message = {
      role: 'user',
      content: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setGuideSubject('');
    setGuideTopic('');
    setLoading(true);

    try {
      const result = await aiService.generateStudyGuide(guideSubject, guideTopic);
      const responseText = result.success ? result.content : `Error: ${result.content}`;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error('Study guide error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!explainInput.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: explainInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setExplainInput('');
    setLoading(true);

    try {
      const result = await aiService.explainConcept(explainInput);
      const responseText = result.success ? result.explanation : `Error: ${result.explanation}`;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (error) {
      console.error('Explain error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b bg-gray-50">
        <button
          onClick={() => {
            setActiveTab('chat');
            setMessages([]);
          }}
          className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'chat'
              ? 'bg-blue-600 text-white border-b-2 border-blue-600'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Send size={18} />
          Chat
        </button>
        <button
          onClick={() => {
            setActiveTab('study');
            setMessages([]);
          }}
          className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'study'
              ? 'bg-blue-600 text-white border-b-2 border-blue-600'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BookOpen size={18} />
          Study Guide
        </button>
        <button
          onClick={() => {
            setActiveTab('explain');
            setMessages([]);
          }}
          className={`flex-1 py-3 px-4 font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'explain'
              ? 'bg-blue-600 text-white border-b-2 border-blue-600'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Brain size={18} />
          Explain
        </button>
      </div>

      {/* Messages Display Area */}
      <div className="h-96 overflow-y-auto bg-gradient-to-b from-blue-50 to-white p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-gray-400">
            <div>
              {activeTab === 'chat' && (
                <div>
                  <Send size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-lg">Start a conversation with your AI tutor</p>
                  <p className="text-sm mt-1">Ask any questions about your studies</p>
                </div>
              )}
              {activeTab === 'study' && (
                <div>
                  <BookOpen size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-lg">Create a personalized study guide</p>
                  <p className="text-sm mt-1">Select a subject and topic to get started</p>
                </div>
              )}
              {activeTab === 'explain' && (
                <div>
                  <Brain size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-lg">Get simple explanations for complex concepts</p>
                  <p className="text-sm mt-1">Enter any topic or concept to explain</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-3 rounded-lg rounded-bl-none flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        {activeTab === 'chat' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleChat()}
              placeholder="Ask anything about your studies..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleChat}
              disabled={loading || !chatInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Send
            </button>
          </div>
        )}

        {activeTab === 'study' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={guideSubject}
                onChange={(e) => setGuideSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Select a subject...</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
              <input
                type="text"
                value={guideTopic}
                onChange={(e) => setGuideTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleGenerateGuide()}
                placeholder="Enter the topic you want to study..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleGenerateGuide}
              disabled={loading || !guideSubject || !guideTopic.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
              Generate Study Guide
            </button>
          </div>
        )}

        {activeTab === 'explain' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={explainInput}
              onChange={(e) => setExplainInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && handleExplain()}
              placeholder="Enter a concept to explain..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={handleExplain}
              disabled={loading || !explainInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Brain size={18} />}
              Explain
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
