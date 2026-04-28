// ========== DOM Elements ==========
const amountValue = document.getElementById('amountValue');
const expressionPreview = document.getElementById('expressionPreview');
const keypadEl = document.getElementById('keypad');
const payBtn = document.getElementById('payBtn');
const cursorBlink = document.getElementById('cursorBlink');
const successOverlay = document.getElementById('successOverlay');
const successAmount = document.getElementById('successAmount');
const successDone = document.getElementById('successDone');
const currencyEl = document.querySelector('.currency');

// ========== State ==========
let input = '';
let lastResult = 0;

// ========== Key Layout ==========
const keys = [
  { label: '1', type: 'number' },
  { label: '2', type: 'number' },
  { label: '3', type: 'number' },
  { label: '+', type: 'operator' },
  { label: '4', type: 'number' },
  { label: '5', type: 'number' },
  { label: '6', type: 'number' },
  { label: '−', type: 'operator' },
  { label: '7', type: 'number' },
  { label: '8', type: 'number' },
  { label: '9', type: 'number' },
  { label: '×', type: 'operator' },
  { label: '.', type: 'number' },
  { label: '0', type: 'number' },
  { label: '⌫', type: 'action' },
  { label: '÷', type: 'operator' },
];

// ========== Build Keypad ==========
keys.forEach(k => {
  const btn = document.createElement('button');
  btn.className = `key key-${k.type}`;
  btn.textContent = k.label;
  btn.setAttribute('id', `key-${k.label}`);

  btn.addEventListener('click', (e) => {
    createRipple(e, btn);
    handlePress(k.label);
  });

  keypadEl.appendChild(btn);
});

// ========== Ripple Effect ==========
function createRipple(event, element) {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
  ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';
  element.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// ========== Safe Math Evaluator ==========
function safeEvaluate(expr) {
  // Replace display operators with JS operators
  let sanitized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');

  // Only allow numbers, operators, dots, parentheses, and spaces
  if (!/^[\d+\-*/.() ]+$/.test(sanitized)) return NaN;

  // Check for empty or incomplete expressions
  if (!sanitized.trim()) return NaN;

  // Remove trailing operator
  sanitized = sanitized.replace(/[+\-*/.]$/, '');
  if (!sanitized.trim()) return NaN;

  try {
    const result = Function('"use strict"; return (' + sanitized + ')')();
    if (typeof result !== 'number' || !isFinite(result)) return NaN;
    return Math.round(result * 100) / 100; // 2 decimal places
  } catch {
    return NaN;
  }
}

// ========== Input Validation ==========
function isOperator(ch) {
  return ['+', '−', '×', '÷'].includes(ch);
}

function canAppend(val) {
  const lastChar = input.slice(-1);

  // Prevent starting with operator (except minus for negative)
  if (input === '' && isOperator(val) && val !== '−') return false;

  // Prevent consecutive operators
  if (isOperator(val) && isOperator(lastChar)) return false;

  // Prevent multiple dots in same number
  if (val === '.') {
    const parts = input.split(/[+\−×÷]/);
    const currentNum = parts[parts.length - 1];
    if (currentNum.includes('.')) return false;
  }

  // Limit input length
  if (input.length >= 30) return false;

  return true;
}

// ========== Handle Keypress ==========
function handlePress(val) {
  if (val === '⌫') {
    input = input.slice(0, -1);
  } else {
    if (!canAppend(val)) return;
    input += val;
  }

  updateDisplay();
}

// ========== Update Display ==========
function updateDisplay() {
  const hasOperator = /[+\−×÷]/.test(input);
  const result = safeEvaluate(input);

  if (input === '') {
    amountValue.textContent = '0';
    expressionPreview.textContent = '';
    expressionPreview.classList.remove('has-expr');
    currencyEl.classList.remove('active');
    payBtn.disabled = true;
    payBtn.classList.remove('active');
    payBtn.querySelector('.pay-text').textContent = 'Enter Amount';
    lastResult = 0;
  } else if (!isNaN(result) && result > 0) {
    lastResult = result;
    currencyEl.classList.add('active');

    // Show expression in preview if it has operators
    if (hasOperator) {
      amountValue.textContent = formatNumber(result);
      expressionPreview.textContent = formatExpression(input) + ' = ₹' + formatNumber(result);
      expressionPreview.classList.add('has-expr');
    } else {
      amountValue.textContent = formatNumber(result);
      expressionPreview.textContent = '';
      expressionPreview.classList.remove('has-expr');
    }

    payBtn.disabled = false;
    payBtn.classList.add('active');
    payBtn.querySelector('.pay-text').textContent = 'Pay ₹' + formatNumber(result);

    // Pop animation
    amountValue.classList.add('pop');
    setTimeout(() => amountValue.classList.remove('pop'), 150);
  } else {
    // Expression in progress
    currencyEl.classList.add('active');
    expressionPreview.textContent = formatExpression(input);
    expressionPreview.classList.add('has-expr');

    if (lastResult > 0) {
      amountValue.textContent = formatNumber(lastResult);
    }
  }
}

// ========== Format Helpers ==========
function formatNumber(num) {
  if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(2) + 'L';

  const parts = num.toString().split('.');
  // Indian number formatting
  let intPart = parts[0];
  let formatted = '';
  if (intPart.length > 3) {
    formatted = intPart.slice(-3);
    intPart = intPart.slice(0, -3);
    while (intPart.length > 2) {
      formatted = intPart.slice(-2) + ',' + formatted;
      intPart = intPart.slice(0, -2);
    }
    formatted = intPart + ',' + formatted;
  } else {
    formatted = intPart;
  }

  return parts.length > 1 ? formatted + '.' + parts[1] : formatted;
}

function formatExpression(expr) {
  return expr
    .replace(/\+/g, ' + ')
    .replace(/−/g, ' − ')
    .replace(/×/g, ' × ')
    .replace(/÷/g, ' ÷ ');
}



// ========== Pay Button ==========
payBtn.addEventListener('click', () => {
  if (payBtn.disabled) return;
  showSuccess(lastResult);
});

// ========== Success Flow ==========
function showSuccess(amount) {
  successAmount.textContent = '₹' + formatNumber(amount);
  successOverlay.classList.add('show');
}

successDone.addEventListener('click', () => {
  successOverlay.classList.remove('show');
  // Reset
  input = '';
  lastResult = 0;
  updateDisplay();
});

// ========== Keyboard Support ==========
document.addEventListener('keydown', (e) => {
  const keyMap = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '.': '.', '+': '+', '-': '−', '*': '×', '/': '÷',
    'Backspace': '⌫', 'Delete': '⌫',
    'Enter': 'pay'
  };

  const mapped = keyMap[e.key];
  if (mapped === 'pay') {
    if (!payBtn.disabled) showSuccess(lastResult);
  } else if (mapped) {
    e.preventDefault();
    handlePress(mapped);

    // Visual feedback on key
    const keyEl = document.getElementById('key-' + mapped);
    if (keyEl) {
      keyEl.style.transform = 'scale(0.94)';
      setTimeout(() => keyEl.style.transform = '', 100);
    }
  }
});
