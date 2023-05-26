import React, { useEffect, useState } from "react";
import { socket } from "../socket/socket";
import styles from "../styles/Chatbox.module.css";
import CopyIcon from "../public/copy-icon.svg";

const Chatbox = ({ gameSessionRoom = "" }) => {
  const [messages, setMessages] = useState<
    { sender: string; content: string }[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [gameSessionResponse, setGameSessionResponse] = useState("");

  function handleSend() {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "own", content: inputValue },
    ]);
    socket.emit("messageSent", inputValue, gameSessionRoom);
    setInputValue("");
  }

  useEffect(() => {
    // Function to handle receiving new messages
    const handleNewMessage = (message: string) => {
      console.log(message);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "other", content: message },
      ]);
    };

    // Subscribe to the chat room channel or socket event
    // and listen for new messages
    socket.on("messageRecieved", handleNewMessage);

    // Clean up the subscription when the component is unmounted
    return () => {
      socket.off("messageRecieved", handleNewMessage);
    };
  }, []);

  useEffect(() => {
    // Function to handle receiving game session response
    const handleGameSessionResponse = (response: string) => {
      setGameSessionResponse(response);
    };

    // Subscribe to the game session response event
    socket.on("newGameStart", handleGameSessionResponse);

    // Clean up the subscription when the component is unmounted
    return () => {
      socket.off("newGameStart", handleGameSessionResponse);
    };
  }, []);

  const handleInputChange = (e: {
    target: { value: React.SetStateAction<string> };
  }) => {
    setInputValue(e.target.value);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(gameSessionResponse);
  };

  const handleCopyToClipboardURL = () => {
    navigator.clipboard.writeText(
      `https://chessviz.onrender.com?gameRoom=${gameSessionResponse}`
    );
  };

  return (
    <div className={styles.chatbox}>
      <div className={styles.messages}>
        {gameSessionRoom === "" && (
          <div className={styles.joinRoomMessage}>
            Please join a room to start chatting.
          </div>
        )}
        {gameSessionRoom === "" && (
          <div className={styles.gameSessionResponseContainer}>
            <p className={styles.gameSessionResponse}>
              To play a game against a friend,
            </p>
            <p className={styles.gameSessionResponse}>use this code:</p>
            <div className={styles.codeContainer}>
              <span className={styles.gameSessionCode}>
                {gameSessionResponse}
              </span>
              <button
                className={styles.copyButton}
                onClick={handleCopyToClipboard}
              >
                <CopyIcon />
              </button>
            </div>
            <p className={styles.gameSessionResponse}>
              or give them this link!
            </p>
            <div className={styles.codeContainer}>
              <span className={styles.gameSessionCode}>
                {`https://chessviz.onrender.com?gameRoom=${gameSessionResponse}`}
              </span>
              <button
                className={styles.copyButton}
                onClick={handleCopyToClipboardURL}
              >
                <CopyIcon />
              </button>
            </div>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${styles.message} ${
              msg.sender === "own" ? styles.ownMessage : styles.otherMessage
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className={styles.inputContainer}>
        <input
          type="text"
          className={`${styles.inputField} ${
            gameSessionRoom === "" ? styles.disabled : ""
          }`}
          placeholder="Type a message..."
          value={inputValue}
          onChange={handleInputChange}
          disabled={!gameSessionRoom}
        />
        <button
          className={`${styles.sendButton} ${
            gameSessionRoom === "" ? styles.disabled : ""
          }`}
          onClick={handleSend}
          disabled={!gameSessionRoom}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbox;
