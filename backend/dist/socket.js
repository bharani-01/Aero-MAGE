import { Server as SocketServer } from 'socket.io';
export const initSocket = (server) => {
    const io = new SocketServer(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected to Socket: ${socket.id}`);
        socket.on('join_room', (roomCode) => {
            socket.join(roomCode);
            console.log(`👥 Client ${socket.id} joined room ${roomCode}`);
        });
        socket.on('leave_room', (roomCode) => {
            socket.leave(roomCode);
            console.log(`👥 Client ${socket.id} left room ${roomCode}`);
        });
        socket.on('disconnect', () => {
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });
    return io;
};
