// ==========================
// Calculator script (commented for learning)
// - clear, history, arithmetic, decimal handling, UI update, keyboard support
// - comments are intentionally verbose to help learning
// ==========================

// ----- state variables -----
// what is shown on the main line (string because user types digits and ".")
let screenValue = "0";

// text representing the partial equation (e.g. "5 × ")
let equationDisplay = "";

// numeric running total used when chaining operations
let runningTotal = 0;

// the operator waiting to be applied next ("+", "−", "×", "÷", or "=")
let previousOperator = null;

// flag: after pressing an operator we expect the user to type a new number
let expectingNewNumber = false;

// cached reference to the display element (DOM)
const screen = document.querySelector(".Display");

// ----- in-memory history (session only) -----
// we push strings like "5 × 3 = 15" here
const history = [];

/*
  addToHistory(entry)
  - pushes an entry into the in-memory history and refreshes the UI list
*/
function addToHistory(entry) {
  history.push(entry);
  renderHistory();
}

/*
  renderHistory()
  - finds the History list element and renders items in reverse order
  - each item receives a click handler that loads the result back into the display
*/
function renderHistory() {
  const list = document.getElementById("HistoryList");
  if (!list) return;
  list.innerHTML = "";

  // render newest first
  for (let i = history.length - 1; i >= 0; i--) {
    const li = document.createElement("li");
    li.className = "History__item";
    li.textContent = history[i];
    li.dataset.index = i;

    // clicking a history item loads its result into the screen area
    li.addEventListener("click", () => {
      // each history entry is "equation = result", we split by " = "
      const parts = history[i].split(" = ");
      const result = parts.length > 1 ? parts[1].trim() : parts[0].trim();

      // load the result as the current screen value and clear the equation
      screenValue = result;
      equationDisplay = "";
      previousOperator = null;
      expectingNewNumber = false;
      rerender();

      // close the panel after selection (UX choice)
      const panel = document.getElementById("History");
      if (panel) {
        panel.hidden = true;
        panel.classList.remove("is-open");
      }
    });

    list.appendChild(li);
  }
}

/*
  getButtonValue(btn)
  - prefer using data-action attribute when present (keeps UI symbols separate from logic)
  - maps semantic data-action values to the symbols the calculator logic expects
  - if no data-action, returns the visible text (useful for numeric buttons and ".")
*/
function getButtonValue(btn) {
  if (btn.dataset && btn.dataset.action) {
    const a = btn.dataset.action;
    const map = {
      multiply: "×",
      add: "+",
      subtract: "−",
      divide: "÷",
      equals: "=",
      percent: "%",
      clear: "C",
      backspace: "←",
    };
    return map[a] ?? a; // return mapped symbol or the raw action if it's a digit string
  }
  return btn.innerText.trim();
}

/*
  mapKeyToButton(key)
  - maps keyboard keys to calculator button values
  - allows full keyboard operation of the calculator
*/
function mapKeyToButton(key) {
  const keyMap = {
    0: "0",
    1: "1",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
    7: "7",
    8: "8",
    9: "9",
    ".": ".",
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷",
    Enter: "=",
    "=": "=",
    Escape: "C",
    c: "C",
    C: "C",
    Backspace: "←",
    "%": "%",
    h: "history-toggle", // special case for history
    H: "history-toggle",
  };

  return keyMap[key] || null;
}

/*
  buttonClick(value)
  - entry point for all button presses (both mouse clicks and keyboard)
  - decides whether the value is a digit / dot or a symbol (operator/function)
  - using regex /^[0-9.]$/ treats "." as part of number input
*/
function buttonClick(value) {
  if (value === "history-toggle") {
    toggleHistory();
    return;
  }

  if (/^[0-9.]$/.test(value)) {
    handleNumber(value);
  } else {
    handleSymbol(value);
  }
}

/*
  handleNumber(number)
  - handles typing digits and the decimal point
  - deals with:
      * starting a new number after an operator (expectingNewNumber)
      * starting a fresh input after "="
      * preventing multiple dots in the same number
*/
function handleNumber(number) {
  // If previous action was "=" and user types a number, reset calculator state for new entry
  if (previousOperator === "=" && !expectingNewNumber) {
    screenValue = "0";
    previousOperator = null;
    runningTotal = 0;
  }

  // If we are waiting for a new number (after an operator),
  // the first digit replaces the screenValue (we don't show "0")
  if (expectingNewNumber) {
    screenValue = number === "." ? "0." : number;
    expectingNewNumber = false;
    rerender();
    return;
  }

  // Decimal point handling: prevent duplicate dots
  if (number === ".") {
    if (screenValue.includes(".")) return;
    screenValue = screenValue === "0" ? "0." : screenValue + ".";
    rerender();
    return;
  }

  // Normal digit: replace leading "0" or append
  if (screenValue === "0") {
    screenValue = number;
  } else {
    screenValue += number;
  }
  rerender();
}

/*
  handleMath(value)
  - called when user presses an operator (+, −, ×, ÷)
  - if there's a pending operator and the user already typed the next number,
    we flush (apply) the previous operator first so chaining works (e.g. 2 + 3 × 4 pattern)
  - we do NOT immediately set screenValue to "0" — we mark expectingNewNumber so the UI stays clear
*/
function handleMath(value) {
  const current = Number(screenValue);

  // if there is a pending operator and the user has provided the next number,
  // compute the intermediate runningTotal first
  if (previousOperator && previousOperator !== "=" && !expectingNewNumber) {
    flushOperation(current);
    equationDisplay = String(removeTrailingZero(runningTotal)) + " " + value + " ";
  } else {
    // start a new equation with the displayed number
    equationDisplay = String(removeTrailingZero(current)) + " " + value + " ";
    runningTotal = current;
  }

  previousOperator = value;
  expectingNewNumber = true;
  rerender();
}

/*
  flushOperation(intScreenValue)
  - applies the pending operator (stored in previousOperator) to runningTotal and intScreenValue
  - supports +, −, ×, ÷ and protects against division by zero
*/
function flushOperation(intScreenValue) {
  if (!previousOperator) return;
  if (previousOperator === "+") {
    runningTotal += intScreenValue;
  } else if (previousOperator === "−") {
    runningTotal -= intScreenValue;
  } else if (previousOperator === "×") {
    runningTotal *= intScreenValue;
  } else if (previousOperator === "÷") {
    if (intScreenValue === 0) {
      runningTotal = NaN; // will display "Erro" later
    } else {
      runningTotal /= intScreenValue;
    }
  }
}

/*
  handleSymbol(symbol)
  - responds to control keys: C, =, ←, %, and operator symbols routed to handleMath
  - "=" finalizes the current equation, stores it in history and shows the result
*/
function handleSymbol(symbol) {
  switch (symbol) {
    case "C":
      // reset everything
      screenValue = "0";
      equationDisplay = "";
      runningTotal = 0;
      previousOperator = null;
      expectingNewNumber = false;
      break;

    case "=":
      // nothing to calculate if operator is missing
      if (!previousOperator || previousOperator === "=") {
        equationDisplay = screenValue;
        break;
      }

      // apply the pending operator using the current screen value
      flushOperation(Number(screenValue));
      const result = isFinite(runningTotal) ? removeTrailingZero(runningTotal) : "Erro";

      // build a human readable equation string: "5 × 3 = 15"
      if (/\s[+\-×÷]\s$/.test(equationDisplay)) {
        equationDisplay = equationDisplay + screenValue + " = " + result;
      } else {
        equationDisplay = screenValue + " = " + result;
      }

      // add to history and update display
      addToHistory(equationDisplay);
      screenValue = String(result);
      previousOperator = "=";
      expectingNewNumber = false;
      break;

    case "←":
      // backspace: remove last digit or reset to "0"
      if (screenValue.length === 1 || screenValue === "Erro") {
        screenValue = "0";
      } else {
        screenValue = screenValue.substring(0, screenValue.length - 1);
      }
      break;

    case "%": {
      // percent converts current number into fraction (50% -> 0.5)
      const current = Number(screenValue);
      const res = current / 100;
      screenValue = String(removeTrailingZero(res));
      if (equationDisplay === "") {
        equationDisplay = screenValue;
      } else {
        // replace last numeric segment in equationDisplay with percent result
        equationDisplay = equationDisplay.replace(/([0-9.]+)$/, screenValue);
      }
      break;
    }

    case "+":
    case "−":
    case "÷":
    case "×":
      // operator buttons reuse handleMath
      handleMath(symbol);
      break;

    default:
      // unknown symbol: ignore (keeps the app robust)
      break;
  }

  // after any symbol handling, update the UI
  rerender();
}

/*
  toggleHistory()
  - toggles the history panel open/closed
  - called by keyboard shortcut 'h' or clicking the history button
*/
function toggleHistory() {
  const panel = document.getElementById("History");
  if (!panel) return;

  if (panel.classList.contains("is-open")) {
    // close panel
    panel.classList.remove("is-open");
    panel.addEventListener("transitionend", function onEnd() {
      panel.hidden = true;
      panel.removeEventListener("transitionend", onEnd);
    });
  } else {
    // open panel
    panel.hidden = false;
    void panel.offsetWidth; // force reflow
    panel.classList.add("is-open");
  }
}

/*
  removeTrailingZero(num)
  - converts floating numbers to a string with a cleaner representation:
    Number.parseFloat removes unnecessary trailing zeros in many cases
  - returns "Erro" for NaN/Infinity earlier in the logic, so check isFinite before calling
*/
function removeTrailingZero(num) {
  if (!isFinite(num)) return num;
  return String(Number.parseFloat(num));
}

/*
  init()
  - attaches event listeners:
    * event delegation for all calculator buttons (safer than per-button listeners)
    * keyboard event listener for full keyboard support
    * history toggle and close with animation-friendly hidden handling
*/
function init() {
  const container = document.querySelector(".Buttons");
  if (!container) return;

  // delegate clicks on the buttons container (works when click is on child elements)
  container.addEventListener("click", function (event) {
    const btn = event.target.closest("button");
    if (!btn) return;
    const value = getButtonValue(btn);
    buttonClick(value);
  });

  // keyboard support: listen for keydown events on the document
  document.addEventListener("keydown", function (event) {
    // prevent default behavior for calculator keys to avoid browser shortcuts
    const mappedKey = mapKeyToButton(event.key);
    if (mappedKey) {
      event.preventDefault();
      buttonClick(mappedKey);
    }
  });

  // history panel toggling: use class .is-open + hidden attribute for animation control
  const toggle = document.getElementById("HistoryToggle");
  const panel = document.getElementById("History");
  const close = document.getElementById("HistoryClose");

  if (toggle && panel) {
    toggle.addEventListener("click", toggleHistory);
  }

  if (close && panel) {
    close.addEventListener("click", () => {
      panel.classList.remove("is-open");
      panel.addEventListener("transitionend", function onEnd() {
        panel.hidden = true;
        panel.removeEventListener("transitionend", onEnd);
      });
    });
  }

  // populate UI if history already has items
  renderHistory();
}

/*
  rerender()
  - updates the Display element according to current state
  - shows equationDisplay (top) and the current input (bottom) when relevant
  - note: the Display element is one element; we keep a simple rendering.
    If you want two separate lines (equation + value) consider using two DOM elements
    inside the .Display and update each independently.
*/
function rerender() {
  if (!screen) return;

  if (equationDisplay && equationDisplay.length > 0 && previousOperator !== "=") {
    // when expecting new number we show the equation and an empty bottom
    const bottom = expectingNewNumber ? "" : screenValue;
    screen.innerText = equationDisplay + " " + bottom;
  } else if (equationDisplay && previousOperator === "=") {
    screen.innerText = equationDisplay;
  } else {
    screen.innerText = screenValue;
  }
}

// initialize the app when the page loads
init();
