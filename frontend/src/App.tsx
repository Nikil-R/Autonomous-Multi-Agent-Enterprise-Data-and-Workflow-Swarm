import React, { useState } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  Cpu,
  Layers,
  Database
} from 'lucide-react';
import { SwarmMessage } from './services/types';
import { sendSwarmChat, submitHitlApproval } from './services/api';
import { DataVisualizer } from './components/DataVisualizer';
import { ApprovalModal } from './components/ApprovalModal';

export const App: React.FC = () => {
  const [messages, setMessages] = useState<SwarmMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: "👋 Welcome to **EnterpriseIQ**! I am your Autonomous Enterprise Colleague.\n\nYou can ask me natural language questions about internal data (employees, salaries, customers, transactions, tickets) or ask me to draft operational support tickets and escalation alerts.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      currentAgent: 'supervisor'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => `session_${Math.random().toString(36).substring(2, 9)}`);

  // Human-in-the-Loop Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    actionType?: string;
    actionPayload?: Record<string, any>;
  } | null>(null);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userQuery = inputText.trim();
    setInputText('');

    const userMessage: SwarmMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendSwarmChat(userQuery, threadId);

      // Save updated thread ID
      setThreadId(response.thread_id);

      // Check if paused at Human-in-the-Loop breakpoint!
      if (response.status === 'AWAITING_APPROVAL') {
        setPendingAction({
          actionType: response.action_type,
          actionPayload: response.action_payload
        });
        setIsModalOpen(true);
      }

      const agentMessage: SwarmMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: response.response_text || 'Workflow executed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intentCategory: response.intent_category,
        status: response.status,
        sqlQuery: response.sql_query,
        rawQueryData: response.raw_query_data,
        actionType: response.action_type,
        actionPayload: response.action_payload,
        actionExecutionResult: response.action_execution_result,
        currentAgent: response.current_agent
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      const errorMessage: SwarmMessage = {
        id: `err_${Date.now()}`,
        sender: 'agent',
        text: `⚠️ **Error connecting to Swarm:** ${err.response?.data?.detail || err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'ERROR'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAction = async (modifiedPayload?: Record<string, any>) => {
    setIsLoading(true);
    try {
      const response = await submitHitlApproval({
        thread_id: threadId,
        approved: true,
        modified_payload: modifiedPayload
      });

      setIsModalOpen(false);
      setPendingAction(null);

      const resolvedMessage: SwarmMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: response.response_text || 'Action successfully executed with human sign-off.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'COMPLETED',
        actionExecutionResult: response.action_execution_result,
        currentAgent: 'execute_action_tool'
      };

      setMessages((prev) => [...prev, resolvedMessage]);
    } catch (err: any) {
      alert(`Approval submission failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAction = async () => {
    setIsLoading(true);
    try {
      const response = await submitHitlApproval({
        thread_id: threadId,
        approved: false
      });

      setIsModalOpen(false);
      setPendingAction(null);

      const rejectedMessage: SwarmMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: response.response_text || 'Action cancelled by human operator.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'COMPLETED',
        currentAgent: 'human_supervisor'
      };

      setMessages((prev) => [...prev, rejectedMessage]);
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "What is the average salary of employees in each department?",
    "Which customers have an active plan and spend over $5,000 monthly?",
    "Create a HIGH priority support ticket for customer #3: Webhook HMAC signature failure.",
    "Show me the top 5 highest payment transactions and payment methods."
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="brand-header">
          <div className="brand-icon">
            <Cpu style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="brand-title">
              EnterpriseIQ
              <span className="brand-version">v1.0</span>
            </h1>
            <p className="brand-subtitle">Autonomous Multi-Agent Swarm</p>
          </div>
        </div>

        {/* System Architecture Badges */}
        <div>
          <div className="sidebar-section-title">Swarm Architecture</div>
          <div className="architecture-card">
            <div className="arch-item">
              <Layers style={{ width: 15, height: 15, color: '#60a5fa' }} />
              <span>LangGraph StateGraph</span>
            </div>
            <div className="arch-item">
              <Database style={{ width: 15, height: 15, color: '#34d399' }} />
              <span>Text-to-SQL + DBA Critic</span>
            </div>
            <div className="arch-item">
              <ShieldCheck style={{ width: 15, height: 15, color: '#fbbf24' }} />
              <span>Human-in-the-Loop (HITL) Gate</span>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="sidebar-section-title">Test Scenarios</div>
        <div className="quick-prompts-list">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(prompt)}
              className="quick-prompt-btn"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Session ID Footer */}
        <div className="sidebar-footer">
          Thread: {threadId}
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="main-chat-area">
        {/* Top Navbar */}
        <header className="chat-header">
          <div className="status-badge">
            <div className="status-dot" />
            <span>Swarm Online: Qwen 27B + SQLite Checkpointer</span>
          </div>
          <div className="session-badge">
            Session: {threadId.substring(0, 14)}...
          </div>
        </header>

        {/* Message Feed */}
        <div className="messages-container">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === 'user' ? 'user' : 'agent'}`}
            >
              {/* Avatar */}
              <div className={`avatar ${msg.sender === 'user' ? 'user' : 'agent'}`}>
                {msg.sender === 'user' ? (
                  <User style={{ width: 18, height: 18 }} />
                ) : (
                  <Bot style={{ width: 18, height: 18 }} />
                )}
              </div>

              {/* Message Content Bubble */}
              <div className={`message-bubble ${msg.sender === 'user' ? 'user' : 'agent'}`}>
                {/* Agent Header Tag */}
                {msg.sender === 'agent' && msg.currentAgent && (
                  <div className="agent-tag">
                    <Sparkles style={{ width: 13, height: 13, color: '#34d399' }} />
                    <span>Agent Node: [{msg.currentAgent}]</span>
                  </div>
                )}

                {/* Text Content */}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>

                {/* Relational SQL & Table Visualizer */}
                <DataVisualizer sqlQuery={msg.sqlQuery} data={msg.rawQueryData} />

                {/* Timestamp */}
                <div className="message-time">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="loading-indicator">
              <div className="pulsing-dot" />
              <span>Swarm collaborating across nodes (Supervisor ➔ Specialist)...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="input-container">
          <form onSubmit={handleSendMessage} className="input-form">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask an enterprise question or command an action..."
              disabled={isLoading}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="send-button"
            >
              <Send style={{ width: 16, height: 16 }} />
            </button>
          </form>
        </div>
      </main>

      {/* Human-in-the-Loop Modal */}
      <ApprovalModal
        isOpen={isModalOpen}
        actionType={pendingAction?.actionType}
        actionPayload={pendingAction?.actionPayload}
        onApprove={handleApproveAction}
        onReject={handleRejectAction}
        isLoading={isLoading}
      />
    </div>
  );
};

export default App;
