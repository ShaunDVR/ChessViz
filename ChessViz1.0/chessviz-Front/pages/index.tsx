import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";
import Router, { useRouter } from "next/router";

import { Chessboard } from "react-chessboard";
import { Chess, Move, Piece, PieceSymbol, Square } from "chess.js";

import Chatbox from "../components/ChatBox";
import SettingsBar from "../components/SettingsBar";
import SwitchIcon from "../public/double-arrow-svgrepo-com.svg";
import InfoPanel from "@/components/InfoPanel";

const inter = Inter({ subsets: ["latin"] });

interface SelectedPiece {
  piece: string;
  clickCount: number;
}

export default function Home() {
  const router = useRouter();
  const { gameRoom } = router.query;

  const [game, setGame] = useState<Chess>(() => new Chess());
  const [colorChoice, setColorChoice] = useState<string>("w");
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(() => ({
    piece: "",
    clickCount: 0,
  }));
  const [moveSquares, setMoveSquares] = useState(() => ({}));
  const [rightClickedSquares, setRightClickedSquares] = useState(() => ({}));

  const [isConnected, setIsConnected] = useState<boolean>(
    () => socket.connected
  );
  const [gameSessionRoom, setGameSessionRoom] = useState<string>("");

  const stockfishWorker = useRef<Worker>();
  let stockfishGameStarted = useRef<boolean>(false);

  const [inputValue, setInputValue] = useState<string>();
  const [chessboardHeight, setChessboardHeight] = useState(500);

  let avoidFirstUseEffectRenderFORDEV = useRef<boolean>(true);

  useEffect(() => {
    function handleResize() {
      const windowHeight = window.innerHeight;
      const newHeight = Math.round(windowHeight * 0.75);
      setChessboardHeight(newHeight);
    }

    window.addEventListener("resize", handleResize);
    handleResize(); // Call the resize function initially to set the correct height

    let wasmSupported =
      typeof WebAssembly === "object" &&
      WebAssembly.validate(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );

    console.log(wasmSupported);

    stockfishWorker.current = new Worker(
      wasmSupported ? "/stockfish.wasm.js" : "/stockfish.js"
    );

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    //Breaking but this option logically is better as it maintains the move history
    // function onMoveRecieved(moveResponse: { gameState: string; move: Move }) {
    //   console.log("current game fen:", game.fen());
    //   console.log("Hello, I heard", moveResponse, "from the server!");
    //   if (game.fen() !== moveResponse.gameState) {
    //     try {
    //       console.log("current game", game);
    //       const gameCopy: Chess = new Chess();
    //       gameCopy.load(game.fen());
    //       const result = gameCopy.move(moveResponse.move);
    //       console.log(gameCopy);
    //       setGame(gameCopy);
    //       return result;
    //     } catch (err) {
    //       console.log(err);
    //     }
    //   }
    // }

    function onMoveRecieved(moveResponse: { gameState: string }) {
      console.log("Hello, I heard", moveResponse, "from the server!");
      if (game.fen() !== moveResponse.gameState) {
        try {
          setGame(new Chess(moveResponse.gameState));
        } catch (err) {
          console.log(err);
        }
      }
    }

    function onNewGameStart(gameSessionResponse: string) {
      console.log("Here's the game session data", gameSessionResponse);
    }

    async function onJoinRoom(roomJoinMsg: string) {
      console.log("Player has joined room: ", roomJoinMsg);
      setGameSessionRoom(roomJoinMsg);
    }

    function onColorSet(color: string) {
      setColorChoice(color);
    }

    async function onColorSwitch() {
      setColorChoice((prevColorChoice) =>
        prevColorChoice === "w" ? "b" : "w"
      );
    }

    function onGameReset() {
      console.log("game was reset");
      setGame(new Chess());
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("moveResponse", onMoveRecieved);
    socket.on("newGameStart", onNewGameStart);
    socket.on("roomJoin", onJoinRoom);
    socket.on("colorSet", onColorSet);
    socket.on("colorSwitch", onColorSwitch);
    socket.on("gameReset", onGameReset);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("moveResponse", onMoveRecieved);
      socket.off("newGameStart", onNewGameStart);
      socket.off("roomJoin", onJoinRoom);
      socket.off("colorSet", onColorSet);
      socket.off("colorSwitch", onColorSwitch);
      socket.off("gameReset", onGameReset);
      stockfishWorker.current?.postMessage("quit");
      stockfishWorker.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (gameRoom) {
      socket.emit("requestJoinGame", gameRoom, (gameStateResponse: string) => {
        console.log(gameStateResponse);
      });
    }
  }, [gameRoom]);

  useEffect(() => {
    console.log(game.fen());
    const getEngineMove = async () => {
      return new Promise((resolve, reject) => {
        if (stockfishWorker.current) {
          // Create a message handler to process Stockfish responses
          stockfishWorker.current.onmessage = function (event) {
            const response = event.data;

            if (response.startsWith("bestmove")) {
              // Generate a random delay between 500ms and 1500ms
              const delay = Math.floor(Math.random() * 1000) + 500;

              setTimeout(() => {
                resolve(response); // Resolve the promise with the best move
              }, delay);
            }
          };

          // Send the move message to Stockfish
          stockfishWorker.current?.postMessage("ucinewgame");

          stockfishWorker.current?.postMessage(`position fen ${game.fen()}`);

          stockfishWorker.current?.postMessage("go depth 10");
        } else {
          resolve("An Error Occured, there is no running stockfish instance");
        }
      });
    };

    const makeEngineMove = (moveResponse: string) => {
      try {
        const gameCopy: Chess = new Chess();
        gameCopy.load(game.fen());
        const result = gameCopy.move((moveResponse as string).split(" ")[1]);
        setGame(gameCopy);
        return result;
      } catch (err) {
        console.log(err);
      }
    };

    //Work out how to disable in production

    // if (avoidFirstUseEffectRenderFORDEV.current) {
    //   avoidFirstUseEffectRenderFORDEV.current = false;
    //   return;
    // }
    if (!isConnected && !gameSessionRoom) {
      socket.connect();
      socket.emit("gameStart", game.fen());
    }

    if (
      gameSessionRoom == "" &&
      stockfishGameStarted.current &&
      colorChoice != game.turn().toString()
    ) {
      console.log(stockfishGameStarted);
      getEngineMove()
        .then((result) => {
          makeEngineMove(result as string);
        })
        .catch((err) => {
          console.log(err);
        });
    }

    if (gameSessionRoom) {
      console.log(game.history()[game.history().length - 1]);
      socket.emit("moveMade", {
        move: game.history()[game.history().length - 1],
        roomId: gameSessionRoom,
      });
    }
  }, [game]);

  useEffect(() => {
    console.log(colorChoice);
  }, [colorChoice]);

  useEffect(() => {
    if (selectedPiece.piece !== "") {
      const moves = game.moves({
        piece: selectedPiece.piece.slice(0, 1) as PieceSymbol,
        square: selectedPiece.piece.slice(1) as Square,
      });
      futureSight(
        [{ moves: moves, fen: game.fen() }],
        {},
        0,
        selectedPiece.clickCount
      );
    }
  }, [selectedPiece]);

  function makeAMove(move: any) {
    try {
      const newGame = new Chess(game.fen()); // Create a new instance of Chess using the current game's FEN
      const result = newGame.move(move);
      setGame(newGame); // Update the state with the new game instance
      return result;
    } catch {
      return false;
    }
  }

  function onDrop(sourceSquare: string, targetSquare: string): boolean {
    if (gameSessionRoom == "") {
      stockfishGameStarted.current = true;
    }
    if (colorChoice !== game.turn()) {
      return false;
    }
    const move = makeAMove({
      from: sourceSquare as Square,
      to: targetSquare as Square,
      promotion: "q", // always promote to a queen for example simplicity
    });

    return move == null ? false : true;
  }

  function toggleActiveColor(fen: string) {
    const parts = fen.split(" ");
    const activeColor = parts[1];

    parts[1] = activeColor === "w" ? "b" : "w";

    return parts.join(" ");
  }

  function futureSight(
    moves: { moves: any; fen: string }[],
    highlights: any,
    currTimeStep: number,
    wantedTimeSteps: number
  ) {
    let nextMoves: { moves: any; fen: string }[] = [];
    moves.forEach((gameState) => {
      gameState.moves.forEach((move: any) => {
        try {
          if (move.slice(-1) !== "+") {
            const newGame = new Chess(gameState.fen);
            const moveMem = newGame.move(move);
            const newFen = toggleActiveColor(newGame.fen());
            const nextMoveGame = new Chess(newFen);
            const nextGameMoves = nextMoveGame.moves({
              piece: moveMem.piece,
              square: moveMem.to,
            });
            nextMoves.push({ moves: nextGameMoves, fen: nextMoveGame.fen() });
          } else {
            nextMoves.push({ moves: [move], fen: gameState.fen });
          }
        } catch (err) {
          console.log(err);
        }
      });
    });
    let moveHighlights: any = {};
    if (currTimeStep < wantedTimeSteps) {
      moveHighlights = futureSight(
        nextMoves,
        highlights,
        currTimeStep + 1,
        wantedTimeSteps
      );
    }
    let squareStyles: any = { ...moveHighlights };
    moves.forEach((gameState) => {
      gameState.moves.forEach((move: any) => {
        if (move.includes("=")) {
          const moveSquare = move.includes("x")
            ? move.substring(2, 4)
            : move.substring(0, 2);
          console.log(moveSquare);
          squareStyles[moveSquare] = {
            backgroundColor: `rgba(${0 + 85 * currTimeStep}, 0, ${
              255 - 85 * currTimeStep
            }, ${0.6 - currTimeStep / 10})`,
          };
        } else if (move === "O-O" || move === "O-O-O") {
          const parts = gameState.fen.split(" ");
          const activeColor = parts[1];
          switch (activeColor) {
            case "w":
              if (move === "O-O") {
                squareStyles["c1"] = {
                  backgroundColor: `rgba(${0 + 85 * currTimeStep}, 0, ${
                    255 - 85 * currTimeStep
                  }, ${0.6 - currTimeStep / 10})`,
                };
              } else {
                squareStyles["g1"] = {
                  backgroundColor: `rgba(${0 + 85 * currTimeStep}, 0, ${
                    255 - 85 * currTimeStep
                  }, ${0.6 - currTimeStep / 10})`,
                };
              }
              break;
            case "b":
              if (move === "O-O") {
                squareStyles["g8"] = {
                  backgroundColor: `rgba(${0 + 85 * currTimeStep}, 0, ${
                    255 - 85 * currTimeStep
                  }, ${0.6 - currTimeStep / 10})`,
                };
              } else {
                squareStyles["c8"] = {
                  backgroundColor: `rgba(${0 + 85 * currTimeStep}, 0, ${
                    255 - 85 * currTimeStep
                  }, ${0.6 - currTimeStep / 10})`,
                };
              }
              break;
            default:
              console.log("Uh oh");
          }
        } else if (move.includes("+")) {
          if (move.includes("x")) {
            squareStyles[move.substring(2, 4)] = {
              backgroundColor: `rgba(${0 + 85 * currTimeStep}, 255, 0, ${
                0.8 - currTimeStep / 5
              })`,
            };
          } else {
            squareStyles[move.substring(1, 3)] = {
              backgroundColor: `rgba(${0 + 85 * currTimeStep}, 255, 0, ${
                0.8 - currTimeStep / 5
              })`,
            };
          }
        }
        squareStyles[move.slice(-2)] = {
          backgroundColor: `rgba(${0 + 85 * currTimeStep}, 0, ${
            255 - 85 * currTimeStep
          }, ${0.6 - currTimeStep / 10})`,
        };
      });
    });
    if (currTimeStep >= 1) {
      return squareStyles;
    } else {
      setMoveSquares(squareStyles);
    }
  }

  function onSquareClick(square: Square) {
    if (!game.get(square)?.type) {
      return;
    }
    const clickedPiece = game.get(square as Square).type;
    const moves = game.moves({ piece: clickedPiece, square: square });
    if (selectedPiece.piece === clickedPiece.concat(square)) {
      setSelectedPiece((prevSelectedPiece) => ({
        ...prevSelectedPiece,
        clickCount: Math.min(prevSelectedPiece.clickCount + 1, 2),
      }));
    } else if (moves.length > 0) {
      setSelectedPiece({ piece: clickedPiece.concat(square), clickCount: 0 });
      setMoveSquares({});
    } else {
      setSelectedPiece({ piece: "", clickCount: 0 });
      setMoveSquares({});
    }
  }

  function onSquareRightClick(square: Square) {
    const colour = "rgba(0, 255, 0, 0.4)";
    setRightClickedSquares(
      (prevSquares: Record<Square, CSSProperties | undefined>) => {
        return {
          ...prevSquares,
          [square]:
            prevSquares[square]?.backgroundColor === colour
              ? undefined
              : { backgroundColor: colour },
        };
      }
    );
  }

  function isDraggablePiece(args: {
    piece: any;
    sourceSquare: Square;
  }): boolean {
    return (
      game.turn() === colorChoice &&
      colorChoice === args.piece.toString().substring(0, 1)
    );
  }

  function onPieceDragBegin(piece: any, sourceSquare: Square): any {
    setMoveSquares({});
    setRightClickedSquares({});
    setSelectedPiece({
      piece: "",
      clickCount: 0,
    });
  }

  function joinGameroom() {
    socket.emit("requestJoinGame", inputValue, (gameStateResponse: string) => {
      console.log(gameStateResponse);
    });
  }

  function handleColorSwitch(event: React.MouseEvent<HTMLButtonElement>): void {
    socket.emit("switchColor", gameSessionRoom);
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        <div className={styles.switchButtonWrapper}>
          {game.fen() ===
            "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" && (
            <button onClick={handleColorSwitch} style={{ border: "none" }}>
              <SwitchIcon style={{ height: "6vh", width: "3vw" }} />
            </button>
          )}
        </div>
        <div className={`${styles.chessboardWrapper}`}>
          <Chessboard
            boardWidth={chessboardHeight}
            id="BasicBoard"
            position={game.fen()}
            onSquareClick={onSquareClick}
            onPieceDrop={onDrop}
            onSquareRightClick={onSquareRightClick}
            onPieceDragBegin={onPieceDragBegin}
            isDraggablePiece={isDraggablePiece}
            customSquareStyles={{
              ...moveSquares,
            }}
            boardOrientation={colorChoice === "w" ? "white" : "black"}
          />
        </div>

        <div className={styles.chatboxWrapper}>
          {/* Unsure if needed right now */}
          {/* <SettingsBar settings={[{ label: "hello", options: ["hello"] }]} /> */}
          <Chatbox gameSessionRoom={gameSessionRoom} />
        </div>
        <div className={styles.infoPanelWrapper}>
          <InfoPanel
            gameSessionRoom={gameSessionRoom}
            inputValue={inputValue ? inputValue : ""}
            onInputChange={(e) => setInputValue(e.target.value)}
            onButtonClick={joinGameroom}
          />
        </div>
      </div>
    </div>
  );
}
