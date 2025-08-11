import { AIServices } from "./ai";
import { AuthServices } from "./auth";
import { ChatServices } from "./chat";

export const services = {
  authServices: new AuthServices(),
  chatServices: new ChatServices(),
  aiServices: new AIServices(),
};
