// stockfish.worker.js
importScripts("../stockfish");

const stockfish = STOCKFISH();
stockfish.postMessage("uci");

self.onmessage = function (event) {
  stockfish.postMessage(event.data);
};

stockfish.onmessage = function (event) {
  self.postMessage(event.data);
};
