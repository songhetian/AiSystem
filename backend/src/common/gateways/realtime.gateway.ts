import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeService } from '../services/realtime.service';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: true,
    credentials: true
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly sessionPresence = new Map<
    string,
    Array<{ socketId: string; userId: string; username: string; activity: string }>
  >();

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService
  ) {}

  afterInit() {
    this.realtimeService.setServer(this.server);
  }

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string; username: string }>(token, {
        secret: process.env.JWT_SECRET ?? 'changeme'
      });
      client.data.userId = payload.sub;
      client.data.username = payload.username;
      client.join(this.realtimeService.buildUserRoom(payload.sub));
      client.emit('realtime.ready', { userId: payload.sub, connectedAt: new Date().toISOString() });
    } catch (error) {
      this.logger.warn(`socket auth failed: ${(error as Error)?.message ?? 'unknown error'}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      client.leave(this.realtimeService.buildUserRoom(client.data.userId as string));
    }
    this.clearSocketPresence(client);
  }

  @SubscribeMessage('realtime.ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body?: Record<string, unknown>) {
    return {
      event: 'realtime.pong',
      data: {
        userId: client.data.userId,
        clientTime: body?.clientTime,
        serverTime: new Date().toISOString()
      }
    };
  }

  @SubscribeMessage('service-session.watch')
  handleServiceSessionWatch(@ConnectedSocket() client: Socket, @MessageBody() body?: { sessionId?: string }) {
    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      return { event: 'service-session.presence.snapshot', data: { sessionId: '', occupancies: [] } };
    }

    const room = this.realtimeService.buildServiceSessionRoom(sessionId);
    client.join(room);

    return {
      event: 'service-session.presence.snapshot',
      data: {
        sessionId,
        occupancies: this.listPresence(sessionId)
      }
    };
  }

  @SubscribeMessage('service-session.unwatch')
  handleServiceSessionUnwatch(@ConnectedSocket() client: Socket, @MessageBody() body?: { sessionId?: string }) {
    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      return;
    }

    client.leave(this.realtimeService.buildServiceSessionRoom(sessionId));
  }

  @SubscribeMessage('service-session.presence.start')
  handlePresenceStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() body?: { sessionId?: string; activity?: string }
  ) {
    const sessionId = body?.sessionId?.trim();
    const activity = body?.activity?.trim();
    if (!sessionId || !activity || !client.data.userId) {
      return;
    }

    const entries = this.sessionPresence.get(sessionId) ?? [];
    const nextEntries = [
      ...entries.filter((item) => !(item.socketId === client.id && item.activity === activity)),
      {
        socketId: client.id,
        userId: String(client.data.userId),
        username: String(client.data.username ?? client.data.userId),
        activity
      }
    ];
    this.sessionPresence.set(sessionId, nextEntries);
    this.broadcastPresence(sessionId);
  }

  @SubscribeMessage('service-session.presence.stop')
  handlePresenceStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() body?: { sessionId?: string; activity?: string }
  ) {
    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      return;
    }

    const activity = body?.activity?.trim();
    const entries = this.sessionPresence.get(sessionId) ?? [];
    const nextEntries = entries.filter((item) => {
      if (item.socketId !== client.id) {
        return true;
      }
      return activity ? item.activity !== activity : false;
    });

    if (nextEntries.length > 0) {
      this.sessionPresence.set(sessionId, nextEntries);
    } else {
      this.sessionPresence.delete(sessionId);
    }
    this.broadcastPresence(sessionId);
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim().replace(/^Bearer\s+/i, '');
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization === 'string' && authorization.trim()) {
      return authorization.trim().replace(/^Bearer\s+/i, '');
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim().replace(/^Bearer\s+/i, '');
    }

    return undefined;
  }

  private listPresence(sessionId: string) {
    return (this.sessionPresence.get(sessionId) ?? []).map(({ userId, username, activity }) => ({
      userId,
      username,
      activity
    }));
  }

  private broadcastPresence(sessionId: string) {
    this.realtimeService.emitToRoom(this.realtimeService.buildServiceSessionRoom(sessionId), 'service-session.presence.changed', {
      sessionId,
      occupancies: this.listPresence(sessionId)
    });
  }

  private clearSocketPresence(client: Socket) {
    for (const [sessionId, entries] of this.sessionPresence.entries()) {
      const nextEntries = entries.filter((item) => item.socketId !== client.id);
      if (nextEntries.length > 0) {
        this.sessionPresence.set(sessionId, nextEntries);
      } else {
        this.sessionPresence.delete(sessionId);
      }
      if (nextEntries.length !== entries.length) {
        this.broadcastPresence(sessionId);
      }
    }
  }
}
