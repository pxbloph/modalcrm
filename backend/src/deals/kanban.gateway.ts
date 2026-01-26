
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

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class KanbanGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        // console.log('Kanban Client connected:', client.id);
    }

    handleDisconnect(client: Socket) {
        // console.log('Kanban Client disconnected:', client.id);
    }

    @SubscribeMessage('kanban:join')
    handleJoinBoard(@MessageBody() pipelineId: string, @ConnectedSocket() client: Socket) {
        client.join(`pipeline_${pipelineId}`);
        // console.log(`Client ${client.id} joined pipeline_${pipelineId}`);
    }

    @SubscribeMessage('kanban:leave')
    handleLeaveBoard(@MessageBody() pipelineId: string, @ConnectedSocket() client: Socket) {
        client.leave(`pipeline_${pipelineId}`);
    }

    // Methods to emit events
    notifyDealMoved(pipelineId: string, deal: any) {
        this.server.to(`pipeline_${pipelineId}`).emit('kanban:deal_moved', deal);
    }

    notifyDealCreated(pipelineId: string, deal: any) {
        this.server.to(`pipeline_${pipelineId}`).emit('kanban:deal_created', deal);
    }

    notifyDealUpdated(pipelineId: string, deal: any) {
        this.server.to(`pipeline_${pipelineId}`).emit('kanban:deal_updated', deal);
    }
}
