import { supabase } from '../lib/supabase';

export const apiClient = {

  invoke: async (path: string, method: string, body?: any, options: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    return await supabase.functions.invoke(`study-logic/${cleanPath}`, {
      method,
      body,
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        ...options.headers,
      },
      ...options,
    });
  },

  get: (path: string, options?: any) => apiClient.invoke(path, 'GET', undefined, options),

  post: (path: string, body?: any, options?: any) => apiClient.invoke(path, 'POST', body, options),

  delete: (path: string, options?: any) => apiClient.invoke(path, 'DELETE', undefined, options),
};

export default apiClient;
