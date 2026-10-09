import axios from 'axios';
import { SwarmApiResponse, ApprovalPayload } from './types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes to accommodate multi-agent reflection loops
});

export const sendSwarmChat = async (query: string, threadId?: string): Promise<SwarmApiResponse> => {
  const response = await apiClient.post<SwarmApiResponse>('/chat', {
    query,
    thread_id: threadId,
  });
  return response.data;
};

export const submitHitlApproval = async (payload: ApprovalPayload): Promise<SwarmApiResponse> => {
  const response = await apiClient.post<SwarmApiResponse>('/approve', payload);
  return response.data;
};

export const getSessionHistory = async (threadId: string) => {
  const response = await apiClient.get(`/history/${threadId}`);
  return response.data;
};

export const getDatabaseSchema = async () => {
  const response = await apiClient.get('/schema');
  return response.data;
};
