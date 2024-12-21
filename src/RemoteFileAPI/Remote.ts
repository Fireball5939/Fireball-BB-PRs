import { RFAMessage } from "./MessageDefinitions";
import { RFARequestHandler } from "./MessageHandlers";
import { SnackbarEvents } from "../ui/React/Snackbar";
import { ToastVariant } from "@enums";

export class Remote {
  connection?: WebSocket;
  static protocol = "ws";
  ipaddr: string;
  port: number;

  constructor(ip: string, port: number) {
    this.ipaddr = ip;
    this.port = port;
  }

  public stopConnection(): void {
    this.connection?.close();
  }

  public startConnection(): void {
    const address = Remote.protocol + "://" + this.ipaddr + ":" + this.port;
    try {
      this.connection = new WebSocket(address);
    } catch (e) {
      console.error(`Invalid address, ${e}`);
      return;
    }

    this.connection.addEventListener("error", (e: Event) =>
      SnackbarEvents.emit(`Error with websocket ${address}, details: ${JSON.stringify(e)}`, ToastVariant.ERROR, 5000),
    );
    this.connection.addEventListener("message", handleMessageEvent);
    this.connection.addEventListener("open", () =>
      SnackbarEvents.emit(
        `Remote API connection established on ${this.ipaddr}:${this.port}`,
        ToastVariant.SUCCESS,
        2000,
      ),
    );
    this.connection.addEventListener("close", () =>
      SnackbarEvents.emit("Remote API connection closed", ToastVariant.WARNING, 2000),
    );
  }
}

function handleMessageEvent(this: WebSocket, e: MessageEvent): void {
  /**
   * Validating e.data and the result of JSON.parse() is too troublesome, so we typecast them here. If the data is
   * invalid, it means the RFA "client" (the tool that the player is using) is buggy, but that's not our problem.
   */
  const msg = JSON.parse(e.data as string) as RFAMessage;

  if (!msg.method || !RFARequestHandler[msg.method]) {
    const response = new RFAMessage({ error: "Unknown message received", id: msg.id });
    this.send(JSON.stringify(response));
    return;
  }
  const response = RFARequestHandler[msg.method](msg);
  if (!response) return;
  this.send(JSON.stringify(response));
}
