const gamePasswords = {
    level1: Math.floor(1000 + Math.random() * 9000).toString(),
    level3: Math.floor(1000 + Math.random() * 9000).toString(),
    level7: Math.floor(1000 + Math.random() * 9000).toString(),
};
gamePasswords.level8 = gamePasswords.level1 + gamePasswords.level3;

let currentLevel = 1;
let seconds = 0;
let timerInterval = null;
let inventory = [];
let levelState = {};
let collectedClues = [];

const roomTitle = document.getElementById("roomTitle");
const timerEl = document.getElementById("timer");
const roomView = document.getElementById("roomView");
const messageBox = document.getElementById("messageBox");
const mainDoor = document.getElementById("mainDoor");

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        if (timerEl) timerEl.innerText = `時間: ${seconds}秒`;
    }, 1000);
}

function showMessage(text) {
    if (messageBox) {
        messageBox.innerText = text;
        messageBox.style.opacity = 1;
        setTimeout(() => { messageBox.style.opacity = 0; }, 2800);
    }
}

function addClue(clueText) {
    if (!collectedClues.includes(clueText)) {
        collectedClues.push(clueText);
        updateNotebookUI();
    }
}

function updateNotebookUI() {
    const listEl = document.getElementById("notebookList");
    if (listEl) {
        if (collectedClues.length === 0) {
            listEl.innerHTML = "<li>尚未收集到任何線索...</li>";
        } else {
            listEl.innerHTML = collectedClues.map(c => `<li style="color: #6ee7b7; margin-bottom: 4px;">${c}</li>`).join("");
        }
    }
}

function toggleNotebook(show) {
    const modalEl = document.getElementById("notebookModal");
    if (modalEl) modalEl.style.display = show ? "flex" : "none";
}

function updateInventory() {
    for (let i = 0; i < 2; i++) {
        const slot = document.getElementById(`slot${i}`);
        if (slot) {
            slot.innerHTML = "";
            slot.classList.remove("has-item");
            if (inventory[i]) {
                let itemVisual = document.createElement("div");
                itemVisual.className = inventory[i].className;
                slot.appendChild(itemVisual);
                slot.classList.add("has-item");
            }
        }
    }
}
function loadLevel() {
    const oldPanel = document.getElementById("controlPanel");
    if (oldPanel) oldPanel.remove();
    const oldItems = document.querySelectorAll(".interactive-item");
    oldItems.forEach(el => el.remove());

    if (currentLevel === 1) {
        if (roomTitle) roomTitle.innerText = "第 1 關：尋找密碼紙條";
        if (mainDoor) mainDoor.style.display = "flex";
        
        let note = document.createElement("div");
        note.className = "interactive-item css-paper";
        note.style.left = "70px"; note.style.top = "150px";
        note.onclick = () => {
            showMessage(`紙條寫著：第1關密碼 ${gamePasswords.level1}`);
            addClue(`第 1 關密碼：${gamePasswords.level1}`);
        };
        if (roomView) roomView.appendChild(note);

        createControlPanel(`
            <input type="text" id="p1" placeholder="輸入4位密碼" style="width:110px;">
            <button onclick="checkLevel1()">開門</button>
        `);

    } else if (currentLevel === 2) {
        if (roomTitle) roomTitle.innerText = "第 2 關：取得鑰匙";
        if (mainDoor) mainDoor.style.display = "flex";

        let key = document.createElement("div");
        key.className = "interactive-item css-key";
        key.style.right = "60px"; key.style.top = "240px";
        key.onclick = () => {
            if (!inventory.some(i => i.id === "key")) {
                inventory.push({ id: "key", className: "css-key", name: "大門鑰匙", washed: false });
                updateInventory();
                key.remove();
                addClue("獲得道具：大門鑰匙 (表面沾有塗層)");
                showMessage("你撿起了鑰匙放入道具欄！");
            }
        };
        if (roomView) roomView.appendChild(key);

        createControlPanel(`
            <button onclick="checkLevel2()">用道具欄鑰匙開門</button>
        `);

    } else if (currentLevel === 3) {
        if (roomTitle) roomTitle.innerText = "第 3 關：倒水解謎";
        if (mainDoor) mainDoor.style.display = "flex";
        levelState.cupHasWater = false;

        let cup = document.createElement("div");
        cup.className = "interactive-item css-cup";
        cup.style.left = "220px"; cup.style.top = "190px";
        cup.onclick = () => {
            if (inventory.some(i => i.id === "water")) {
                inventory = inventory.filter(i => i.id !== "water");
                updateInventory();
                levelState.cupHasWater = true;
                cup.className = "interactive-item css-cup has-water";
                addClue(`第 3 關密碼：${gamePasswords.level3}`);
                showMessage(`水倒入杯中，浮現出隱藏數字：${gamePasswords.level3}`);
            } else if (levelState.cupHasWater) {
                showMessage(`杯子裡已經有水了，數字是 ${gamePasswords.level3}`);
            } else {
                showMessage("空杯子需要先倒水才行...");
            }
        };
        if (roomView) roomView.appendChild(cup);

        let bottle = document.createElement("div");
        bottle.className = "interactive-item css-cup has-water";
        bottle.style.left = "60px"; bottle.style.top = "250px";
        bottle.onclick = () => {
            if (!inventory.some(i => i.id === "water")) {
                inventory.push({ id: "water", className: "css-cup has-water", name: "水壺" });
                updateInventory();
                bottle.remove();
                addClue("獲得道具：水壺");
                showMessage("你拿起了水壺！");
            }
        };
        if (roomView) roomView.appendChild(bottle);

        createControlPanel(`
            <input type="text" id="p3" placeholder="輸入密碼" style="width:90px;">
            <button onclick="checkLevel3()">解鎖</button>
        `);

    } else if (currentLevel === 4) {
        if (roomTitle) roomTitle.innerText = "第 4 關：化學試管調配";
        if (mainDoor) mainDoor.style.display = "flex";
        levelState.pots = [];

        let p1 = document.createElement("div");
        p1.className = "interactive-item css-cup"; p1.style.background = "rgba(255,0,0,0.5)"; p1.style.left = "90px"; p1.style.top = "200px";
        p1.onclick = () => addPotion("紅"); if (roomView) roomView.appendChild(p1);

        let p2 = document.createElement("div");
        p2.className = "interactive-item css-cup"; p2.style.background = "rgba(0,0,255,0.5)"; p2.style.left = "220px"; p2.style.top = "200px";
        p2.onclick = () => addPotion("藍"); if (roomView) roomView.appendChild(p2);

        let p3 = document.createElement("div");
        p3.className = "interactive-item css-cup"; p3.style.background = "rgba(0,255,0,0.5)"; p3.style.left = "350px"; p3.style.top = "200px";
        p3.onclick = () => addPotion("綠"); if (roomView) roomView.appendChild(p3);

        createControlPanel(`
            <span id="potionText" style="font-size:13px; color:#38bdf8; font-weight:bold;">已選: 無</span>
            <button onclick="checkLevel4()">倒入混合 (需紅+藍)</button>
        `);

    } else if (currentLevel === 5) {
        if (roomTitle) roomTitle.innerText = "第 5 關：接通電線";
        if (mainDoor) mainDoor.style.display = "flex";
        levelState.wires = { 1: false, 2: false, 3: false };

        let wirePanel = document.createElement("div");
        wirePanel.id = "controlPanel";
        wirePanel.className = "control-panel";
        wirePanel.style.flexDirection = "column";
        wirePanel.style.gap = "8px";
        wirePanel.innerHTML = `
            <div style="display:flex; gap:12px;">
                <div class="wire" id="w1" onclick="toggleWire(1)"></div>
                <div class="wire" id="w2" onclick="toggleWire(2)"></div>
                <div class="wire" id="w3" onclick="toggleWire(3)"></div>
            </div>
            <button onclick="checkLevel5()">通電開門</button>
        `;
        if (roomView) roomView.appendChild(wirePanel);

    } else if (currentLevel === 6) {
        if (roomTitle) roomTitle.innerText = "第 6 關：齒輪對齊";
        if (mainDoor) mainDoor.style.display = "flex";
        
        let gear = document.createElement("div");
        gear.className = "interactive-item css-gear";
        gear.style.left = "225px"; gear.style.top = "190px";
        gear.onclick = () => showMessage("齒輪轉動了，請點擊下方按鈕對齊機械結構");
        if (roomView) roomView.appendChild(gear);

        createControlPanel(`
            <button onclick="checkLevel6()">對齊機械齒輪</button>
        `);

    } else if (currentLevel === 7) {
        if (roomTitle) roomTitle.innerText = "第 7 關：雷射保全解除";
        if (mainDoor) mainDoor.style.display = "flex";

        let scanner = document.createElement("div");
        scanner.className = "interactive-item css-terminal";
        scanner.style.left = "220px"; scanner.style.top = "190px";
        scanner.onclick = () => {
            addClue(`第 7 關保全密碼：${gamePasswords.level7}`);
            showMessage(`保全終端機提示：預設解除密碼為 ${gamePasswords.level7}`);
        };
        if (roomView) roomView.appendChild(scanner);

        createControlPanel(`
            <input type="text" id="p7" placeholder="輸入保全密碼" style="width:110px;">
            <button onclick="checkLevel7()">解除保全</button>
        `);

    } else if (currentLevel === 8) {
        if (roomTitle) roomTitle.innerText = "第 8 關：終極逃生大門";
        if (mainDoor) mainDoor.style.display = "flex";
        levelState.finalPhase = "input";

        let hintObj = document.createElement("div");
        hintObj.className = "interactive-item css-cup has-water";
        hintObj.style.left = "235px"; hintObj.style.top = "170px";
        hintObj.onclick = () => {
            let keyItem = inventory.find(i => i.id === "key");
            if (keyItem) {
                keyItem.washed = true;
                addClue(`終極提示：組合第1關與第3關密碼 (${gamePasswords.level8})`);
                showMessage(`你用水清洗鑰匙，浮現最終提示：「請輸入綜合密碼 ${gamePasswords.level8}」`);
            } else if (inventory.some(i => i.id === "water")) {
                showMessage("請先從道具欄點擊或確認使用水壺清洗鑰匙...");
            } else {
                showMessage("這裡需要用水清洗鑰匙上的特殊塗層...");
            }
        };
        if (roomView) roomView.appendChild(hintObj);

        createControlPanel(`
            <div id="finalBox" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; justify-content:center;">
                <input type="text" id="p8" placeholder="輸入綜合密碼" style="width:140px;">
                <button onclick="checkLevel8Code()">送出密碼</button>
            </div>
        `);

    } else {
        endGame();
    }
}
function createControlPanel(htmlContent) {
    let panel = document.getElementById("controlPanel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "controlPanel";
        panel.className = "control-panel";
    }
    panel.innerHTML = htmlContent;
    if (roomView) roomView.appendChild(panel);
}

function checkLevel1() {
    let val = document.getElementById("p1").value;
    if (val === gamePasswords.level1) {
        showMessage("密碼正確！"); currentLevel = 2; setTimeout(loadLevel, 800);
    } else { showMessage("密碼錯誤！請查看筆記本"); }
}

function checkLevel2() {
    if (inventory.some(i => i.id === "key")) {
        showMessage("鑰匙解鎖成功！"); currentLevel = 3; setTimeout(loadLevel, 800);
    } else { showMessage("門鎖著，需要先拿鑰匙！"); }
}

function checkLevel3() {
    let val = document.getElementById("p3").value;
    if (val === gamePasswords.level3 && levelState.cupHasWater) {
        showMessage("解謎成功！"); currentLevel = 4; setTimeout(loadLevel, 800);
    } else { showMessage("密碼錯誤，或者杯子還沒加水！"); }
}

function addPotion(color) {
    if (levelState.pots.length < 2) {
        levelState.pots.push(color);
        const textEl = document.getElementById("potionText");
        if (textEl) textEl.innerText = `已選: ${levelState.pots.join("+")}`;
    } else { showMessage("試管最多只能選兩種藥水！"); }
}

function checkLevel4() {
    let p = levelState.pots;
    if (p.length === 2 && ((p === "紅" && p === "藍") || (p === "藍" && p === "紅"))) {
        showMessage("調配成功！化學反應開啟門！"); currentLevel = 5; setTimeout(loadLevel, 800);
    } else {
        showMessage("配方錯誤，試管冒煙失敗！");
        levelState.pots = [];
        const textEl = document.getElementById("potionText");
        if (textEl) textEl.innerText = `已選: 無`;
    }
}

function toggleWire(num) {
    levelState.wires[num] = !levelState.wires[num];
    let el = document.getElementById(`w${num}`);
    if (el) {
        if (levelState.wires[num]) el.classList.add("connected");
        else el.classList.remove("connected");
    }
}

function checkLevel5() {
    let w = levelState.wires;
    if (w && w && w) {
        showMessage("電流接通！"); currentLevel = 6; setTimeout(loadLevel, 800);
    } else { showMessage("還有電線是斷路的！"); }
}

function checkLevel6() {
    showMessage("齒輪完美對齊！"); currentLevel = 7; setTimeout(loadLevel, 800);
}

function checkLevel7() {
    let val = document.getElementById("p7").value;
    if (val === gamePasswords.level7) {
        showMessage("保全系統解除！"); currentLevel = 8; setTimeout(loadLevel, 800);
    } else { showMessage("保全密碼錯誤！"); }
}

function checkLevel8Code() {
    let val = document.getElementById("p8").value;
    let keyItem = inventory.find(i => i.id === "key");

    if (val === gamePasswords.level8) {
        if (keyItem && keyItem.washed) {
            levelState.finalPhase = "insertKey";
            const boxEl = document.getElementById("finalBox");
            if (boxEl) {
                boxEl.innerHTML = `
                    <button onclick="checkLevel8Key()" style="background-color:#2ed573; color:#fff;">插入鑰匙逃脫！</button>
                `;
            }
            showMessage("密碼正確！請插入鑰匙！");
        } else { showMessage("密碼正確，但鑰匙還沒用水清洗過！"); }
    } else { showMessage("綜合密碼錯誤！提示：請檢視筆記本中的第1關與第3關密碼。"); }
}

function checkLevel8Key() {
    let keyItem = inventory.find(i => i.id === "key");
    if (keyItem && keyItem.washed) endGame();
}

function endGame() {
    clearInterval(timerInterval);
    if (mainDoor) mainDoor.style.display = "none";
    
    let score = seconds <= 60 ? 100 : Math.max(10, 100 - Math.floor((seconds - 60) / 5));
    let rankEmoji = seconds <= 60 ? "🥇" : (seconds <= 120 ? "🥈" : "🥉");
    let rankTitle = seconds <= 60 ? "第一名 (閃電通關王)" : "優秀解謎者";

    let playerName = prompt("🎉 成功通關！請輸入你的名字留在排行榜上：") || "無名英雄";

    let leaderboard = JSON.parse(localStorage.getItem("wifi_game_leaderboard") || "[]");
    let existingRecordIndex = leaderboard.findIndex(item => item.name === playerName);

    if (existingRecordIndex !== -1) {
        if (score > leaderboard[existingRecordIndex].score || 
           (score === leaderboard[existingRecordIndex].score && seconds < leaderboard[existingRecordIndex].time)) {
            leaderboard[existingRecordIndex] = { name: playerName, time: seconds, score: score, date: new Date().toLocaleDateString() };
            showMessage("🏆 恭喜！刷新了你個人的歷史最高紀錄！");
        } else {
            showMessage("👍 通關成功！可惜沒有打破你之前的最高分紀錄。");
        }
    } else {
        leaderboard.push({ name: playerName, time: seconds, score: score, date: new Date().toLocaleDateString() });
    }

    // 將所有人進行大排序
    leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
    localStorage.setItem("wifi_game_leaderboard", JSON.stringify(leaderboard));

    // 預設主畫面一樣乖乖顯示前 3 名
    let top3 = leaderboard.slice(0, 3);
    let rankListHTML = top3.map((item, index) => 
        `<li style="margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 4px;">
            <span style="color: #ffd700; font-weight: bold;">第 ${index + 1} 名：${item.name}</span>
            <span style="color: #ffffff; font-weight: bold;">${item.score} 分 <span style="color: #94a3b8; font-size: 12px;">(${item.time}秒)</span></span>
        </li>`
    ).join("");

    if (roomTitle) roomTitle.innerText = "8關全部完美通關！";
    if (roomView) {
        roomView.innerHTML = `
            <div style="text-align: center; max-height: 420px; overflow-y: auto; width: 100%; padding: 10px; box-sizing: border-box;">
                <div style="font-size: 50px; margin-bottom: 2px;">${rankEmoji}</div>
                <h3 style="color: #ffd700; margin: 4px 0; font-size: 18px; font-weight: bold;">${rankTitle}</h3>
                <p style="font-size: 13px; color: #cbd5e0; margin: 4px 0;">玩家：<strong>${playerName}</strong> | 本次耗時：<strong>${seconds}</strong> 秒 | 最終得分：<strong style="color:#2ed573;">${score}</strong> 分</p>
                
                <div style="background: #1e1e24; padding: 12px 18px; border-radius: 8px; margin: 12px auto; width: 280px; text-align: left; border: 2px solid #ffd700; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h4 style="margin: 0; color: #ffd700; font-size: 15px;">📊 排行榜</h4>
                        <button id="showMoreBtn" onclick="expandLeaderboard()" style="padding: 2px 8px; font-size: 11px; background-color: #4b6584; color: #fff;">看更多</button>
                    </div>
                    <ul id="mainRankList" style="padding-left: 0; list-style: none; margin: 0; font-size: 13px;">
                        ${rankListHTML}
                    </ul>
                </div>

                <button onclick="location.reload()" style="background-color: #4b6584; color: #fff; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none; margin-top: 5px;">再挑戰一次</button>
            </div>
        `;
    }
    const barEl = document.getElementById("inventoryBar");
    if (barEl) barEl.style.display = "none";
}

// 👁️ 點擊「看更多」時觸發的「展開一長串」魔法函數
function expandLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem("wifi_game_leaderboard") || "[]");
    const listEl = document.getElementById("mainRankList");
    const btnEl = document.getElementById("showMoreBtn");
    
    if (listEl) {
        // 把所有人（不限3個）通通印出來，變成一長串！
        listEl.innerHTML = leaderboard.map((item, index) => 
            `<li style="margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 4px;">
                <span style="color: ${index < 3 ? '#ffd700' : '#cbd5e0'}; font-weight: bold;">第 ${index + 1} 名：${item.name}</span>
                <span style="color: #ffffff;">${item.score} 分 <span style="color: #666; font-size: 11px;">(${item.time}s)</span></span>
            </li>`
        ).join("");
    }
    if (btnEl) btnEl.style.display = "none"; // 點過就藏起來
}

window.onload = function() {
    startTimer();
    loadLevel();
};
