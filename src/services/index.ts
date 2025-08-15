import { AIServices } from "./ai";
import { AuthServices } from "./auth";
import { CallServices } from "./call";
import { ChatServices } from "./chat";

export const services = {
  authServices: new AuthServices(),
  chatServices: new ChatServices(),
  aiServices: new AIServices(),
  callServices: new CallServices(),
};
