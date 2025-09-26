document.addEventListener("DOMContentLoaded", () => {
    const operatorContainer = document.getElementById("operator-container");
    const layer20 = document.querySelector(".table-overlay-rectangle .layer-20");
    const layer50 = document.querySelector(".table-overlay-rectangle .layer-50");
    const mainCardsContainer = document.getElementById("main-cards-container");
    const rearCard = document.getElementById("rear-card");
    const btnCheck = document.querySelector(".btn-check");
    const btnDelete = document.querySelector(".btn-delete");
    const btnSurrender = document.querySelector(".btn-surrender");
    const settingsButton = document.querySelector(".settings-button");
    const computerScoreEl = document.querySelector(".rectangle-score-computer");
    const playerScoreEl = document.querySelector(".rectangle-score-player");
    const playtime = document.getElementById("timer"); 

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
            showPopup("Attention!", "Masih ada kartu di area perhitungan, tidak bisa diacak!", false, null, null);
            return;
        }

        const doStart = () => {
            clearLayer20AndRestoreMain();
            
            const shouldHaveNoSolution = Math.random() < 0.5;
            let attempts = 0;
            const maxAttempts = 50; 

            do {
                currentDeck = shuffle([...allMainCards]).slice(0, 4);
                currentDeckNumbers = currentDeck.map(f => getRankFromFile(f));
                const res = has24Solution(currentDeckNumbers);
                currentDeckHasSolution = res.has;
                currentSolution = res.solution;
                attempts++;

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
    layer50.addEventListener("dragover", e => { e.preventDefault(); });

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
    function addHighlight(el) { el.classList.add("highlight"); }
    function removeHighlight(el) { el.classList.remove("highlight"); }

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
    // GANTI SELURUH BLOK FUNGSI LAMA DAN DUPLIKASINYA DENGAN INI
    function showPopup(title, message, withSolution = false, solution = null, callback = null, options = {}) {
        const { withOkButton = true, customClass = '' } = options;

        const overlay = document.createElement("div");
        overlay.classList.add("result-overlay");
        document.body.appendChild(overlay);

        const popup = document.createElement("div");
        popup.classList.add("result-popup");
        if (customClass) {
            popup.classList.add(customClass);
        }

        const bannerContainer = document.createElement("div");
        bannerContainer.classList.add("popup-banner-container");
        bannerContainer.innerHTML = `
            <svg viewBox="0 0 282 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 0H282L266.69 20.0134L282 40.0267H0L15.31 20.0134L0 0Z" fill="#B5962B"/>
                <path d="M276.312 4.40503L262.268 19.6746L261.957 20.0134L262.268 20.3523L276.313 35.6218H5.6875L19.7334 20.3523L20.0439 20.0134L19.7334 19.6746L5.68848 4.40503H276.312Z" stroke="#A1262E"/>
                <path d="M26.641 11.7151L27.8081 17.1117H31.5848L28.5294 20.447L29.6964 25.8437L26.641 22.5084L23.5856 25.8437L24.7527 20.447L21.6973 17.1117H25.474L26.641 11.7151Z" fill="#A1262E"/>
                <path d="M256.009 11.7151L257.176 17.1117H260.953L257.898 20.447L259.065 25.8437L256.009 22.5084L252.954 25.8437L254.121 20.447L251.066 17.1117H254.842L256.009 11.7151Z" fill="#A1262E"/>
                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Bebas Neue', sans-serif" font-size="20" fill="#000" font-weight="bold">
                    ${title}
                </text>
            </svg>
        `;
        popup.appendChild(bannerContainer);

        const messageEl = document.createElement("p");
        messageEl.classList.add("message-text");
        messageEl.innerHTML = message;
        popup.appendChild(messageEl);

        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.gap = "10px";
        buttonContainer.style.justifyContent = "center";
        buttonContainer.style.marginTop = "15px";

        if (withOkButton) {
            const btnOk = document.createElement("button");
            btnOk.classList.add("btn-ok");
            btnOk.textContent = "OK";
            btnOk.addEventListener("click", () => {
                popup.remove();
                overlay.remove();
                if (typeof callback === "function") callback();
            });
            buttonContainer.appendChild(btnOk);
        }

        if (withSolution && solution) {
            const btnSolution = document.createElement("button");
            btnSolution.classList.add("btn-solution");
            btnSolution.textContent = "Solusi";
            btnSolution.addEventListener("click", () => {
                messageEl.innerHTML = `Solusi: ${solution}`;
                btnSolution.remove();
            });
            buttonContainer.appendChild(btnSolution);
        }
        
        popup.appendChild(buttonContainer);
        document.body.appendChild(popup);

        if (customClass === 'settings-popup') {
            const resumeButton = popup.querySelector('#resume-button');
            if (resumeButton) {
                resumeButton.addEventListener('click', () => {
                    popup.remove();
                    overlay.remove();
                });
            }
        }
    }   

    // ======================
    // BUTTON HANDLERS
    // ======================
    rearCard.addEventListener("click", () => {
        startNewRound({ force: false });
    });

    // Kode Baru ✅ (VERSI DENGAN SVG BERSIH)
    settingsButton.addEventListener("click", () => {
        const settingsHtml = `
            <div class="settings-grid">
                <div class="settings-box" title="Sound">
                    <svg width="80" height="80" viewBox="0 0 108 107" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="0.71814" width="100" height="97.6261" rx="30" fill="#B5962B" fill-opacity="0.5" shape-rendering="crispEdges"/>
                        <rect x="4.5" y="1.21814" width="99" height="96.6261" rx="29.5" stroke="black" stroke-opacity="0.1" shape-rendering="crispEdges"/>
                        <path d="M77.1427 63.6691L70.5721 59.8745C70.4641 59.8127 70.345 59.7727 70.2217 59.757C70.0983 59.7412 69.973 59.7498 69.8529 59.7825C69.7329 59.8151 69.6205 59.8711 69.5221 59.9472C69.4236 60.0233 69.3412 60.118 69.2794 60.226L68.0939 62.2811C67.8318 62.7339 67.9867 63.3176 68.4395 63.5798L75.0101 67.3744C75.118 67.4362 75.2371 67.4761 75.3605 67.4919C75.4839 67.5077 75.6092 67.499 75.7292 67.4664C75.8492 67.4338 75.9617 67.3778 76.0601 67.3017C76.1585 67.2256 76.2409 67.1309 76.3027 67.0229L77.4882 64.9677C77.7503 64.515 77.5895 63.9312 77.1427 63.6691ZM69.2734 40.2103C69.3352 40.3183 69.4177 40.413 69.5161 40.4891C69.6145 40.5652 69.7269 40.6212 69.847 40.6538C69.967 40.6864 70.0923 40.6951 70.2157 40.6793C70.3391 40.6635 70.4582 40.6236 70.5661 40.5618L77.1367 36.7672C77.5895 36.5051 77.7443 35.9213 77.4822 35.4685L76.3027 33.4193C76.2409 33.3113 76.1585 33.2166 76.0601 33.1405C75.9617 33.0644 75.8492 33.0085 75.7292 32.9758C75.6092 32.9432 75.4839 32.9345 75.3605 32.9503C75.2371 32.9661 75.118 33.006 75.0101 33.0678L68.4395 36.8625C68.2219 36.9893 68.0634 37.1971 67.9987 37.4405C67.9339 37.6838 67.9682 37.9429 68.0939 38.1611L69.2734 40.2103ZM79.6387 48.0736H72.0137C71.4895 48.0736 71.0605 48.5025 71.0605 49.0267V51.4095C71.0605 51.9338 71.4895 52.3627 72.0137 52.3627H79.6387C80.1629 52.3627 80.5918 51.9338 80.5918 51.4095V49.0267C80.5918 48.5025 80.1629 48.0736 79.6387 48.0736ZM61.2851 26.5687C60.9336 26.5687 60.5762 26.664 60.2485 26.8844L39.1309 40.6869H29.3613C28.8371 40.6869 28.4082 41.1158 28.4082 41.64V58.7963C28.4082 59.3205 28.8371 59.7494 29.3613 59.7494H39.1309L60.2485 73.5518C60.5762 73.7663 60.9396 73.8676 61.2851 73.8676C62.2799 73.8676 63.1973 73.0753 63.1973 71.9553V28.4809C63.1973 27.361 62.2799 26.5687 61.2851 26.5687Z" fill="black"/>
                    </svg>
                </div>
                <div class="settings-box" title="Music">
                    <svg width="80" height="80" viewBox="0 0 108 107" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="0.71814" width="100" height="97.6261" rx="30" fill="#B5962B" fill-opacity="0.5" shape-rendering="crispEdges"/>
                        <rect x="4.5" y="1.21814" width="99" height="96.6261" rx="29.5" stroke="black" stroke-opacity="0.1" shape-rendering="crispEdges"/>
                        <path d="M54.5 54.1196V27.3431H74.8333V34.9681H59.5833V62.9265C59.5828 65.1644 58.8439 67.3396 57.4812 69.1148C56.1185 70.8901 54.2081 72.166 52.0464 72.7449C49.8846 73.3237 47.5922 73.1731 45.5247 72.3164C43.4573 71.4597 41.7303 69.9448 40.6115 68.0065C39.4928 66.0683 39.0448 63.8151 39.3371 61.5963C39.6294 59.3776 40.6456 57.3172 42.2282 55.7349C43.8107 54.1525 45.8712 53.1365 48.0899 52.8445C50.3087 52.5524 52.5619 53.0006 54.5 54.1196Z" fill="black"/>
                    </svg>
                </div>
                <div class="settings-box" title="Play/Resume" id="resume-button">
                    <svg width="80" height="80" viewBox="0 0 108 107" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="0.703247" width="100" height="97.6261" rx="30" fill="#B5962B" fill-opacity="0.5" shape-rendering="crispEdges"/>
                        <rect x="4.5" y="1.20325" width="99" height="96.6261" rx="29.5" stroke="black" stroke-opacity="0.1" shape-rendering="crispEdges"/>
                        <path d="M55.2575 37.2283L55.0925 37.1283C53.2225 35.9908 51.5775 34.9883 50.1675 34.4833C49.3902 34.1845 48.5593 34.0509 47.7275 34.0908C46.8519 34.1576 46.0151 34.4791 45.32 35.0158C43.8725 36.1008 43.2475 37.6983 42.905 39.4658C42.5725 41.1783 42.445 43.4083 42.2875 46.1233L42.28 46.2633C42.185 47.8883 42.125 49.4958 42.125 50.9533C42.125 52.4108 42.185 54.0208 42.28 55.6458L42.2875 55.7833C42.445 58.4983 42.5725 60.7283 42.905 62.4383C43.2475 64.2083 43.8725 65.8033 45.32 66.8908C46.035 67.4283 46.8375 67.7483 47.7275 67.8158C48.5825 67.8783 49.4025 67.6983 50.1675 67.4233C51.5775 66.9183 53.2225 65.9158 55.0925 64.7808L55.2575 64.6808C56.3225 64.0308 57.3675 63.3633 58.3 62.7058C59.442 61.8933 60.5552 61.0411 61.6375 60.1508L61.7625 60.0483C63.6725 58.4908 65.2925 57.1683 66.4125 55.8683C67.6325 54.4433 68.375 52.9133 68.375 50.9533C68.375 48.9933 67.6325 47.4608 66.41 46.0383C65.2925 44.7383 63.6725 43.4133 61.765 41.8583L61.64 41.7558C60.505 40.8308 59.365 39.9458 58.3 39.2008C57.3069 38.5106 56.2922 37.8519 55.2575 37.2258" fill="black"/>
                    </svg>
                </div>
                <div class="settings-box" title="Leave Game">
                    <svg width="80" height="80" viewBox="0 0 108 107" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="0.703247" width="100" height="97.6261" rx="30" fill="#B5962B" fill-opacity="0.5" shape-rendering="crispEdges"/>
                        <rect x="4.5" y="1.20325" width="99" height="96.6261" rx="29.5" stroke="black" stroke-opacity="0.1" shape-rendering="crispEdges"/>
                        <path d="M58.5833 41.0365V35.9532C58.5833 34.605 58.0478 33.3121 57.0945 32.3587C56.1411 31.4054 54.8482 30.8699 53.5 30.8699H35.7083C34.3601 30.8699 33.0672 31.4054 32.1139 32.3587C31.1606 33.3121 30.625 34.605 30.625 35.9532V66.4532C30.625 67.8014 31.1606 69.0944 32.1139 70.0477C33.0672 71.001 34.3601 71.5365 35.7083 71.5365H53.5C54.8482 71.5365 56.1411 71.001 57.0945 70.0477C58.0478 69.0944 58.5833 67.8014 58.5833 66.4532V61.3699" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M45.875 51.2032H76.375M76.375 51.2032L68.75 43.5782M76.375 51.2032L68.75 58.8282" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `;
        showPopup("SETTINGS", settingsHtml, false, null, null, { withOkButton: false, customClass: 'settings-popup' });
    });

    btnCheck.addEventListener("click", () => {
        if (layer20.children.length === 0) return;
        let expression = "";
        for (let el of [...layer20.children]) {
            const folder = el.getAttribute("data-folder");
            const file = el.getAttribute("data-file");

            if (folder === "main") {
                expression += getRankFromFile(file);
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
            // Pemain salah karena ekspresi tidak valid
            if (computerScoreEl) computerScoreEl.textContent = computerScore;
            showPopup("ERROR", "Ekspresi matematika tidak valid!", false, null, null);
            return;
        }

        const startNewRoundCallback = () => startNewRound({ force: true });

        if (currentDeckHasSolution) {
            if (Math.abs(result - 24) < 1e-6) {
                // Jawaban benar
                playerScore++;
                if (playerScoreEl) playerScoreEl.textContent = playerScore;
                showPopup("CONGRATULATIONS!", "Jawaban Anda benar!", false, null, startNewRoundCallback);
            } else {
                // Pemain salah, padahal ada solusi
                computerScore++;
                if (computerScoreEl) computerScoreEl.textContent = computerScore;
                showPopup("WRONG!", "Hasil perhitunganmu belum tepat.", true, currentSolution, startNewRoundCallback);
            }
        } else {
            // Pemain mencoba menjawab kartu yang tidak punya solusi
            if (computerScoreEl) computerScoreEl.textContent = computerScore;
            showPopup("INFO", "Kartu yang muncul tidak akan menghasilkan 24!", false, null, startNewRoundCallback);
        }
    });

    btnDelete.addEventListener("click", () => {
        clearLayer20AndRestoreMain();
    });

    btnSurrender.addEventListener("click", () => {
        const startNewRoundCallback = () => startNewRound({ force: true });
        if (currentDeckHasSolution) {
            computerScore++;
            if (computerScoreEl) computerScoreEl.textContent = computerScore;
            showPopup("SURRENDER", "Jangan patah semangat, coba lagi!", true, currentSolution, startNewRoundCallback);
        } else {
            showPopup("SURRENDER", "Kartu ini memang tidak memiliki solusi. Kerja bagus!", false, null, startNewRoundCallback);
        }
    });

    // ======================
    // UI HELPERS
    // ======================
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

    let timerDuration = 5 * 60; // 5 menit (dalam detik)
    let remainingTime = timerDuration;

    function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    function startTimer() {
    const interval = setInterval(() => {
        playtime.textContent = formatTime(remainingTime);

        if (remainingTime <= 0) {
        clearInterval(interval); // stop ketika 0
        } else {
        remainingTime--;
        }
    }, 1000);
    }

    // mulai otomatis
    startTimer();

});
