// app.js - Calculator logic & PWA bootstrap
(function () {
  'use strict';

  const display = document.getElementById('display');
  const keys = document.querySelector('.keys');

  let current = '0';
  let previous = null;
  let operator = null;
  let overwrite = true;

  function updateDisplay() {
    display.textContent = current;
  }

  function inputDigit(d) {
    if (overwrite) {
      current = d === '.' ? '0.' : d;
      overwrite = false;
      return;
    }

    if (d === '.' && current.includes('.')) return;
    if (current === '0' && d !== '.') {
      current = d;
    } else {
      current = current + d;
    }
  }

  function handleOperator(op) {
    if (operator !== null && !overwrite) {
      compute();
    }
    previous = parseFloat(current);
    operator = op;
    overwrite = true;
  }

  function compute() {
    if (operator === null || previous === null) return;
    const curr = parseFloat(current);
    let result = 0;
    switch (operator) {
      case '+': result = previous + curr; break;
      case '-': result = previous - curr; break;
      case '*': result = previous * curr; break;
      case '/':
        if (curr === 0) {
          current = 'Error';
          operator = null;
          previous = null;
          overwrite = true;
          return;
        }
        result = previous / curr;
        break;
    }

    // tidy result
    if (Number.isFinite(result)) {
      current = String(parseFloat(result.toPrecision(12)));
    } else {
      current = 'Error';
    }

    operator = null;
    previous = null;
    overwrite = true;
  }

  function clearAll() {
    current = '0';
    previous = null;
    operator = null;
    overwrite = true;
  }

  function deleteDigit() {
    if (overwrite || current.length === 1) {
      current = '0';
      overwrite = true;
      return;
    }
    current = current.slice(0, -1);
  }

  function toggleSign() {
    if (current === '0' || current === 'Error') return;
    current = current.startsWith('-') ? current.slice(1) : '-' + current;
  }

  keys.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (action) {
      switch (action) {
        case 'clear': clearAll(); break;
        case 'del': deleteDigit(); break;
        case 'posneg': toggleSign(); break;
        case 'equals': compute(); break;
      }
    } else if (value) {
      if (['+', '-', '*', '/'].includes(value)) {
        handleOperator(value);
      } else {
        inputDigit(value);
      }
    }

    updateDisplay();
  });

  document.addEventListener('keydown', (e) => {
    const key = e.key;

    // numeric or decimal
    if ((/^[0-9.]$/).test(key)) {
      e.preventDefault();
      inputDigit(key);
      updateDisplay();
      return;
    }

    if (key === 'Enter' || key === '=') {
      e.preventDefault();
      compute();
      updateDisplay();
      return;
    }

    if (key === 'Backspace') {
      e.preventDefault();
      deleteDigit();
      updateDisplay();
      return;
    }

    if (key === 'Escape') {
      e.preventDefault();
      clearAll();
      updateDisplay();
      return;
    }

    if (['+', '-', '*', '/'].includes(key)) {
      e.preventDefault();
      handleOperator(key);
      updateDisplay();
      return;
    }

    // Ctrl/Cmd+I => trigger install prompt (if available)
    if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'i') {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
          console.log('PWA install choice:', choice.outcome);
          deferredPrompt = null;
        });
      } else {
        console.log('Install prompt not available');
      }
    }
  });

  updateDisplay();
  
  // Service Worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      console.log('Service Worker registered:', reg);
    }).catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  }
  
  // Install UI (beforeinstallprompt + iOS instructions)
  let deferredPrompt = null;
  const installBtn = document.getElementById('installBtn');
  const iosInstall = document.getElementById('ios-install');
  const iosClose = iosInstall && iosInstall.querySelector('.ios-close');
  
  function isIos() {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  }
  
  function isInStandaloneMode() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone === true);
  }
  
  function updateInstallUI() {
    if (!installBtn) return;
    if (isInStandaloneMode()) {
      installBtn.hidden = true;
      return;
    }
    if (deferredPrompt) {
      installBtn.hidden = false;
      installBtn.textContent = 'Install';
    } else if (isIos()) {
      // Show install button on iOS so users can view instructions
      installBtn.hidden = false;
      installBtn.textContent = 'Install (iOS)';
    } else {
      installBtn.hidden = true;
    }
  }
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('beforeinstallprompt fired - you can call deferredPrompt.prompt() to show install');
    updateInstallUI();
  });
  
  // Click handler for the install button
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          const choice = await deferredPrompt.userChoice;
          console.log('PWA install choice:', choice.outcome);
        } catch (err) {
          console.warn('Install prompt failed:', err);
        } finally {
          deferredPrompt = null;
          updateInstallUI();
        }
      } else if (isIos()) {
        if (iosInstall) iosInstall.hidden = false;
      } else {
        console.log('Install prompt not available');
      }
    });
  }
  
  // Close handler for iOS overlay
  if (iosClose) {
    iosClose.addEventListener('click', () => {
      if (iosInstall) iosInstall.hidden = true;
    });
  }
  
  // close overlay when tapping outside or pressing Escape
  if (iosInstall) {
    iosInstall.addEventListener('click', (e) => {
      if (e.target === iosInstall) iosInstall.hidden = true;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') iosInstall.hidden = true;
    });
  }
  
  window.addEventListener('appinstalled', () => {
    console.log('App installed');
    deferredPrompt = null;
    updateInstallUI();
  });
  
  // initial UI state
  updateInstallUI();
  
})();