// Global 404 Error State & Interceptor Service
export interface Http404Details {
  url?: string;
  resourceName?: string;
  message?: string;
  timestamp: number;
}

type ErrorListener = (error: Http404Details | null) => void;

class GlobalErrorService {
  private current404: Http404Details | null = null;
  private listeners: Set<ErrorListener> = new Set();
  private isInterceptorInstalled = false;

  constructor() {
    this.setupFetchInterceptor();
  }

  public get404Error(): Http404Details | null {
    return this.current404;
  }

  public trigger404(details: Partial<Http404Details> | string = {}) {
    const errorDetails: Http404Details = typeof details === 'string'
      ? { message: details, timestamp: Date.now() }
      : {
          url: details.url,
          resourceName: details.resourceName,
          message: details.message || 'The requested resource or page was not found (404).',
          timestamp: Date.now()
        };

    this.current404 = errorDetails;
    this.notify();
  }

  public clear404() {
    if (this.current404 !== null) {
      this.current404 = null;
      this.notify();
    }
  }

  public subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    listener(this.current404);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.current404);
      } catch (err) {
        console.error('Error in 404 listener:', err);
      }
    }
  }

  // Intercept window.fetch to catch 404 responses automatically
  private setupFetchInterceptor() {
    if (typeof window === 'undefined' || this.isInterceptorInstalled) return;
    this.isInterceptorInstalled = true;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        // If 404 status returned from API or critical document
        if (response.status === 404) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
          // Do not trigger global 404 for push notifications, background sync, or telemetry
          if (url && (
            url.includes('notification') || 
            url.includes('send-push') || 
            url.includes('telemetry') || 
            url.includes('analytics') ||
            url.includes('audit-log')
          )) {
            return response;
          }
          // Trigger global 404 for API calls or document routes
          if (url && (url.includes('/api/') || url.includes('/v1/') || url.includes('/documents/') || url.includes('/projects/'))) {
            this.trigger404({
              url,
              resourceName: url.split('/').filter(Boolean).pop() || 'Resource',
              message: `Resource at "${url}" was not found on server (HTTP 404).`
            });
          }
        }
        return response;
      } catch (err) {
        throw err;
      }
    };
  }
}

export const globalErrorService = new GlobalErrorService();

export const trigger404Error = (details?: Partial<Http404Details> | string) => {
  globalErrorService.trigger404(details);
};

export const clear404Error = () => {
  globalErrorService.clear404();
};
