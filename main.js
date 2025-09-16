// Timer countdown 5 menit
let duration = 5 * 60; // 5 menit dalam detik
const display = document.getElementById("timer");

function startTimer() {
    let timer = duration, minutes, seconds;
    setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;

        display.textContent = minutes + ":" + seconds;

        if (--timer < 0) {
            timer = 0; // berhenti di 00:00
        }
    }, 1000);
}

startTimer();
