import React, { createContext, useState, useContext } from 'react';
import { Collapse, Typography, Slider, InputNumber, Radio, Space } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import './AdvancedSettings.css';

const { Panel } = Collapse;
const { Text } = Typography;

// Create context
const AdvancedSettingsContext = createContext();

// Provider component
export const AdvancedSettingsProvider = ({ children }) => {
  const [slippage, setSlippage] = useState(1);
  const [deadlineMinutes, setDeadlineMinutes] = useState(10);
  const [gasFeeOption, setGasFeeOption] = useState('normal');

  const handleSlippageChange = (value) => {
    setSlippage(value);
  };

  const handleDeadlineChange = (value) => {
    setDeadlineMinutes(value);
  };

  const handleGasFeeOptionChange = (e) => {
    setGasFeeOption(e.target.value);
  };

  return (
    <AdvancedSettingsContext.Provider
      value={{
        slippage,
        deadlineMinutes,
        gasFeeOption,
        handleSlippageChange,
        handleDeadlineChange,
        handleGasFeeOptionChange,
      }}
    >
      {children}
    </AdvancedSettingsContext.Provider>
  );
};

// Custom hook for using the context
export const useAdvancedSettings = () => useContext(AdvancedSettingsContext);

// AdvancedSettings component
const AdvancedSettings = ({ showSlippage = true, showDeadline = true }) => {
  const {
    slippage,
    deadlineMinutes,
    gasFeeOption,
    handleSlippageChange,
    handleDeadlineChange,
    handleGasFeeOptionChange,
  } = useAdvancedSettings();

  const panelContent = (
    <Space direction="vertical" style={{ width: '100%' }}>
      {showSlippage && (
        <div className="slippage-control">
          <Text className="slippage-label">Slippage: {slippage}%</Text>
          <Slider
            className="slippage-slider"
            min={0.1}
            max={5}
            step={0.1}
            value={slippage}
            onChange={handleSlippageChange}
          />
        </div>
      )}
      <div className="settings-content">
        {showDeadline && (
          <div className="setting-item">
            <Text className="setting-label">Deadline (minutes)</Text>
            <InputNumber
              min={1}
              max={60}
              value={deadlineMinutes}
              onChange={handleDeadlineChange}
              className="deadline-input"
            />
          </div>
        )}
        <div className="setting-item">
          <Text className="setting-label">Gas Fee</Text>
          <Radio.Group 
            onChange={handleGasFeeOptionChange} 
            value={gasFeeOption}
            className="gas-fee-radio-group"
          >
            <Radio.Button value="normal">Normal</Radio.Button>
            <Radio.Button value="fast">Fast</Radio.Button>
            <Radio.Button value="fastest">Fastest</Radio.Button>
          </Radio.Group>
        </div>
      </div>
    </Space>
  );

  const items = [
    {
      key: '1',
      label: 'Advanced Transaction Settings',
      children: panelContent,
    },
  ];

  return (
    <Collapse
      ghost
      expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} />}
      items={items}
    />
  );
};

export default AdvancedSettings;