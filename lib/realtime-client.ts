import type { RealtimeEvent } from './types';

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private onEvent: (event: RealtimeEvent) => void;

  constructor(onEvent: (event: RealtimeEvent) => void) {
    this.onEvent = onEvent;
  }

  connect(ephemeralToken: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // GA: model=gpt-realtime-2, drop openai-beta.realtime-v1 subprotocol
      this.ws = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-realtime-2',
        [
          'realtime',
          `openai-insecure-api-key.${ephemeralToken}`,
        ]
      );

      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);

      this.ws.onmessage = (event) => {
        try {
          const data: RealtimeEvent = JSON.parse(event.data as string);
          this.onEvent(data);
        } catch {
          // ignore malformed events
        }
      };
    });
  }

  sendTextMessage(text: string): void {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    this.send({ type: 'response.create' });
  }

  sendAudioChunk(base64Pcm16: string): void {
    this.send({ type: 'input_audio_buffer.append', audio: base64Pcm16 });
  }

  send(payload: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
