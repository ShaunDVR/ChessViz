import React from "react";
import styles from "../styles/InfoPane.module.css";

type InfoPanelProps = {
  gameSessionRoom: string;
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onButtonClick: () => void;
};

const InfoPanel = (InfoPanelProps: InfoPanelProps) => {
  return (
    <div className={styles.infoPanel}>
      <div className={styles.section}>
        <h2>Board Options</h2>
        {/* Board Options content */}
      </div>
      <div className={styles.section}>
        <h2>Stockfish Options</h2>
        {/* Stockfish Options content */}
      </div>
      <div className={styles.section}>
        <h2>Player Info</h2>
        <div className={styles.section}>
          {InfoPanelProps.gameSessionRoom === "" && (
            <div className={styles.inputWrapper}>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  value={InfoPanelProps.inputValue}
                  onChange={InfoPanelProps.onInputChange}
                  className={styles.inputField}
                />
                <button
                  onClick={InfoPanelProps.onButtonClick}
                  className={styles.joinButton}
                >
                  Join Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
