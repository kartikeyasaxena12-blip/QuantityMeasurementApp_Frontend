const UNITS = {
  LengthUnit:      ['Inches','Feet','Yards','Centimeters'],
  WeightUnit:      ['Grams','Kilograms','Pound'],
  TemperatureUnit: ['Celsius','Fahrenheit','Kelvin'],
  VolumeUnit:      ['Litre','MilliLiter','Gallon'],
};

const FACTORS = {
  LengthUnit:      { Inches:1, Feet:12, Yards:36, Centimeters:0.393701 },
  WeightUnit:      { Grams:0.001, Kilograms:1, Pound:0.453592 },
  VolumeUnit:      { Litre:1, MilliLiter:0.001, Gallon:3.78541 },
  TemperatureUnit: null,
};

function tempToBase(unit, v) {
  if (unit === 'Celsius')    return v;
  if (unit === 'Fahrenheit') return (v - 32) * 5/9;
  if (unit === 'Kelvin')     return v - 273.15;
}
function tempFromBase(unit, b) {
  if (unit === 'Celsius')    return b;
  if (unit === 'Fahrenheit') return b * 9/5 + 32;
  if (unit === 'Kelvin')     return b + 273.15;
}
function toBase(type, unit, val) {
  return type === 'TemperatureUnit' ? tempToBase(unit, val) : val * FACTORS[type][unit];
}
function fromBase(type, unit, base) {
  return type === 'TemperatureUnit' ? tempFromBase(unit, base) : base / FACTORS[type][unit];
}
function fmt(n) {
  return parseFloat(n.toFixed(6)).toString();
}

let currentType    = 'LengthUnit';
let currentAction  = 'comparison';
let currentArithOp = 'add';

const $ = id => document.getElementById(id);

function buildOptions(selectEl, type, selectedIndex = 0) {
  selectEl.innerHTML = UNITS[type].map((u, i) =>
    `<option value="${u}" ${i === selectedIndex ? 'selected' : ''}>${u}</option>`
  ).join('');
}

function refreshAllSelects() {
  buildOptions($('cmp-unit1'),        currentType, 0);
  buildOptions($('cmp-unit2'),        currentType, 1);
  buildOptions($('conv-unit1'),       currentType, 0);
  buildOptions($('conv-unit2'),       currentType, 1);
  buildOptions($('arith-unit1'),      currentType, 0);
  buildOptions($('arith-unit2'),      currentType, 1);
  buildOptions($('arith-result-unit'),currentType, 0);
  clearResults();
}

function clearResults() {
  ['cmp-result-box','conv-result-box','arith-result-box'].forEach(id => {
    const el = $(id); if (el) el.classList.remove('visible');
  });
}

function showPanel(action) {
  ['comparison','conversion','arithmetic'].forEach(a => {
    $(`panel-${a}`).style.display = a === action ? 'block' : 'none';
  });
  clearResults();
}

function showResult(prefix, text, isError = false) {
  const box = $(`${prefix}-result-box`);
  const val = $(`${prefix}-result-value`);
  box.classList.add('visible');
  if (isError) {
    val.innerHTML = `<span class="result-error">${text}</span>`;
  } else {
    val.textContent = text;
  }
}

// Type buttons
document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentType = btn.dataset.type;
    refreshAllSelects();
  });
});

// Action tabs
document.querySelectorAll('.action-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.action-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentAction = tab.dataset.action;
    showPanel(currentAction);
  });
});

// Arithmetic op buttons
const opSymbols = { add:'+', subtract:'−', divide:'÷' };
document.querySelectorAll('.arith-op-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.arith-op-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentArithOp = btn.dataset.op;
    $('arith-op-symbol').textContent = opSymbols[currentArithOp];
    clearResults();
  });
});

// Compare
$('cmp-btn').addEventListener('click', () => {
  const v1 = parseFloat($('cmp-val1').value);
  const v2 = parseFloat($('cmp-val2').value);
  const u1 = $('cmp-unit1').value, u2 = $('cmp-unit2').value;
  if (isNaN(v1) || isNaN(v2)) { showResult('cmp', 'Please enter valid numbers.', true); return; }
  const equal = Math.abs(toBase(currentType, u1, v1) - toBase(currentType, u2, v2)) < 1e-9;
  showResult('cmp', equal ? '✅ Equal' : '❌ Not Equal');
  $('cmp-result-value').style.color = equal ? '#16a34a' : '#dc2626';
});

// Convert
$('conv-btn').addEventListener('click', () => {
  const v1 = parseFloat($('conv-val1').value);
  const u1 = $('conv-unit1').value, u2 = $('conv-unit2').value;
  if (isNaN(v1)) { showResult('conv', 'Please enter a valid number.', true); return; }
  const result = fromBase(currentType, u2, toBase(currentType, u1, v1));
  showResult('conv', `${fmt(result)} ${u2}`);
  $('conv-result-value').style.color = 'var(--primary)';
});

// Arithmetic
$('arith-btn').addEventListener('click', () => {
  const v1 = parseFloat($('arith-val1').value);
  const v2 = parseFloat($('arith-val2').value);
  const u1 = $('arith-unit1').value, u2 = $('arith-unit2').value;
  const resUnit = $('arith-result-unit').value;
  if (isNaN(v1) || isNaN(v2)) { showResult('arith', 'Please enter valid numbers.', true); return; }
  const b1 = toBase(currentType, u1, v1);
  const b2 = toBase(currentType, u2, v2);
  let baseResult;
  if (currentArithOp === 'add')           baseResult = b1 + b2;
  else if (currentArithOp === 'subtract') baseResult = b1 - b2;
  else if (currentArithOp === 'divide') {
    if (b2 === 0) { showResult('arith', 'Cannot divide by zero.', true); return; }
    baseResult = b1 / b2;
  }
  showResult('arith', fmt(fromBase(currentType, resUnit, baseResult)));
  $('arith-result-value').style.color = 'var(--primary)';
});

// Init
refreshAllSelects();