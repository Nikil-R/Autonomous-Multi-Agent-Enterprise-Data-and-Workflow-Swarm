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
      text: "👋 Welcome to **EnterpriseIQ**! I am your Autonomous Enterprise Colleague. You can ask me natural language questions about internal data (employees, salaries, customers, transactions, tickets) or ask me to draft operational support tickets and escalation alerts.",
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
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900/80 border-r border-slate-800 flex flex-col p-5 hidden md:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              EnterpriseIQ
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                v1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Autonomous Multi-Agent Swarm</p>
          </div>
        </div>

        {/* System Architecture Badges */}
        <div className="mt-6 space-y-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Swarm Architecture
          </span>
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>LangGraph StateGraph</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Text-to-SQL + DBA Critic Loop</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Human-in-the-Loop (HITL) Gate</span>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="mt-6 flex-1 overflow-y-auto space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Test Scenarios
          </span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInputText(prompt)}
              className="w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-850 hover:border-slate-700 text-xs text-slate-300 hover:text-white transition-all"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Session ID Footer */}
        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 font-mono truncate">
          Thread ID: {threadId}
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col h-full bg-slate-950 relative">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Swarm Online: Qwen 27B + SQLite Checkpointer</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">
              Session: {threadId.substring(0, 14)}...
            </span>
          </div>
        </header>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-800 border border-slate-700 text-emerald-400'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed max-w-2xl shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Agent Header Tag */}
                {msg.sender === 'agent' && msg.currentAgent && (
                  <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Agent Node: [{msg.currentAgent}]</span>
                  </div>
                )}

                {/* Formatted Text */}
                <div className="prose prose-invert prose-xs max-w-none whitespace-pre-wrap">
                  {msg.text}
                </div>

                {/* Relational SQL & Table Visualizer */}
                <DataVisualizer sqlQuery={msg.sqlQuery} data={msg.rawQueryData} />

                {/* Timestamp */}
                <div
                  className={`text-[10px] mt-2 text-right ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 mr-auto max-w-xl animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Swarm collaborating across nodes (Supervisor ➔ Specialist)...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask an enterprise question or command an action..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/80 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl p-3 transition-all shadow-md shadow-blue-500/20 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
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
