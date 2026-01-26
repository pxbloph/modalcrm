
import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
    cors: {
        origin: '*', // Adjust for production
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private chatService: ChatService,
        private jwtService: JwtService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token?.split(' ')[1]; // Bearer <token>
            if (!token) throw new Error('No token');

            const payload = this.jwtService.verify(token);
            client.data.user = payload;

            // Join user specific room for notifications
            client.join(`user_${payload.sub}`);
            console.log(`Client connected: ${payload.sub}`);
        } catch (e) {
            console.log('WS Connection error:', e.message);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        console.log('Client disconnected');
    }

    @SubscribeMessage('joinConversation')
    handleJoinRoom(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        // Add validation here inside service or ensure user belongs to conversation
        // For now, joining the room allows receiving messages
        client.join(`conversation_${data.conversationId}`);
        return { event: 'joined', conversationId: data.conversationId };
    }

    @SubscribeMessage('leaveConversation')
    handleLeaveRoom(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket) {
        client.leave(`conversation_${data.conversationId}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @MessageBody() data: { conversationId: string; body: string; clientMessageId?: string },
        @ConnectedSocket() client: Socket,
    ) {
        const userId = client.data.user.sub;
        const message = await this.chatService.sendMessage(userId, data.conversationId, data.body, data.clientMessageId);

        // Broadcast to conversation room
        this.server.to(`conversation_${data.conversationId}`).emit('message:new', message);

        // Notify receiver specifically if they are online but not in room (handled by client logic usually, or 'message:notification')

        return message;
    }
}
