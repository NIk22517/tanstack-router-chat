import { BaseService } from "./BaseService";

export class AuthServices extends BaseService {
  logIn = (values: { data: { email: string; password: string } }) => {
    return this.instance.post("/auth/log-in", values);
  };
  signIn = (values: {
    data: { email: string; password: string; name: string };
  }) => {
    return this.instance.post("/auth/sign-in", values);
  };
}
