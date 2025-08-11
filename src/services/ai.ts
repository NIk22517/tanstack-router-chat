import { BaseService, type AuthInfo } from "./BaseService";

export class AIServices extends BaseService {
  aiSuggestion = (values: AuthInfo & { chat_id: number | string }) => {
    return this.instance.get(`/ai/suggestion/${values.chat_id}`, {
      ...this.buildConfig({
        auth: values,
      }),
    });
  };
}
