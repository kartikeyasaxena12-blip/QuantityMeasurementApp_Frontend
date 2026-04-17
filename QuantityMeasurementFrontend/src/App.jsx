import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import {
  compareQuantities,
  convertQuantity,
  operateQuantities,
  getHistoryByOperation,
  getHistoryByMeasurementType,
  getErrorHistory,
} from './services/api';
import { isLoggedIn, logout, getUser } from './services/auth';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

const UNITS = {
  LengthUnit: ['Inches', 'Feet', 'Yards', 'Centimeters'],
  WeightUnit: ['Grams', 'Kilograms', 'Pound'],
  TemperatureUnit: ['Celsius', 'Fahrenheit', 'Kelvin'],
  VolumeUnit: ['Litre', 'MilliLiter', 'Gallon'],
};

const ICONS = {
  LengthUnit: '✏️',
  WeightUnit: '⚖️',
  TemperatureUnit: '🌡️',
  VolumeUnit: '🧊',
};

const LABELS = {
  LengthUnit: 'Length',
  WeightUnit: 'Weight',
  TemperatureUnit: 'Temperature',
  VolumeUnit: 'Volume',
};

const OP_BADGE = {
  COMPARE:  { color: '#6366f1', bg: '#eef0fd', label: 'Compare' },
  CONVERT:  { color: '#0ea5e9', bg: '#e0f4fe', label: 'Convert' },
  ADD:      { color: '#16a34a', bg: '#dcfce7', label: 'Add' },
  SUBTRACT: { color: '#f59e0b', bg: '#fef9c3', label: 'Subtract' },
  DIVIDE:   { color: '#ef4444', bg: '#fee2e2', label: 'Divide' },
};

// History Panel
function HistoryPanel() {
  const [filterMode, setFilterMode] = useState('operation');
  const [selectedOp, setSelectedOp] = useState('COMPARE');
  const [selectedType, setSelectedType] = useState('LengthUnit');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (filterMode === 'operation') data = await getHistoryByOperation(selectedOp);
      else if (filterMode === 'type') data = await getHistoryByMeasurementType(selectedType);
      else data = await getErrorHistory();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.response?.status === 401) return; // Axios interceptor handles 401
      setError('Failed to load history. Is the backend running?');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterMode, selectedOp, selectedType]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatValue = (row) => {
    if (row.isError) return <span className="hist-error-badge">Error</span>;
    if (row.resultString) return <span className="hist-result">{row.resultString}</span>;
    if (row.resultValue !== undefined && row.resultValue !== 0)
      return <span className="hist-result">{Number(row.resultValue.toFixed(6))} {row.resultUnit || ''}</span>;
    return <span className="hist-muted">—</span>;
  };

  const opStyle = (op) => OP_BADGE[op?.toUpperCase()] || { color: '#7C82A0', bg: '#f4f5fb', label: op };

  return (
    <div className="history-panel">
      {/* Filter Tabs */}
      <div className="hist-filter-bar">
        <button
          className={`hist-filter-btn ${filterMode === 'operation' ? 'active' : ''}`}
          onClick={() => setFilterMode('operation')}
        >By Operation</button>
        <button
          className={`hist-filter-btn ${filterMode === 'type' ? 'active' : ''}`}
          onClick={() => setFilterMode('type')}
        >By Type</button>
        <button
          className={`hist-filter-btn hist-filter-err ${filterMode === 'errors' ? 'active' : ''}`}
          onClick={() => setFilterMode('errors')}
        >Errors Only</button>
      </div>

      {/* Sub-filter */}
      {filterMode === 'operation' && (
        <div className="hist-sub-filter">
          {['COMPARE', 'CONVERT', 'ADD', 'SUBTRACT', 'DIVIDE'].map(op => (
            <button
              key={op}
              className={`hist-op-pill ${selectedOp === op ? 'active' : ''}`}
              style={selectedOp === op ? { background: opStyle(op).bg, color: opStyle(op).color, borderColor: opStyle(op).color } : {}}
              onClick={() => setSelectedOp(op)}
            >
              {opStyle(op).label}
            </button>
          ))}
        </div>
      )}
      {filterMode === 'type' && (
        <div className="hist-sub-filter">
          {Object.keys(LABELS).map(t => (
            <button
              key={t}
              className={`hist-op-pill ${selectedType === t ? 'active' : ''}`}
              onClick={() => setSelectedType(t)}
            >
              {ICONS[t]} {LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="hist-refresh-row">
        <span className="hist-count">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        <button className="hist-refresh-btn" onClick={fetchHistory}>↻ Refresh</button>
      </div>

      {/* Content */}
      {loading && <div className="hist-empty">Loading…</div>}
      {error && <div className="hist-empty hist-error-text">{error}</div>}
      {!loading && !error && records.length === 0 && (
        <div className="hist-empty">No records found.</div>
      )}
      {!loading && !error && records.length > 0 && (
        <div className="hist-list">
          {records.map((row, i) => {
            const op = opStyle(row.operation);
            return (
              <div key={i} className={`hist-card ${row.isError ? 'hist-card-error' : ''}`}>
                <div className="hist-card-top">
                  <span className="hist-badge" style={{ background: op.bg, color: op.color }}>{op.label}</span>
                  <span className="hist-type">{row.thisMeasurementType || row.operationType || ''}</span>
                  <span className="hist-time">
                    {row.timestamp ? new Date(row.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <div className="hist-card-body">
                  <div className="hist-operands">
                    <span className="hist-qty">{row.thisValue} <em>{row.thisUnit}</em></span>
                    {row.thatValue !== undefined && row.thatUnit && (
                      <>
                        <span className="hist-op-sym">
                          {{ ADD: '+', SUBTRACT: '−', DIVIDE: '÷', COMPARE: '=?', CONVERT: '→' }[row.operation?.toUpperCase()] || '·'}
                        </span>
                        <span className="hist-qty">{row.thatValue} <em>{row.thatUnit}</em></span>
                      </>
                    )}
                  </div>
                  <div className="hist-result-col">
                    {formatValue(row)}
                    {row.isError && row.errorMessage && (
                      <span className="hist-error-msg">{row.errorMessage}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main App
export default function App() {
  const [authStatus, setAuthStatus] = useState(isLoggedIn() ? 'authenticated' : 'login');
  const [mainTab, setMainTab] = useState('calculator');
  const [currentType, setCurrentType] = useState('LengthUnit');
  const [currentAction, setCurrentAction] = useState('comparison');
  const [currentArithOp, setCurrentArithOp] = useState('add');

  const [val1, setVal1] = useState(1);
  const [unit1, setUnit1] = useState('');
  const [val2, setVal2] = useState(1);
  const [unit2, setUnit2] = useState('');
  const [resUnit, setResUnit] = useState('');

  const [result, setResult] = useState(null);
  const user = getUser();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      const defaultUnits = UNITS[currentType];
      setUnit1(defaultUnits[0]);
      setUnit2(defaultUnits[1] || defaultUnits[0]);
      setResUnit(defaultUnits[0]);
      setResult(null);
    }
  }, [currentType, currentAction, authStatus]);

  const handleLogout = () => {
    logout();
    setAuthStatus('login');
  };

  const handleCompare = async () => {
    try {
      const res = await compareQuantities(currentType, unit1, val1, unit2, val2);
      if (res.isError) { setResult({ text: res.errorMessage || 'Error occurred', isError: true }); return; }
      const isEqual = res.resultString === 'true' || res.resultString === 'Equal';
      setResult({ text: isEqual ? '✅ Equal' : '❌ Not Equal', isError: false, color: isEqual ? '#16a34a' : '#dc2626' });
    } catch (error) {
      if (error.response?.status !== 401) {
        setResult({ text: error.response?.data?.message || 'Server error', isError: true });
      }
    }
  };

  const handleConvert = async () => {
    try {
      const res = await convertQuantity(currentType, unit1, val1, unit2);
      if (res.isError) { setResult({ text: res.errorMessage || 'Error occurred', isError: true }); return; }
      setResult({ text: `${Number(res.resultValue.toFixed(6))} ${unit2}`, isError: false, color: 'var(--primary)' });
    } catch (error) {
      if (error.response?.status !== 401) {
        setResult({ text: error.response?.data?.message || 'Server error', isError: true });
      }
    }
  };

  const handleArithmetic = async () => {
    try {
      const res = await operateQuantities(currentArithOp, currentType, unit1, val1, unit2, val2);
      if (res.isError) { setResult({ text: res.errorMessage || 'Error occurred', isError: true }); return; }
      let finalVal = res.resultValue;
      let returnedUnit = res.resultUnit || unit1;
      if (returnedUnit.toUpperCase() !== resUnit.toUpperCase()) {
        const convRes = await convertQuantity(currentType, returnedUnit, finalVal, resUnit);
        if (convRes.isError) { setResult({ text: convRes.errorMessage || 'Error converting result', isError: true }); return; }
        finalVal = convRes.resultValue;
      }
      setResult({ text: `${Number(finalVal.toFixed(6))} ${resUnit}`, isError: false, color: 'var(--primary)' });
    } catch (error) {
      if (error.response?.status !== 401) {
        setResult({ text: error.response?.data?.message || 'Server error', isError: true });
      }
    }
  };

  const opSymbols = { add: '+', subtract: '−', divide: '÷' };

  if (authStatus === 'login') {
    return <LoginPage 
      onLoginSuccess={() => setAuthStatus('authenticated')} 
      onSwitchToRegister={() => setAuthStatus('register')} 
    />;
  }

  if (authStatus === 'register') {
    return <RegisterPage 
      onRegisterSuccess={() => setAuthStatus('authenticated')} 
      onSwitchToLogin={() => setAuthStatus('login')} 
    />;
  }

  return (
    <>
      <header>
        <h1>Quantity Measurement</h1>
        
        {authStatus === 'authenticated' && (
          <>
            <div className="user-info">
              <span className="username-display">
                <span className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
                {user?.username}
              </span>
              <button onClick={handleLogout} className="logout-link">Logout</button>
            </div>
            
            <div className="main-tabs">
              <button
                className={`main-tab-btn ${mainTab === 'calculator' ? 'active' : ''}`}
                onClick={() => setMainTab('calculator')}
              >🧮 Calculator</button>
              <button
                className={`main-tab-btn ${mainTab === 'history' ? 'active' : ''}`}
                onClick={() => setMainTab('history')}
              >📋 History</button>
            </div>
          </>
        )}
      </header>

      <main>
        {mainTab === 'calculator' ? (
          <div className="card">
            {/* CHOOSE TYPE */}
            <div className="section-label">Choose Type</div>
            <div className="type-grid">
              {['LengthUnit', 'WeightUnit', 'TemperatureUnit', 'VolumeUnit'].map(type => (
                <button key={type} className={`type-btn ${currentType === type ? 'active' : ''}`} onClick={() => setCurrentType(type)}>
                  <span className="icon">{ICONS[type]}</span>
                  <span className="label">{LABELS[type]}</span>
                </button>
              ))}
            </div>

            {/* CHOOSE ACTION */}
            <div className="section-label">Choose Action</div>
            <div className="action-tabs">
              {['comparison', 'conversion', 'arithmetic'].map(action => (
                <button key={action} className={`action-tab ${currentAction === action ? 'active' : ''}`} onClick={() => setCurrentAction(action)}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>

            {/* PANELS */}
            {currentAction === 'comparison' && (
              <div id="panel-comparison">
                <div className="input-row two-col">
                  <div className="field-group">
                    <label>From</label>
                    <input type="number" value={val1} onChange={e => setVal1(e.target.value)} step="any" />
                    <select value={unit1} onChange={e => setUnit1(e.target.value)}>
                      {UNITS[currentType].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="operator">=</div>
                  <div className="field-group">
                    <label>To</label>
                    <input type="number" value={val2} onChange={e => setVal2(e.target.value)} step="any" />
                    <select value={unit2} onChange={e => setUnit2(e.target.value)}>
                      {UNITS[currentType].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                {result && (
                  <div className="result-box visible">
                    <div className="result-label">Result</div>
                    <div className="result-value" style={{ color: result.color }}>
                      {result.isError ? <span className="result-error">{result.text}</span> : result.text}
                    </div>
                  </div>
                )}
                <button className="calc-btn" onClick={handleCompare}>Compare</button>
              </div>
            )}

            {currentAction === 'conversion' && (
              <div id="panel-conversion">
                <div className="input-row two-col">
                  <div className="field-group">
                    <label>From</label>
                    <input type="number" value={val1} onChange={e => setVal1(e.target.value)} step="any" />
                    <select value={unit1} onChange={e => setUnit1(e.target.value)}>
                      {UNITS[currentType].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="operator">→</div>
                  <div className="field-group">
                    <label>To Unit</label>
                    <select value={unit2} onChange={e => setUnit2(e.target.value)} style={{ marginTop: '24px' }}>
                      {UNITS[currentType].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                {result && (
                  <div className="result-box visible">
                    <div className="result-label">Result</div>
                    <div className="result-value" style={{ color: result.color }}>
                      {result.isError ? <span className="result-error">{result.text}</span> : result.text}
                    </div>
                  </div>
                )}
                <button className="calc-btn" onClick={handleConvert}>Convert</button>
              </div>
            )}

            {currentAction === 'arithmetic' && (
              <div id="panel-arithmetic">
                <div className="arith-ops">
                  {['add', 'subtract', 'divide'].map(op => (
                    <button key={op} className={`arith-op-btn ${currentArithOp === op ? 'active' : ''}`}
                      onClick={() => { setCurrentArithOp(op); setResult(null); }}>
                      {op === 'add' ? '+ Add' : op === 'subtract' ? '− Subtract' : '÷ Divide'}
                    </button>
                  ))}
                </div>
                <div className="input-row two-col">
                  <div className="field-group">
                    <label>Value 1</label>
                    <input type="number" value={val1} onChange={e => setVal1(e.target.value)} step="any" />
                    <select value={unit1} onChange={e => setUnit1(e.target.value)}>
                      {UNITS[currentType].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="operator">{opSymbols[currentArithOp]}</div>
                  <div className="field-group">
                    <label>Value 2</label>
                    <input type="number" value={val2} onChange={e => setVal2(e.target.value)} step="any" />
                    <select value={unit2} onChange={e => setUnit2(e.target.value)}>
                      {UNITS[currentType].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className={`result-box ${result ? 'visible' : ''}`} style={{ display: result ? 'block' : 'none' }}>
                  <div className="result-label">Result</div>
                  <div className="result-row">
                    <div className="result-value" style={{ color: result?.color }}>
                      {result?.isError ? <span className="result-error">{result.text}</span> : (result?.text || '—')}
                    </div>
                    <select value={resUnit} onChange={e => { setResUnit(e.target.value); setResult(null); }}>
                      {UNITS[currentType].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <button className="calc-btn" onClick={handleArithmetic}>Calculate</button>
              </div>
            )}
          </div>
        ) : (
          <div className="card card-wide">
            <HistoryPanel />
          </div>
        )}
      </main>

      <footer>
        <p>Quantity Measurement App</p>
      </footer>
    </>
  );
}
