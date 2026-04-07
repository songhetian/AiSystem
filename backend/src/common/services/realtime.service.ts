import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server?: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown> = {}) {
    if (!this.server || !userId) {
      return;
    }

    this.server.to(this.buildUserRoom(userId)).emit(event, {
      ...payload,
      userId,
      emittedAt: new Date().toISOString()
    });
  }

  emitToRoom(room: string, event: string, payload: Record<string, unknown> = {}) {
    if (!this.server || !room) {
      return;
    }

    this.server.to(room).emit(event, {
      ...payload,
      emittedAt: new Date().toISOString()
    });
  }

  buildUserRoom(userId: string) {
    return `user:${userId}`;
  }

  buildServiceSessionRoom(sessionId: string) {
    return `service-session:${sessionId}`;
  }
}
