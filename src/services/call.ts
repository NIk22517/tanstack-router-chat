import { BaseService, type AuthInfo } from "./BaseService";

export class CallServices extends BaseService {
  createCall = (values: AuthInfo & { chat_id: number | string }) => {
    return this.instance.post(
      `/call/create/${values.chat_id}`,
      {},
      {
        ...this.buildConfig({
          auth: values,
        }),
      }
    );
  };

  controlCall = (
    values: AuthInfo & { data: { call_id: number; status: string } }
  ) => {
    return this.instance.post(
      `/call/control`,
      { data: values.data },
      {
        ...this.buildConfig({
          auth: values,
        }),
      }
    );
  };

  getParticipants = (values: AuthInfo & { call_id: string }) => {
    return this.instance.get(`/call/${values.call_id}`, {
      ...this.buildConfig({
        auth: values,
      }),
    });
  };
}
