import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

export interface AuthInfo {
  token?: string;
}

export class BaseService {
  protected instance: AxiosInstance;
  private readonly baseURL: string = "http://localhost:8080/";

  constructor() {
    this.instance = axios.create({
      baseURL: this.baseURL,
    });

    this.setInterceptors();
  }

  private setInterceptors() {
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => Promise.reject(error)
    );
  }

  private getAuthHeaders(
    auth?: AuthInfo,
    isMultipart = false
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": isMultipart ? "multipart/form-data" : "application/json",
    };

    if (auth?.token) headers["Authorization"] = auth.token;

    return headers;
  }

  protected buildConfig({
    auth,
    customHeaders = {},
    isMultipart = false,
  }: {
    auth?: AuthInfo;
    customHeaders?: Record<string, string>;
    isMultipart?: boolean;
  }): AxiosRequestConfig {
    return {
      headers: {
        ...this.getAuthHeaders(auth, isMultipart),
        ...customHeaders,
      },
    };
  }
}
