document.addEventListener("DOMContentLoaded", () => {
    const operatorContainer = document.getElementById("operator-container");
    const layer20 = document.querySelector(".table-overlay-rectangle .layer-20");
    const layer50 = document.querySelector(".table-overlay-rectangle .layer-50");

    const operators = [
        { symbol: "(", file: "(H.png" },
        { symbol: ")", file: ")H.png" },
        { symbol: "x", file: "xH.png" },
        { symbol: "/", file: "bagiH.png" },
        { symbol: "+", file: "+H.png" },
        { symbol: "-", file: "-H.png" }
    ];

    // 🔹 Helper function → bikin kartu baru di layer20
    function createCard(fileName, symbol) {
        const newCard = document.createElement("div");
        newCard.classList.add("operator-card");
        newCard.draggable = false;

        const newImg = document.createElement("img");
        newImg.src = `assets/img/cards/operator/${fileName}`;
        newImg.alt = symbol;
        newCard.appendChild(newImg);

        // Klik di kartu yang udah di layer20 → hapus
        newCard.addEventListener("click", () => {
            newCard.remove();
            if (layer20.children.length === 0 && layer50) {
                layer50.style.display = "flex";
            }
        });

        layer20.appendChild(newCard);
        if (layer50) {
            layer50.style.display = "none";
        }
    }

    // 🔹 Generate operator cards di container
    operators.forEach(op => {
        const card = document.createElement("div");
        card.classList.add("operator-card");
        card.draggable = true;

        const img = document.createElement("img");
        img.src = `assets/img/cards/operator/${op.file}`;
        img.alt = op.symbol;
        card.appendChild(img);

        // Drag start
        card.addEventListener("dragstart", e => {
            e.dataTransfer.setData("text/plain", op.file);
            setTimeout(() => card.classList.add("hide"), 0);
        });

        // Drag end
        card.addEventListener("dragend", () => {
            card.classList.remove("hide");
        });

        // ✅ Klik langsung masuk ke layer20
        card.addEventListener("click", () => {
            createCard(op.file, op.symbol);
        });

        operatorContainer.appendChild(card);
    });

    // Drag over layer20
    layer20.addEventListener("dragover", e => {
        e.preventDefault();
        layer20.classList.add("drag-over");
    });

    layer20.addEventListener("dragleave", () => {
        layer20.classList.remove("drag-over");
    });

    // Drop ke layer20
    layer20.addEventListener("drop", e => {
        e.preventDefault();
        layer20.classList.remove("drag-over");

        const fileName = e.dataTransfer.getData("text/plain");
        if (!fileName) return;

        // Panggil fungsi createCard biar konsisten
        createCard(fileName, fileName);
    });
});
