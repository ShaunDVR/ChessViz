import React from "react";
import styles from "../styles/InfoPanel.module.css";

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
              <input
                type="text"
                value={InfoPanelProps.inputValue}
                onChange={InfoPanelProps.onInputChange}
              />
            </div>
          )}
          {InfoPanelProps.gameSessionRoom === "" && (
            <div className={styles.buttonWrapper}>
              <button onClick={InfoPanelProps.onButtonClick}>Join Game</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfoPanel;
