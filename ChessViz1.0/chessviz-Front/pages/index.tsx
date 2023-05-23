import Head from "next/head";
import Image from "next/image";
import { Inter } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { Chessboard } from "react-chessboard";
import { Chess, Move, Piece } from "chess.js";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { socket } from "../socket/socket";

import Chatbox from "../components/ChatBox";
import SwitchIcon from "../public/double-arrow-svgrepo-com.svg";
import { PieceSymbol } from "chess.js";
import { Square } from "chess.js";

const inter = Inter({ subsets: ["latin"] });

interface SelectedPiece {
  piece: string;
  clickCount: number;
}

export default function Home() {
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

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

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
    };
  }, []);

  useEffect(() => {
    if (avoidFirstUseEffectRenderFORDEV.current) {
      avoidFirstUseEffectRenderFORDEV.current = false;
      return;
    }
    if (!isConnected) {
      socket.connect();
      socket.emit("gameStart", game.fen());
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
    if (colorChoice !== game.turn()) {
      return false;
    }
    const move = makeAMove({
      from: sourceSquare as Square,
      to: targetSquare as Square,
      promotion: "q", // always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return false;
    socket.emit("moveMade", { move: move, roomId: gameSessionRoom });
    return true;
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

  function handleButtonClick() {
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
          <Chatbox gameSessionRoom={gameSessionRoom} />
        </div>
        {gameSessionRoom === "" && (
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        )}
        {gameSessionRoom === "" && (
          <div className={styles.buttonWrapper}>
            <button onClick={handleButtonClick}>Join Game</button>
          </div>
        )}
      </div>
    </div>
  );
}
