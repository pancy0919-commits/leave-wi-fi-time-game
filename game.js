// --- 🎲 隨機密碼與聯機選單變數系統 ---
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
const menuView = document.getElementById("menuView");
const gameViewContainer = document.getElementById("gameViewContainer");
const mpPanel = document.getElementById("mpPanel");

// 🏠 全新 3.0 選單按鈕觸發機制
function startSingleGame() {
    menuView.style.display = "none";
    gameViewContainer.style.display = "flex";
    startTimer();
    loadLevel();
}

function createRoomMenu() {
    mpPanel.style.display = "block";
    let randomPin = Math.floor(1000 + Math.random() * 9000); 
    mpPanel.innerHTML = `
        <h4 style="color:#ffd700; margin:0 0 10px 0;">🏠 創建房間成功</h4>
        <p style="font-size:14px; margin:5px 0;">請將下方 PIN 碼提供給隊友：</p>
        <div style="font-size:24px; font-weight:bold; color:#00d2d3; margin:10px 0; letter-spacing:2px;">${randomPin}</div>
        <p style="font-size:11px; color:#a0aec0;">等待隊友輸入 PIN 碼聯機中...</p>
        <button onclick="startSingleGame()" style="margin-top:10px; padding:4px 10px; font-size:12px;">直接單人啟動</button>
    `;
}

function joinRoomMenu() {
    mpPanel.style.display = "block";
    mpPanel.innerHTML = `
        <h4 style="color:#ffd700; margin:0 0 10px 0;">🔑 加入聯機房間</h4>
        <input type="text" id="pinInput" placeholder="輸入 4 位 PIN 碼" style="width:120px; margin-bottom:10px; font-size:12px;"><br>
        <button onclick="connectRoom()" style="padding:5px 12px; font-size:12px; background-color:#2ed573; color:#fff;">確認聯機</button>
    `;
}

function connectRoom() {
    let pin = document.getElementById("pinInput").value;
    if (pin.length === 4) {
        alert(`成功連線至房間 PIN: ${pin}！(2P 準備就緒，進入雙人互助模式)`);
        startSingleGame();
    } else {
        alert("請輸入正確的 4 位數字 PIN 碼！");
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        timerEl.innerText = `時間: ${seconds}秒`;
    }, 1000);
}

function showMessage(text) {
    messageBox.innerText = text;
    messageBox.style.opacity = 1;
    setTimeout(() => { messageBox.style.opacity = 0; }, 2800);
}

function addClue(clueText) {
    if (!collectedClues.includes(clueText)) {
        collectedClues.push(clueText);
        updateNotebookUI();
    }
}

function updateNotebookUI() {
    const listEl = document.getElementById("notebookList");
    if (collectedClues.length === 0) {
        listEl.innerHTML = "<li>尚未收集到任何線索...</li>";
    } else {
        listEl.innerHTML = collectedClues.map(c => `<li style="color: #6ee7b7; margin-bottom: 4px;">${c}</li>`).join("");
    }
}

function toggleNotebook(show) {
    document.getElementById("notebookModal").style.display = show ? "flex" : "none";
}

function updateInventory() {
    for (let i = 0; i < 2; i++) {
        const slot = document.getElementById(`slot${i}`);
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
function loadLevel() {
    const oldPanel = document.getElementById("controlPanel");
    if (oldPanel) oldPanel.remove();
    const oldItems = document.querySelectorAll(".interactive-item");
    oldItems.forEach(el => el.remove());

    if (currentLevel === 1) {
        roomTitle.innerText = "第 1 關：尋找密碼紙條";
        mainDoor.style.display = "flex";
        
        let note = document.createElement("div");
        note.className = "interactive-item css-paper";
        note.style.left = "70px"; note.style.top = "150px";
        note.onclick = () => {
            showMessage(`紙條寫著：第1關密碼 ${gamePasswords.level1}`);
            addClue(`第 1 關密碼：${gamePasswords.level1}`);
        };
        roomView.appendChild(note);

        createControlPanel(`
            <input type="text" id="p1" placeholder="輸入4位密碼" style="width:110px;">
            <button onclick="checkLevel1()">開門</button>
        `);

    } else if (currentLevel === 2) {
        roomTitle.innerText = "第 2 關：取得鑰匙";
        mainDoor.style.display = "flex";

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
        roomView.appendChild(key);

        createControlPanel(`
            <button onclick="checkLevel2()">用道具欄鑰匙開門</button>
        `);

    } else if (currentLevel === 3) {
        roomTitle.innerText = "第 3 關：倒水解謎";
        mainDoor.style.display = "flex";
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
        roomView.appendChild(cup);

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
        roomView.appendChild(bottle);

        createControlPanel(`
            <input type="text" id="p3" placeholder="輸入密碼" style="width:90px;">
            <button onclick="checkLevel3()">解鎖</button>
        `);

    } else if (currentLevel === 4) {
        roomTitle.innerText = "第 4 關：化學試管調配 (三色密碼融合)";
        mainDoor.style.display = "flex";
        levelState.pots = [];

        let p1 = document.createElement("div");
        p1.className = "interactive-item css-cup"; p1.style.background = "rgba(255,0,0,0.5)"; p1.style.left = "90px"; p1.style.top = "200px";
        p1.onclick = () => addPotion("紅"); roomView.appendChild(p1);

        let p2 = document.createElement("div");
        p2.className = "interactive-item css-cup"; p2.style.background = "rgba(0,0,255,0.5)"; p2.style.left = "220px"; p2.style.top = "200px";
        p2.onclick = () => addPotion("藍"); roomView.appendChild(p2);

        let p3 = document.createElement("div");
        p3.className = "interactive-item css-cup"; p3.style.background = "rgba(0,255,0,0.5)"; p3.style.left = "350px"; p3.style.top = "200px";
        p3.onclick = () => addPotion("綠"); roomView.appendChild(p3);

        createControlPanel(`
            <span id="potionText" style="font-size:13px; color:#38bdf8; font-weight:bold;">已選序列: 無</span>
            <button onclick="checkLevel4Advanced()">倒入混合 (需依照 藍->紅->綠 順序)</button>
        `);

    } else if (currentLevel === 5) {
        roomTitle.innerText = "第 5 關：接通電線 (六線光纖防禦網)";
        mainDoor.style.display = "flex";
        levelState.wires = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };

        let wirePanel = document.createElement("div");
        wirePanel.id = "controlPanel";
        wirePanel.className = "control-panel";
        wirePanel.style.flexDirection = "column";
        wirePanel.style.gap = "8px";
        wirePanel.innerHTML = `
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
                <div class="wire" id="w1" onclick="toggleWire(1)"></div>
                <div class="wire" id="w2" onclick="toggleWire(2)"></div>
                <div class="wire" id="w3" onclick="toggleWire(3)"></div>
                <div class="wire" id="w4" onclick="toggleWire(4)"></div>
                <div class="wire" id="w5" onclick="toggleWire(5)"></div>
                <div class="wire" id="w6" onclick="toggleWire(6)"></div>
            </div>
            <button onclick="checkLevel5Advanced()">通電開門 (需接通1, 3, 4, 6號線)</button>
        `;
        roomView.appendChild(wirePanel);

    } else if (currentLevel === 6) {
        roomTitle.innerText = "第 6 關：齒輪對齊";
        mainDoor.style.display = "flex";
        
        let gear = document.createElement("div");
        gear.className = "interactive-item css-gear";
        gear.style.left = "225px"; gear.style.top = "190px";
        gear.onclick = () => showMessage("齒輪轉動了，請點擊下方按鈕對齊機械結構");
        roomView.appendChild(gear);

        createControlPanel(`
            <button onclick="checkLevel6()">對齊機械齒輪</button>
        `);

    } else if (currentLevel === 7) {
        roomTitle.innerText = "第 7 關：雷射保全解除";
        mainDoor.style.display = "flex";

        let scanner = document.createElement("div");
        scanner.className = "interactive-item css-terminal";
        scanner.style.left = "220px"; scanner.style.top = "190px";
        scanner.onclick = () => {
            addClue(`第 7 關保全密碼：${gamePasswords.level7}`);
            showMessage(`保全終端機提示：預設解除密碼為 ${gamePasswords.level7}`);
        };
        roomView.appendChild(scanner);

        createControlPanel(`
            <input type="text" id="p7" placeholder="輸入保全密碼" style="width:110px;">
            <button onclick="checkLevel7()">解除保全</button>
        `);

    } else if (currentLevel === 8) {
        roomTitle.innerText = "第 8 關：終極逃生大門";
        mainDoor.style.display = "flex";
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
        roomView.appendChild(hintObj);

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
    roomView.appendChild(panel);
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
    if (levelState.pots.length < 3) {
        levelState.pots.push(color);
        document.getElementById("potionText").innerText = `已選序列: ${levelState.pots.join("->")}`;
    } else { showMessage("試管最多只能容納三種試劑！"); }
}

function checkLevel4Advanced() {
    let p = levelState.pots;
    if (p.length === 3 && p[0] === "藍" && p[1] === "紅" && p[2] === "綠") {
        showMessage("三色順序完全融合！化學反應開啟大門！");
        currentLevel = 5;
        setTimeout(loadLevel, 800);
    } else {
        showMessage("配方順序錯誤，試管冒出黑煙失敗！");
        levelState.pots = [];
        document.getElementById("potionText").innerText = `已選序列: 無`;
    }
}

function toggleWire(num) {
    levelState.wires[num] = !levelState.wires[num];
    let el = document.getElementById(`w${num}`);
    if (levelState.wires[num]) el.classList.add("connected");
    else el.classList.remove("connected");
}

function checkLevel5Advanced() {
    let w = levelState.wires;
    if (w[1] && !w[2] && w[3] && w[4] && !w[5] && w[6]) {
        showMessage("正確光纖波長接通！電流湧入！");
        currentLevel = 6;
        setTimeout(loadLevel, 800);
    } else {
        showMessage("線路發生短路或斷路！防禦網未解除！");
    }
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
            document.getElementById("finalBox").innerHTML = `
                <button onclick="checkLevel8Key()" style="background-color:#2ed573; color:#fff;">插入鑰匙逃脫！</button>
            `;
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
    mainDoor.style.display = "none";
    
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

    leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
    leaderboard = leaderboard.slice(0, 3);
    localStorage.setItem("wifi_game_leaderboard", JSON.stringify(leaderboard));

    let rankListHTML = leaderboard.map((item, index) => 
        `<li style="margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 4px;">
            <span style="color: #ffd700; font-weight: bold;">第 ${index + 1} 名：${item.name}</span>
            <span style="color: #ffffff; font-weight: bold;">${item.score} 分 <span style="color: #94a3b8; font-size: 12px;">(${item.time}秒)</span></span>
        </li>`
    ).join("");

    roomTitle.innerText = "8關全部完美通關！";
    roomView.innerHTML = `
        <div style="text-align: center; max-height: 420px; overflow-y: auto; width: 100%; padding: 10px; box-sizing: border-box;">
            <div style="font-size: 50px; margin-bottom: 2px;">${rankEmoji}</div>
            <h3 style="color: #ffd700; margin: 4px 0; font-size: 18px; font-weight: bold;">${rankTitle}</h3>
            <p style="font-size: 13px; color: #cbd5e0; margin: 4px 0;">玩家：<strong>${playerName}</strong> | 本次耗時：<strong>${seconds}</strong> 秒 | 最終得分：<strong style="color:#2ed573;">${score}</strong> 分</p>
            
            <div style="background: #1e1e24; padding: 12px 18px; border-radius: 8px; margin: 12px auto; width: 280px; text-align: left; border: 2px solid #ffd700; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <h4 style="margin: 0 0 8px 0; color: #ffd700; text-align: center; font-size: 15px;">🏆 英雄排行榜 (Top 3)</h4>
                <ul style="padding-left: 0; list-style: none; margin: 0; font-size: 13px;">
                    ${rankListHTML}
                </ul>
            </div>

            <button onclick="location.reload()" style="background-color: #4b6584; color: #fff; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none; margin-top: 5px;">再挑戰一次</button>
        </div>
    `;
    document.getElementById("inventoryBar").style.display = "none";
}

window.onload = function() {
    if(menuView) menuView.style.display = "flex";
    if(gameViewContainer) gameViewContainer.style.display = "none";
};
