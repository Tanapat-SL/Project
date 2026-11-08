import { io } from 'socket.io-client';

export const socket = io({
	auth: callback => callback({ token: localStorage.getItem('mf_token') }),
});
