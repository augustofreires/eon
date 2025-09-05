let io = null;

const setSocketIO = (socketIoInstance) => {
  io = socketIoInstance;
};

const getSocketIO = () => {
  if (!io) {
    console.warn('Socket.io não foi inicializado ainda');
    return null;
  }
  return io;
};

module.exports = {
  setSocketIO,
  getSocketIO
};