self.addEventListener('message', function(e) {
    const { action, minEnterDelay, maxEnterDelay } = e.data;

    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pressEnter() {
        const nextPressDelay = getRandomNumber(minEnterDelay, maxEnterDelay);
        self.postMessage({ action: 'pressEnter', nextPressDelay });
        setTimeout(pressEnter, nextPressDelay);
    }

    if (action === 'start') {
        pressEnter();
    }
});
