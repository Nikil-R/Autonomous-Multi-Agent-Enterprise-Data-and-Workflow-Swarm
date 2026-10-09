export interface SwarmMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  intentCategory?: 'DATA_ANALYTICS' | 'WORKFLOW_ACTION' | 'GENERAL';
  status?: 'COMPLETED' | 'AWAITING_APPROVAL' | 'ERROR';
  sqlQuery?: string;
  rawQueryData?: Array<Record<string, any>>;
  actionType?: string;
  actionPayload?: Record<string, any>;
  actionExecutionResult?: string;
  currentAgent?: string;
}

export interface ApprovalPayload {
  thread_id: string;
  approved: boolean;
  modified_payload?: Record<string, any>;
}

export interface SwarmApiResponse {
  thread_id: string;
  status: 'COMPLETED' | 'AWAITING_APPROVAL' | 'ERROR';
  response_text?: string;
  intent_category?: 'DATA_ANALYTICS' | 'WORKFLOW_ACTION' | 'GENERAL';
  sql_query?: string;
  raw_query_data?: Array<Record<string, any>>;
  action_type?: string;
  action_payload?: Record<string, any>;
  action_execution_result?: string;
  current_agent?: string;
  iteration_count?: number;
}
