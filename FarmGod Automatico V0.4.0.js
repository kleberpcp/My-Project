// ==UserScript==
// @name         FarmGod Automático v0.4.0
// @namespace    http://tampermonkey.net/
// @version      0.4.0
// @description  Farm Automático
// @author       phxy
// @match        https://*/*screen=am_farm*
// @require      https://code.jquery.com/jquery-2.2.4.min.js
// @downloadURL  https://raw.githubusercontent.com/kleberpcp/scriptstw/master/FarmGod%20Automatico%20V0.4.0.js?token=GHSAT0AAAAAACTBMW3BFEF4YSC5EG4D26S2ZS2RP7Q
// @updateURL    https://github.com/kleberpcp/scriptstw/blob/master/FarmGod%20Automatico%20V0.4.0.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Traz a aba para a frente
    window.focus();

    // Verifica se o elemento #botprotection_quest está presente
    if (document.querySelector('#botprotection_quest')) {
        console.log('Bot protection detected, stopping script execution.');
        return; // Para a execução do script se o elemento estiver presente
    }

    const elementSelector = '#FarmGodProgessbar';
    const minEnterDelay = 100;
    const maxEnterDelay = 200;
    const minButtonClickDelay = 2000;
    const maxButtonClickDelay = 4000;
    let popupChecked = false;
    let farmRowsPresent = true;
    let worker;

    function createWorker() {
        const blob = new Blob([`
            self.addEventListener('message', function(e) {
                const { action, minEnterDelay, maxEnterDelay, minButtonClickDelay, maxButtonClickDelay } = e.data;

                function getRandomNumber(min, max) {
                    return Math.floor(Math.random() * (max - min + 1)) + min;
                }

                function pressEnter() {
                    const nextPressDelay = getRandomNumber(minEnterDelay, maxEnterDelay);
                    self.postMessage({ action: 'pressEnter', nextPressDelay });
                    setTimeout(pressEnter, nextPressDelay);
                }

                function scheduleClickPlanFarmsButton() {
                    const nextClickDelay = getRandomNumber(minButtonClickDelay, maxButtonClickDelay);
                    self.postMessage({ action: 'clickPlanFarmsButton', nextClickDelay });
                    setTimeout(scheduleClickPlanFarmsButton, nextClickDelay);
                }

                if (action === 'start') {
                    pressEnter();
                    scheduleClickPlanFarmsButton();
                }
            });
        `], { type: 'application/javascript' });

        return new Worker(URL.createObjectURL(blob));
    }

    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pressEnter() {
        const event = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            charCode: 13
        });
        document.dispatchEvent(event);
        console.log('Enter key pressed');
    }

    function clickPlanFarmsButton() {
        const button = document.querySelector('input.btn.optionButton[value="Plan farms"]');
        if (button) {
            button.click();
            console.log('Clicked Plan farms button');
        }
    }

    function checkElement() {
        const element = document.querySelector(elementSelector);
        if (element && !worker) {
            console.log('Element found, starting pressEnter loop.');
            worker = createWorker();
            worker.postMessage({ action: 'start', minEnterDelay, maxEnterDelay, minButtonClickDelay, maxButtonClickDelay });
            worker.addEventListener('message', function(e) {
                if (e.data.action === 'pressEnter' && farmRowsPresent) {
                    pressEnter();
                } else if (e.data.action === 'clickPlanFarmsButton') {
                    clickPlanFarmsButton();
                }
            });
        }
    }

    function checkPopup() {
        if (!popupChecked) {
            const popup = document.querySelector('.popup_box_content');
            if (popup) {
                console.log('Popup found');
                setTimeout(clickPlanFarmsButton, getRandomNumber(minButtonClickDelay, maxButtonClickDelay));
                popupChecked = true;
            }
        }
    }

    function checkFarmRows() {
        const farmRows_a = document.querySelectorAll('tr.farmRow.row_a');
        const farmRows_b = document.querySelectorAll('tr.farmRow.row_b');
        if (farmRows_a.length === 0 && farmRows_b.length === 0) {
            console.log('Farm rows not found, stopping pressing Enter.');
            farmRowsPresent = false;
            sleepScript(); // Put script to sleep
        } else {
            farmRowsPresent = true;
        }
    }

    function sleepScript() {
        console.log('Putting script to sleep.');
        if (worker) {
            worker.terminate();
            worker = null;
        }
        observer.disconnect(); // Disconnect the MutationObserver

        const reloadTime = getRandomNumber(720000, 900000); // 7 a 10 minutos em milissegundos
        console.log('Reloading page after ' + reloadTime / 60000 + ' minutes');
        setTimeout(() => {
            location.reload();
        }, reloadTime);
    }

    const observer = new MutationObserver(() => {
        checkElement();
        checkPopup();
    });

    // Delay the start of the element check by 10 seconds
    setTimeout(() => {
        observer.observe(document.body, { childList: true, subtree: true });
        checkElement();
        checkPopup();
    }, 10000); // 10 seconds delay

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            checkFarmRows();
        }
    });

    const customCodeDelay = getRandomNumber(2000, 5000); // Tempo aleatório entre 2 e 5 segundos
    setTimeout(() => {
        console.log('Executing custom code after ' + customCodeDelay / 1000 + ' seconds');
        $.getScript('https://higamy.github.io/TW/Scripts/Approved/FarmGodCopy.js');
    }, customCodeDelay);
})();
