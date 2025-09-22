document.addEventListener("DOMContentLoaded", () => {
    const operatorContainer = document.getElementById("operator-container");
    const layer20 = document.querySelector(".table-overlay-rectangle .layer-20");
    const layer50 = document.querySelector(".table-overlay-rectangle .layer-50");
    const mainCardsContainer = document.getElementById("main-cards-container");
    const rearCard = document.getElementById("rear-card");
    const btnCheck = document.querySelector(".btn-check");
    const btnDelete = document.querySelector(".btn-delete");
    const btnSurrender = document.querySelector(".btn-surrender");

    const computerScoreEl = document.querySelector(".rectangle-score-computer");
    const playerScoreEl = document.querySelector(".rectangle-score-player");

    let computerScore = 0;
    let playerScore = 0;

    const operators = [
        { symbol: "(", file: "(H.png" },
        { symbol: ")", file: ")H.png" },
        { symbol: "x", file: "xH.png" },
        { symbol: "/", file: "bagiH.png" },
        { symbol: "+", file: "+H.png" },
        { symbol: "-", file: "-H.png" }
    ];

    const suits = ["C", "D", "H", "S"];
    const ranks = Array.from({ length: 13 }, (_, i) => i + 1);
    const allMainCards = [];
    suits.forEach(suit => ranks.forEach(rank => allMainCards.push(`${rank}${suit}.png`)));

    const mainCardsMap = {};
    let currentDeck = [];
    let currentDeckNumbers = [];
    let currentDeckHasSolution = false;
    let currentSolution = null;

    // ======================
    // HELPERS
    // ======================

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function getRankFromFile(file) {
        const match = file.match(/^\d+/);
        return match ? parseInt(match[0]) : NaN;
    }

    function generateExpressions(nums) {
        if (nums.length === 1) return [nums[0].toString()];
        const results = [];
        for (let i = 0; i < nums.length; i++) {
            const rest = [...nums.slice(0, i), ...nums.slice(i + 1)];
            const subExprs = generateExpressions(rest);
            subExprs.forEach(expr => {
                ["+", "-", "*", "/"].forEach(op => {
                    results.push(`(${nums[i]}${op}${expr})`);
                    results.push(`(${expr}${op}${nums[i]})`);
                });
            });
        }
        return results;
    }

    function has24Solution(nums) {
        const exprs = generateExpressions(nums);
        for (let expr of exprs) {
            try {
                const val = eval(expr);
                if (Math.abs(val - 24) < 1e-6) {
                    return { has: true, solution: expr };
                }
            } catch { }
        }
        return { has: false, solution: null };
    }

    function clearLayer20AndRestoreMain() {
        const elements = [...layer20.children];
        elements.forEach(el => {
            const folder = el.getAttribute("data-folder");
            const file = el.getAttribute("data-file");

            if (folder === "main") {
                const originalCard = mainCardsMap[file];
                if (originalCard) {
                    originalCard.style.display = "block";
                }
            }
            el.remove();
        });
        updateLayer50Visibility();
        adjustLayer20Width();
        updateCheckButtonState();
    }

    function startNewRound({ force = false, delay = 0 } = {}) {
        if (!force && layer20.children.length > 0) {
            showPopup("Masih ada kartu di layer 20, tidak bisa diacak!", false);
            return;
        }

        const doStart = () => {
            clearLayer20AndRestoreMain();
            
            // Tentukan apakah ronde ini harus tanpa solusi (50% kemungkinan)
            const shouldHaveNoSolution = Math.random() < 0.5;
            let attempts = 0;
            const maxAttempts = 50; // Batasi jumlah percobaan untuk mencegah loop tak terbatas

            do {
                currentDeck = shuffle([...allMainCards]).slice(0, 4);
                currentDeckNumbers = currentDeck.map(f => getRankFromFile(f));
                const res = has24Solution(currentDeckNumbers);
                currentDeckHasSolution = res.has;
                currentSolution = res.solution;
                attempts++;

                // Jika ingin kombinasi tanpa solusi, lanjutkan hingga menemukan yang tidak punya solusi
                // Jika ingin kombinasi dengan solusi, lanjutkan hingga menemukan yang punya solusi
                if (shouldHaveNoSolution && currentDeckHasSolution && attempts < maxAttempts) {
                    continue;
                } else if (!shouldHaveNoSolution && !currentDeckHasSolution && attempts < maxAttempts) {
                    continue;
                } else {
                    break;
                }
            } while (attempts < maxAttempts);

            renderMainCards(currentDeck);
            updateCheckButtonState();

            // Debugging: Tampilkan status solusi di konsol
            console.log(`Ronde baru - Harus tanpa solusi: ${shouldHaveNoSolution}, Hasil: ${currentDeckHasSolution ? 'Punya solusi' : 'Tidak punya solusi'}, Kartu: ${currentDeckNumbers}`);
        };

        if (delay > 0) {
            setTimeout(doStart, delay);
        } else {
            doStart();
        }
    }

    function renderMainCards(cardsToRender) {
        mainCardsContainer.innerHTML = "";
        Object.keys(mainCardsMap).forEach(k => delete mainCardsMap[k]);

        cardsToRender.forEach(file => {
            const newCard = document.createElement("div");
            newCard.classList.add("main-card");
            newCard.draggable = true;

            const img = document.createElement("img");
            img.src = `assets/img/cards/main/${file}`;
            img.alt = file;
            newCard.appendChild(img);

            newCard.addEventListener("click", () => {
                createCard(file, file, "main");
                newCard.style.display = "none";
                updateLayer50Visibility();
            });

            newCard.addEventListener("dragstart", e => {
                e.dataTransfer.setData("text/file", file);
                e.dataTransfer.setData("text/type", "container");
                e.dataTransfer.setData("text/folder", "main");
                newCard.classList.add("dragging");

                const ghost = img.cloneNode(true);
                ghost.classList.add("drag-ghost");
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 30, 42);
                setTimeout(() => document.body.removeChild(ghost), 0);
            });

            newCard.addEventListener("dragend", () => {
                newCard.classList.remove("dragging");
                newCard.classList.add("dropped");
                setTimeout(() => newCard.classList.remove("dropped"), 300);
            });

            mainCardsContainer.appendChild(newCard);
            mainCardsMap[file] = newCard;
        });
    }

    function createCard(fileName, symbol, folder = "operator") {
        const newCard = document.createElement("div");
        newCard.classList.add("operator-card");
        newCard.setAttribute("data-file", fileName);
        newCard.setAttribute("data-folder", folder);

        const newImg = document.createElement("img");
        newImg.src = `assets/img/cards/${folder}/${fileName}`;
        newImg.alt = symbol;
        newCard.appendChild(newImg);

        newCard.addEventListener("click", () => {
            if (layer20.contains(newCard)) {
                newCard.remove();
                if (folder === "main") {
                    const originalCard = mainCardsMap[fileName];
                    if (originalCard) originalCard.style.display = "block";
                }
                updateLayer50Visibility();
                adjustLayer20Width();
                updateCheckButtonState();
            }
        });

        newCard.draggable = true;

        newCard.addEventListener("dragstart", e => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", fileName + "|" + folder);
            newCard.classList.add("dragging");
        });

        newCard.addEventListener("dragend", () => {
            newCard.classList.remove("dragging");
            newCard.classList.add("dropped");
            setTimeout(() => newCard.classList.remove("dropped"), 300);
        });

        layer20.appendChild(newCard);
        updateLayer50Visibility();
        adjustLayer20Width();
        updateCheckButtonState();
    }

    operators.forEach(op => {
        const card = document.createElement("div");
        card.classList.add("operator-card");
        card.draggable = true;

        const img = document.createElement("img");
        img.src = `assets/img/cards/operator/${op.file}`;
        img.alt = op.symbol;
        card.appendChild(img);

        card.addEventListener("dragstart", e => {
            e.dataTransfer.setData("text/file", op.file);
            e.dataTransfer.setData("text/type", "container");
            e.dataTransfer.setData("text/folder", "operator");
            card.classList.add("dragging");

            const ghost = img.cloneNode(true);
            ghost.classList.add("drag-ghost");
            document.body.appendChild(ghost);
            e.dataTransfer.setDragImage(ghost, 30, 42);
            setTimeout(() => document.body.removeChild(ghost), 0);
        });

        card.addEventListener("dragend", () => {
            card.classList.remove("dragging");
            card.classList.add("dropped");
            setTimeout(() => card.classList.remove("dropped"), 300);
        });

        card.addEventListener("click", () => {
            createCard(op.file, op.symbol, "operator");
        });
        operatorContainer.appendChild(card);
    });

    // ======================
    // DRAG & DROP UNTUK LAYER20
    // ======================
    layer20.addEventListener("dragover", e => {
        e.preventDefault();
        const dragging = layer20.querySelector(".dragging");
        const afterElement = getDragAfterElement(layer20, e.clientX);

        if (dragging) {
            if (afterElement == null) {
                layer20.appendChild(dragging);
            } else {
                layer20.insertBefore(dragging, afterElement);
            }
        }
    });

    layer20.addEventListener("drop", e => {
        e.preventDefault();
        removeHighlight(layer20);

        const fileName = e.dataTransfer.getData("text/file");
        const type = e.dataTransfer.getData("text/type");
        const folder = e.dataTransfer.getData("text/folder") || "main";
        if (!fileName) return;

        if (type === "container") {
            createCard(fileName, fileName, folder);
            if (folder === "main") {
                const draggedCard = mainCardsMap[fileName];
                if (draggedCard) draggedCard.style.display = "none";
            }
        }
    });

    // ======================
    // LAYER50 PROXY KE LAYER20
    // ======================
    layer50.addEventListener("dragover", e => {
        e.preventDefault();
    });

    layer50.addEventListener("drop", e => {
        e.preventDefault();
        removeHighlight(layer20);

        const fileName = e.dataTransfer.getData("text/file");
        const type = e.dataTransfer.getData("text/type");
        const folder = e.dataTransfer.getData("text/folder") || "main";
        if (!fileName) return;

        if (type === "container") {
            createCard(fileName, fileName, folder);
            if (folder === "main") {
                const draggedCard = mainCardsMap[fileName];
                if (draggedCard) draggedCard.style.display = "none";
            }
        }
    });

    // ======================
    // HIGHLIGHT EFFECT
    // ======================
    function addHighlight(el) {
        el.classList.add("highlight");
    }
    function removeHighlight(el) {
        el.classList.remove("highlight");
    }

    ["dragenter"].forEach(evt => {
        layer20.addEventListener(evt, () => addHighlight(layer20));
        layer50.addEventListener(evt, () => addHighlight(layer20));
    });
    ["dragleave", "drop"].forEach(evt => {
        layer20.addEventListener(evt, () => removeHighlight(layer20));
        layer50.addEventListener(evt, () => removeHighlight(layer20));
    });

    // ======================
    // UNIFIED POPUP FUNCTION
    // ======================
    function showPopup(message, withSolution = false, solution = null, callback = null) {
        const overlay = document.createElement("div");
        overlay.classList.add("result-overlay");
        document.body.appendChild(overlay);

        const popup = document.createElement("div");
        popup.classList.add("result-popup");

        // Create message container
        const messageEl = document.createElement("p");
        messageEl.classList.add("message-text");
        messageEl.innerHTML = message;
        popup.appendChild(messageEl);

        // Create button container for alignment
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "10px";
        buttonContainer.style.justifyContent = "center";
        buttonContainer.style.marginTop = "15px";

        // Create OK button
        const btnOk = document.createElement("button");
        btnOk.classList.add("btn-ok");
        btnOk.textContent = "OK";
        btnOk.addEventListener("click", () => {
            popup.remove();
            overlay.remove();
            if (typeof callback === "function") callback();
        });
        buttonContainer.appendChild(btnOk);

        // Create Solution button if applicable
        if (withSolution && solution) {
            const btnSolution = document.createElement("button");
            btnSolution.classList.add("btn-solution");
            btnSolution.textContent = "Solusi";
            btnSolution.addEventListener("click", () => {
                messageEl.innerHTML = `Solusi: ${solution}`;
                btnSolution.remove(); // Remove Solution button after showing solution
            });
            buttonContainer.appendChild(btnSolution);
        }

        popup.appendChild(buttonContainer);
        document.body.appendChild(popup);
    }

    // BUTTON HANDLERS
    rearCard.addEventListener("click", () => {
        startNewRound({ force: false });
    });

    btnCheck.addEventListener("click", () => {
        if (layer20.children.length === 0) return;
        let expression = "";
        for (let el of [...layer20.children]) {
            const folder = el.getAttribute("data-folder");
            const file = el.getAttribute("data-file");

            if (folder === "main") {
                const rank = getRankFromFile(file);
                expression += rank;
            } else if (folder === "operator") {
                if (file === "+H.png") expression += "+";
                else if (file === "-H.png") expression += "-";
                else if (file === "xH.png") expression += "*";
                else if (file === "bagiH.png") expression += "/";
                else if (file === "(H.png") expression += "(";
                else if (file === ")H.png") expression += ")";
            }
        }

        let result;
        try {
            result = eval(expression);
        } catch {
            showPopup("Ekspresi tidak valid!", false);
            return;
        }

        if (currentDeckHasSolution) {
            if (Math.abs(result - 24) < 1e-6) {
                playerScore++;
                if (playerScoreEl) playerScoreEl.textContent = playerScore;
                showPopup("Anda benar!", false, null, () => startNewRound({ force: true }));
            } else {
                showPopup("Anda salah!", true, currentSolution, () => startNewRound({ force: true }));
            }
        } else {
            showPopup("Kartu yang muncul tidak akan menghasilkan 24!", false, null, () => startNewRound({ force: true }));
        }
    });

    btnDelete.addEventListener("click", () => {
        const elements = [...layer20.children];
        elements.forEach(el => {
            const folder = el.getAttribute("data-folder");
            const file = el.getAttribute("data-file");

            if (folder === "main") {
                const originalCard = mainCardsMap[file];
                if (originalCard) originalCard.style.display = "block";
            }
            el.remove();
        });
        updateLayer50Visibility();
        adjustLayer20Width();
        updateCheckButtonState();
    });

    btnSurrender.addEventListener("click", () => {
        if (currentDeckHasSolution) {
            computerScore++;
            if (computerScoreEl) computerScoreEl.textContent = computerScore;
            showPopup("Kamu menyerah 😢", true, currentSolution, () => startNewRound({ force: true }));
        } else {
            showPopup("Kamu menyerah 😢<br>Kartu tersebut tidak memiliki solusi!", false, null, () => startNewRound({ force: true }));
        }
    });

    // UI HELPERS
    function updateLayer50Visibility() {
        if (layer20.children.length > 0) {
            layer50.classList.add("hidden");
        } else {
            layer50.classList.remove("hidden");
        }
    }

    function adjustLayer20Width() {
        const cardWidth = 65;
        const gap = 5;
        const count = layer20.children.length;
        const newWidth = count * (cardWidth + gap);
        layer20.style.width = Math.max(newWidth, 200) + "px";
    }

    function updateCheckButtonState() {
        btnCheck.disabled = layer20.children.length === 0;
    }

    function getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll(".operator-card:not(.dragging)")];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Init
    startNewRound({ force: true });
});