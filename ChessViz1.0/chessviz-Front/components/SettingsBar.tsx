import React, { useState } from "react";
import styles from "../styles/SettingsBar.module.css";

const SettingsBar = ({ settings }) => {
  const [dropdownsVisible, setDropdownsVisible] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});

  const toggleDropdown = (label) => {
    setDropdownsVisible((prevDropdowns) => ({
      ...prevDropdowns,
      [label]: !prevDropdowns[label],
    }));
  };

  const handleOptionChange = (label, option) => {
    setSelectedOptions((prevOptions) => ({
      ...prevOptions,
      [label]: option,
    }));
  };

  return (
    <div className={styles.settingsBar}>
      <div className={styles.title}>Settings</div>
      <div className={styles.buttons}>
        {settings.map((setting) => (
          <div key={setting.label} className={styles.setting}>
            <div
              className={styles.label}
              onClick={() => toggleDropdown(setting.label)}
            >
              {setting.label}
            </div>
            {dropdownsVisible[setting.label] && (
              <div className={styles.dropdown}>
                {setting.options.map((option) => (
                  <div key={option} className={styles.option}>
                    <label htmlFor={`${setting.label}-${option}`}>
                      {option}
                    </label>
                    <input
                      type="checkbox"
                      id={`${setting.label}-${option}`}
                      checked={selectedOptions[setting.label] === option}
                      onChange={() => handleOptionChange(setting.label, option)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsBar;
