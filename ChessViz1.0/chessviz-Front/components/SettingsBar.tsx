import React, { useState } from "react";
import styles from "../styles/SettingsBar.module.css";

interface Setting {
  label: string;
  options: string[];
}

interface DropdownsVisibleState {
  [label: string]: boolean;
}

interface SelectedOptionsState {
  [label: string]: string | undefined;
}

interface SettingsBarProps {
  settings: Setting[];
}

const SettingsBar: React.FC<SettingsBarProps> = ({ settings }) => {
  const [dropdownsVisible, setDropdownsVisible] =
    useState<DropdownsVisibleState>({});
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptionsState>(
    {}
  );

  const toggleDropdown = (label: string) => {
    setDropdownsVisible((prevDropdowns) => ({
      ...prevDropdowns,
      [label]: !prevDropdowns[label],
    }));
  };

  const handleOptionChange = (label: string, option: string) => {
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
