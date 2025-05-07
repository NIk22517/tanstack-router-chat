import { BaseService } from "./BaseService";

export class AuthServices extends BaseService {
  logIn = (values: { data: { email: string; password: string } }) => {
    return this.instance.post("/auth/log-in", values);
  };
}
