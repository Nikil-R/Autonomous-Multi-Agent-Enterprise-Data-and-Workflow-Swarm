import React, { useState } from 'react';
import {
  ArrowRight,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { SwarmMessage } from './services/types';
import { sendSwarmChat, submitHitlApproval } from './services/api';
import { MarkdownPreview } from './components/MarkdownPreview';
import { DataVisualizer } from './components/DataVisualizer';
import { ApprovalCard } from './components/ApprovalCard';

interface QueryTemplate {
  title: string;
  summary: string;
  prompt: string;
}

const TEMPLATES: QueryTemplate[] = [
  {
    title: "Department Salary Breakdown",
    summary: "Executes aggregate SQL calculating average compensation across all corporate departments.",
    prompt: "What is the average salary of employees in each department?"
  },
  {
    title: "High-Value Active Accounts",
    summary: "Filters customer records with active contracts exceeding $5,000 in monthly recurring spend.",
    prompt: "Which customers have an active plan and spend over $5,000 monthly?"
  },
  {
    title: "Operational Ticket Escalation",
    summary: "Drafts a high-priority incident and pauses execution for human authorization.",
    prompt: "Create a HIGH priority support ticket for customer #3: Webhook HMAC signature failure."
  },
  {
    title: "Top Payment Settlements",
    summary: "Queries the transactions ledger to inspect the top 5 highest payment volumes and payment gateways.",
    prompt: "Show me the top 5 highest payment transactions and payment methods."
  }
];

export const App: React.FC = () => {
  const [messages, setMessages] = useState<SwarmMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: "Enterprise workspace initialized. Query structured database tables (employees, salaries, customers, transactions, tickets) or execute verified administrative workflows.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      currentAgent: 'supervisor'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [threadId, setThreadId] = useState<string>(() => `sess_${Math.random().toString(36).substring(2, 8)}`);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    setInputText('');

    const userMessage: SwarmMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendSwarmChat(textToSend, threadId);
      setThreadId(response.thread_id);

      const agentMessage: SwarmMessage = {
        id: `agent_${Date.now()}`,
        sender: 'agent',
        text: response.response_text || 'Completed.',
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
        text: `Connection failed: ${err.response?.data?.detail || err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'ERROR'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleNewSession = () => {
    const newId = `sess_${Math.random().toString(36).substring(2, 8)}`;
    setThreadId(newId);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'agent',
        text: "New workspace session started. How can I assist you with enterprise data or workflows?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        currentAgent: 'supervisor'
      }
    ]);
  };

  const handleApproveAction = async (msgId: string, modifiedPayload?: Record<string, any>) => {
    setIsLoading(true);
    try {
      const response = await submitHitlApproval({
        thread_id: threadId,
        approved: true,
        modified_payload: modifiedPayload
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? {
                ...msg,
                status: 'COMPLETED',
                text: response.response_text || 'Action approved and executed.',
                actionExecutionResult: response.action_execution_result,
                currentAgent: 'workflow_engine'
              }
            : msg
        )
      );
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAction = async (msgId: string) => {
    setIsLoading(true);
    try {
      const response = await submitHitlApproval({
        thread_id: threadId,
        approved: false
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === msgId
            ? {
                ...msg,
                status: 'COMPLETED',
                text: response.response_text || 'Action cancelled by operator.',
                currentAgent: 'operator'
              }
            : msg
        )
      );
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Collapsible Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-inner">
          {/* Header */}
          <div className="sidebar-top">
            <div className="brand-lockup">
              <h1 className="brand-title">EnterpriseIQ</h1>
              <p className="brand-subtitle">Data & Operations Platform</p>
            </div>

            <div className="sidebar-action-row">
              <button
                type="button"
                onClick={handleNewSession}
                className="new-session-button"
                title="Start a new workspace session"
              >
                <Plus style={{ width: 14, height: 14 }} />
                <span>New Session</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="sidebar-collapse-button"
                title="Collapse sidebar"
              >
                <PanelLeftClose style={{ width: 16, height: 16 }} />
              </button>
            </div>
          </div>

          {/* Active Pipeline Nodes */}
          <div className="sidebar-section">
            <div className="section-header-row">
              <span className="section-heading">Active Pipeline</span>
              <span className="pipeline-state-badge">Ready</span>
            </div>

            <div className="pipeline-chain">
              <div className="pipeline-node">
                <div className="pipeline-dot" />
                <div className="pipeline-node-info">
                  <span className="node-title">LangGraph StateGraph</span>
                  <span className="node-desc">Orchestration & Reflection</span>
                </div>
              </div>

              <div className="pipeline-connector" />

              <div className="pipeline-node">
                <div className="pipeline-dot" />
                <div className="pipeline-node-info">
                  <span className="node-title">Text-to-SQL + DBA Critic</span>
                  <span className="node-desc">Relational Safety Validation</span>
                </div>
              </div>

              <div className="pipeline-connector" />

              <div className="pipeline-node">
                <div className="pipeline-dot navy" />
                <div className="pipeline-node-info">
                  <span className="node-title">Human-in-the-Loop</span>
                  <span className="node-desc">Pre-execution Gate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Templates List */}
          <div className="sidebar-section scrollable">
            <div className="section-header-row">
              <span className="section-heading">Verified Templates</span>
            </div>

            <div className="sidebar-templates-list">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputText(tmpl.prompt)}
                  className="sidebar-template-card"
                >
                  <div className="sidebar-template-header">
                    <span className="template-title">{tmpl.title}</span>
                    <ArrowRight style={{ width: 12, height: 12, opacity: 0.4 }} />
                  </div>
                  <p className="sidebar-template-desc">{tmpl.summary}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Footer Persistence Tray */}
          <div className="sidebar-bottom-tray">
            <div className="tray-row">
              <span className="tray-label">Persistence</span>
              <span className="tray-val">SQLite Checkpointer</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Workstation */}
      <main className="main-chat-area">
        {/* Navigation Bar */}
        <header className="chat-header">
          <div className="header-left">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="sidebar-toggle-button"
                title="Expand sidebar"
              >
                <PanelLeftOpen style={{ width: 16, height: 16 }} />
                <span>Menu</span>
              </button>
            )}
            <div className="header-status">
              <span className="status-live-ring" />
              <span>Operational Engine Live</span>
            </div>
          </div>

          <div className="header-actions">
            <span className="header-env-tag">ENTERPRISE CLUSTER</span>
          </div>
        </header>

        {/* Message Workstation */}
        <div className="messages-container">
          {/* In-chat Template Explorer Cards (Shows when at beginning of session) */}
          {messages.length <= 1 && (
            <div className="chat-templates-banner">
              <div className="banner-header">
                <span className="banner-subtitle">Select an automated operational workflow or enter a custom query:</span>
              </div>
              <div className="templates-grid">
                {TEMPLATES.map((tmpl, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSendMessage(tmpl.prompt)}
                    className="template-grid-card"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card-top">
                      <span className="card-title">{tmpl.title}</span>
                      <ArrowRight style={{ width: 14, height: 14, color: '#000080' }} />
                    </div>
                    <p className="card-summary">{tmpl.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === 'user' ? 'user' : 'agent'}`}
            >
              <div className="message-bubble">
                <div className="message-meta-header">
                  <span className="sender-indicator">
                    {msg.sender === 'user' ? 'Operator Command' : `Node [${msg.currentAgent || 'Supervisor'}]`}
                  </span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>

                <div className="message-content-wrapper">
                  <MarkdownPreview content={msg.text} />
                </div>

                {/* Relational Query Visualizer */}
                <DataVisualizer sqlQuery={msg.sqlQuery} data={msg.rawQueryData} />

                {/* Human-in-the-Loop Gate */}
                {msg.status === 'AWAITING_APPROVAL' && msg.actionPayload && (
                  <ApprovalCard
                    actionType={msg.actionType}
                    actionPayload={msg.actionPayload}
                    onApprove={(modified) => handleApproveAction(msg.id, modified)}
                    onReject={() => handleRejectAction(msg.id)}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="loading-state">
              <span className="loading-bar" />
              <span>Synthesizing multi-agent execution cycle...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="input-container">
          <form onSubmit={handleFormSubmit} className="input-form">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Query relational data, generate insights, or dispatch workflow actions..."
              disabled={isLoading}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="send-button"
            >
              <span>Submit</span>
              <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default App;
