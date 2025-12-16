import axios from "axios";

const MCP_URL = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

export interface McpRequest {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: any;
}

export interface McpResponse {
  jsonrpc: "2.0";
  id: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export async function callMcp(method: string, params?: any): Promise<any> {
  const request: McpRequest = {
    jsonrpc: "2.0",
    id: generateId(),
    method,
    params: params || {},
  };

  try {
    const response = await axios.post<McpResponse>(MCP_URL, request, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.data.error) {
      throw new Error(
        `MCP Error: ${response.data.error.message} (code: ${response.data.error.code})`
      );
    }

    return response.data.result;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `HTTP Error ${error.response.status}: ${error.response.statusText}`
      );
    }
    throw error;
  }
}

function generateId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
