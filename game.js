// ====== 遊戲基礎密碼與變數設定 ======
const gamePasswords = {
    level1: Math.floor(1000 + Math.random() * 9000).toString(),
    level3: Math.floor(1000 + Math.random() * 9000).toString(),
    level7: Math.floor(1000 + Math.random() * 9000).toString(),
};
gamePasswords.level8 = gamePasswords.level1 + gamePasswords.level3;

// 🔒 建立第 1 關密碼的地獄 5 層加密鏈字典
const morseDictionary = {
    'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.', 'f': '..-.', 'g': '--.', 'h': '....', 'i': '..', 'j': '.---', 'k': '-.-', 'l': '.-..', 'm': '--', 'n': '-.', 'o': '---', 'p': '.--.', 'q': '--.-', 'r': '.-.', 's': '...', 't': '-', 'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-', 'y': '-.--', 'z': '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.'
};

// 🔒 執行地獄級五層加密鏈計算
const chainL1_Original = gamePasswords.level1;                                       // 1. 十進位
const chainL2_Binary = parseInt(chainL1_Original).toString(2);                        // 2. ➔ 變二進位
const chainL3_Hex = BigInt("0b" + chainL2_Binary).toString(16).toLowerCase();         // 3. ➔ 變十六進位串
const chainL4_Caesar = chainL3_Hex.split('').map(char => {                            // 4. ➔ 變凱薩密碼 (位移3)
    let code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) return String.fromCharCode(((code - 48 + 3) % 10) + 48);
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 3) % 26) + 97);
    return char;
}).join('');
const chainL5_Morse = chainL4_Caesar.split('').map(c => morseDictionary[c] || '').join(' '); // 5. ➔ 翻成地獄極長摩斯密碼

let currentLevel = 1;
let seconds = 0;
let timerInterval = null;
let inventory = [];
let levelState = {};
let collectedClues = [];
let leaderboard = []; 

let myRoomPIN = null;
let isMultiplayer = false;
let lobbyCheckInterval = null;

// DOM 元素綁定
const roomTitle = document.getElementById("roomTitle");
const timerEl = document.getElementById("timer");
const roomView = document.getElementById("roomView");
const messageBox = document.getElementById("messageBox");
const mainDoor = document.getElementById("mainDoor");
const menuView = document.getElementById("menuView");
const gameViewContainer = document.getElementById("gameViewContainer");
const mpPanel = document.getElementById("mpPanel");
const lobbyView = document.getElementById("lobbyView");
const lobbyStatus = document.getElementById("lobbyStatus");
const playerList = document.getElementById("playerList");
const hostStartBtn = document.getElementById("hostStartBtn");
const clientWaitText = document.getElementById("clientWaitText");

// 全自動免設定公開雲端 API 節點
const GAME_KEY = "leave-wi-fi-time-game-pancy0919";
const API_URL = `https://keyvalue.xyz{GAME_KEY}`;

function startSingleGame() {
    isMultiplayer = false;
    if (menuView) menuView.style.display = "none";
    if (lobbyView) lobbyView.style.display = "none";
    if (gameViewContainer) gameViewContainer.style.display = "flex";
    startTimer();
    loadLevel();
}

async function createRoomMenu() {
    if (mpPanel) mpPanel.style.display = "block";
    myRoomPIN = Math.floor(1000 + Math.random() * 9000).toString();
    try {
        showMessage("正在雲端建立房間...");
        await fetch(`${API_URL}/room_${myRoomPIN}`, { method: 'PUT', body: JSON.stringify({ status: "waiting", passwords: gamePasswords }) });
        if (menuView) menuView.style.display = "none";
        if (lobbyView) lobbyView.style.display = "flex";
        if (lobbyStatus) lobbyStatus.innerText = `房間號碼 PIN：${myRoomPIN}`;
        if (playerList) playerList.innerHTML = `<p style="color:#2ed573;">● 房主 (你) 已就位</p><p style="color:#ff9f43;">⏳ 正在等待隊友加入...</p>`;
        if (hostStartBtn) hostStartBtn.style.display = "block";
        startLobbyPolling(true);
    } catch (e) { alert("雲端網路連線失敗！"); }
}

async function hostLaunchGame() {
    if (lobbyCheckInterval) clearInterval(lobbyCheckInterval);
    try {
        await fetch(`${API_URL}/room_${myRoomPIN}`, { method: 'PUT', body: JSON.stringify({ status: "start", passwords: gamePasswords }) });
        isMultiplayer = true;
        startSingleGame();
    } catch (e) { alert("啟動連線失敗。"); }
}

function joinRoomMenu() {
    if (mpPanel) {
        mpPanel.style.display = "block";
        mpPanel.innerHTML = `
            <h4 style="color:#ffd700; margin:0 0 10px 0;">🔑 加入聯機房間</h4>
            <input type="text" id="pinInput" placeholder="輸入 4 位 PIN 碼" style="width:120px; margin-bottom:10px; font-size:12px;"><br>
            <button onclick="realCloudConnectRoom()" style="padding:5px 12px; font-size:12px; background-color:#2ed573; color:#fff; border:none; cursor:pointer;">確認聯機</button>
        `;
    }
}

async function realCloudConnectRoom() {
    let pin = document.getElementById("pinInput").value.trim();
    if (!/^\d{4}$/.test(pin)) {
        alert("❌ 請輸入正確的 4 位「純數字」PIN 碼！輸入其他亂碼（如歪歪）是進不去的。");
        return;
    }
    showMessage("正在連線雲端尋找房間...");
    try {
        const response = await fetch(`${API_URL}/room_${pin}?t=${Date.now()}`);
        const roomData = await response.json();
        if (!roomData || !roomData.passwords || roomData.status !== "waiting") {
            alert("❌ 找不到這個聯機房間！號碼不存在或遊戲已開始。");
            return;
        }
        Object.assign(gamePasswords, roomData.passwords);
        myRoomPIN = pin;
        isMultiplayer = true;
        await fetch(`${API_URL}/room_${pin}`, { method: 'PUT', body: JSON.stringify({ status: "joined", passwords: gamePasswords }) });
        if (menuView) menuView.style.display = "none";
        if (lobbyView) lobbyView.style.display = "flex";
        if (lobbyStatus) lobbyStatus.innerText = `房間號碼 PIN：${myRoomPIN}`;
        if (playerList) playerList.innerHTML = `<p style="color:#2ed573;">● 房主已在房間內</p><p style="color:#2ed573;">● 隊友 (你) 已成功連線</p>`;
        startLobbyPolling(false);
    } catch (error) { alert("❌ 連線伺服器失敗。"); }
}

function startLobbyPolling(isHost) {
    if (lobbyCheckInterval) clearInterval(lobbyCheckInterval);
    lobbyCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/room_${myRoomPIN}?t=${Date.now()}`);
            if (response.ok) {
                const roomData = await response.json();
                if (isHost && roomData.status === "joined") {
                    if (playerList) playerList.innerHTML = `<p style="color:#2ed573;">● 房主 (你) 已就位</p><p style="color:#2ed573;">● 🎉 隊友已成功聯機進來了！</p>`;
                }
                if (!isHost && roomData.status === "start") {
                    clearInterval(lobbyCheckInterval);
                    startSingleGame();
                }
            }
        } catch (e) {}
    }, 1200);
}
// ====== 基礎工具控制函式 ======
function startTimer() { if (timerInterval) clearInterval(timerInterval); timerInterval = setInterval(() => { seconds++; if (timerEl) timerEl.innerText = `時間: ${seconds}秒`; }, 1000); }
function showMessage(text) { if (messageBox) { messageBox.innerText = text; messageBox.style.opacity = 1; setTimeout(() => { messageBox.style.opacity = 0; }, 2800); } }
function addClue(clueText) { if (!collectedClues.includes(clueText)) { collectedClues.push(clueText); updateNotebookUI(); } }
function updateNotebookUI() { const listEl = document.getElementById("notebookList"); if (listEl) listEl.innerHTML = collectedClues.length === 0 ? "<li>尚未收集到任何線索...</li>" : collectedClues.map(c => `<li style="color: #6ee7b7; margin-bottom: 4px;">${c}</li>`).join(""); }
function toggleNotebook(show) { const modalEl = document.getElementById("notebookModal"); if (modalEl) modalEl.style.display = show ? "flex" : "none"; }

function updateInventory() {
    for (let i = 0; i < 2; i++) {
        const slot = document.getElementById(`slot${i}`);
        if (slot) {
            slot.innerHTML = ""; slot.classList.remove("has-item");
            if (inventory[i]) {
                let itemVisual = document.createElement("div"); itemVisual.className = inventory[i].className;
                slot.appendChild(itemVisual); slot.classList.add("has-item");
            }
        }
    }
}

function createControlPanel(htmlContent) {
    let panel = document.getElementById("controlPanel");
    if (!panel) { panel = document.createElement("div"); panel.id = "controlPanel"; panel.className = "control-panel"; }
    panel.innerHTML = htmlContent; if (roomView) roomView.appendChild(panel);
}

// ====== 🗺 第 1 關到第 8 關房間載入邏輯 ======
function loadLevel() {
    const oldPanel = document.getElementById("controlPanel"); if (oldPanel) oldPanel.remove();
    
    // 清除舊動態道具，確保不誤刪常駐元件
    const oldGameItems = roomView.querySelectorAll(".interactive-item");
    oldGameItems.forEach(el => el.remove());
    
    document.getElementById("secretRoom").style.display = "none"; 

    if (currentLevel === 1) {
        if (roomTitle) roomTitle.innerText = "第 1 關：尋找密碼紙條";
        let note = document.createElement("div"); 
        note.className = "interactive-item css-paper"; 
        note.style.left = "70px"; 
        note.style.top = "150px";
        note.style.position = "absolute";
        
        note.onclick = () => { 
            showMessage(`紙條寫著密碼：${gamePasswords.level1}`); 
            addClue(`【10進位】: ${chainL1_Original}\n➔【2進位】: ${chainL2_Binary}\n➔【16進位】: ${chainL3_Hex}\n➔【凱薩密碼】: ${chainL4_Caesar}\n➔【終極摩斯】: ${chainL5_Morse}`); 
        };
        if (roomView) roomView.appendChild(note);
        createControlPanel(`<input type="text" id="p1" placeholder="輸入4位密碼" style="width:110px;"><button onclick="checkLevel1()">開門</button>`);
    } else if (currentLevel === 2) {
        if (roomTitle) roomTitle.innerText = "第 2 關：取得鑰匙";
        let key = document.createElement("div"); key.className = "interactive-item css-key"; key.style.right = "60px"; key.style.top = "240px";
        key.onclick = () => { if (!inventory.some(i => i.id === "key")) { inventory.push({ id: "key", className: "css-key", name: "大門鑰匙", washed: false }); updateInventory(); key.remove(); addClue("獲得道具：大門鑰匙 (表面沾有塗層)"); showMessage("你撿起了鑰匙放入道具欄！"); } };
        if (roomView) roomView.appendChild(key);
        createControlPanel(`<button onclick="checkLevel2()">用道具欄鑰匙開門</button>`);
    } else if (currentLevel === 3) {
        if (roomTitle) roomTitle.innerText = "第 3 關：倒水解謎";
        levelState.cupHasWater = false;
        let cup = document.createElement("div"); cup.className = "interactive-item css-cup"; cup.style.left = "220px"; cup.style.top = "190px";
        cup.onclick = () => { if (inventory.some(i => i.id === "water")) { inventory = inventory.filter(i => i.id !== "water"); updateInventory(); levelState.cupHasWater = true; cup.className = "interactive-item css-cup has-water"; addClue(`第 3 關密碼：${gamePasswords.level3}`); showMessage(`水倒入杯中，浮現出隱藏數字：${gamePasswords.level3}`); } else { showMessage("空杯子需要先倒水才行..."); } };
        if (roomView) roomView.appendChild(cup);
        let bottle = document.createElement("div"); bottle.className = "interactive-item css-cup has-water"; bottle.style.left = "60px"; bottle.style.top = "250px";
        bottle.onclick = () => { if (!inventory.some(i => i.id === "water")) { inventory.push({ id: "water", className: "css-cup has-water", name: "水壺" }); updateInventory(); bottle.remove(); addClue("獲得道具：水壺"); showMessage("你拿起了水壺！"); } };
        if (roomView) roomView.appendChild(bottle);
        createControlPanel(`<input type="text" id="p3" placeholder="輸入密碼" style="width:90px;"><button onclick="checkLevel3()">解鎖</button>`);
    } else if (currentLevel === 4) {
        if (roomTitle) roomTitle.innerText = "第 4 關：化學試管調配 (三色精密融合)";
        levelState.pots = [];
        let p1 = document.createElement("div"); p1.className = "interactive-item css-cup"; p1.style.background = "rgba(255,0,0,0.5)"; p1.style.left = "90px"; p1.style.top = "200px"; p1.onclick = () => addPotion("紅"); if (roomView) roomView.appendChild(p1);
        let p2 = document.createElement("div"); p2.className = "interactive-item css-cup"; p2.style.background = "rgba(0,0,255,0.5)"; p2.style.left = "220px"; p2.style.top = "200px"; p2.onclick = () => addPotion("藍"); if (roomView) roomView.appendChild(p2);
        let p3 = document.createElement("div"); p3.className = "interactive-item css-cup"; p3.style.background = "rgba(0,255,0,0.5)"; p3.style.left = "350px"; p3.style.top = "200px"; p3.onclick = () => addPotion("綠"); if (roomView) roomView.appendChild(p3);
        createControlPanel(`<span id="potionText" style="font-size:13px; color:#38bdf8; font-weight:bold;">已選序列: 無</span><button onclick="checkLevel4Advanced()">倒入混合 (需依照 藍->紅->綠 順序)</button>`);
    } else if (currentLevel === 5) {
        if (roomTitle) roomTitle.innerText = "第 5 關：接通電線";
        levelState.wires = { 1: false, 2: false, 3: false };
        let wirePanel = document.createElement("div"); wirePanel.id = "controlPanel"; wirePanel.className = "control-panel"; wirePanel.style.flexDirection = "column"; wirePanel.style.gap = "8px";
        wirePanel.innerHTML = `<div style="display:flex; gap:12px; justify-content:center;"><div class="wire" id="w1" onclick="toggleWire(1)" style="width:30px; height:30px; background:#4b6584; border-radius:50%; cursor:pointer;"></div><div class="wire" id="w2" onclick="toggleWire(2)" style="width:30px; height:30px; background:#4b6584; border-radius:50%; cursor:pointer;"></div><div class="wire" id="w3" onclick="toggleWire(3)" style="width:30px; height:30px; background:#4b6584; border-radius:50%; cursor:pointer;"></div></div><button onclick="checkLevel5()" style="margin-top:5px;">通電開門</button>`;
        if (roomView) roomView.appendChild(wirePanel);
    } else if (currentLevel === 6) {
        if (roomTitle) roomTitle.innerText = "第 6 關：齒輪對齊";
        let gear = document.createElement("div"); gear.className = "interactive-item css-gear"; gear.style.left = "225px"; gear.style.top = "190px";
        if (roomView) roomView.appendChild(gear);
        createControlPanel(`<button onclick="checkLevel6()">對齊機械齒輪</button>`);
    } else if (currentLevel === 7) {
        if (roomTitle) roomTitle.innerText = "第 7 關：雷射保全解除";
        let scanner = document.createElement("div"); scanner.className = "interactive-item css-terminal"; scanner.style.left = "220px"; scanner.style.top = "190px";
        scanner.onclick = () => { addClue(`第 7 關保全密碼：${gamePasswords.level7}`); showMessage(`保全終端機提示：預設解除密碼為 ${gamePasswords.level7}`); };
        if (roomView) roomView.appendChild(scanner);
        createControlPanel(`<input type="text" id="p7" placeholder="輸入保全密碼" style="width:110px;"><button onclick="checkLevel7()">解除保全</button>`);
    } else if (currentLevel === 8) {
        if (roomTitle) roomTitle.innerText = "第 8 關：終極逃生大門";
        levelState.finalPhase = "input";
        let hintObj = document.createElement("div"); hintObj.className = "interactive-item css-cup has-water"; hintObj.style.left = "235px"; hintObj.style.top = "170px";
        hintObj.onclick = () => { let keyItem = inventory.find(i => i.id === "key"); if (keyItem) { keyItem.washed = true; addClue(`終極提示：組合第1關與第3關密碼 (${gamePasswords.level8})`); showMessage(`你用水清洗鑰匙，浮現最終提示：「請輸入綜合密碼 ${gamePasswords.level8}」`); } else { showMessage("這裡需要用水清洗鑰匙上的特殊塗層..."); } };
        if (roomView) roomView.appendChild(hintObj);
        createControlPanel(`<div id="finalBox" style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; justify-content:center;"><input type="text" id="p8" placeholder="輸入綜合密碼" style="width:140px;"><button onclick="checkLevel8Code()">送出密碼</button></div>`);
    }
}
// ====== 🔓 各關卡驗證與排行榜同步 ======
function checkLevel1() {
    let val = document.getElementById("p1").value;
    
    // 💥 觸發地獄級五層加密鏈彩蛋
    if (val === "hell" || val === "secret") {
        showMessage("⚠️ 進入地獄級加密暗號空間！");
        document.getElementById("secretRoom").style.display = "flex";
        document.getElementById("secretMorseDisplay").innerText = chainL5_Morse;
        return;
    }
    if (val === gamePasswords.level1) { showMessage("密碼正確！"); currentLevel = 2; setTimeout(loadLevel, 800); } 
    else { showMessage("密碼錯誤！請查看筆記本"); }
}

function checkSecretRoomCode() {
    let input = document.getElementById("secretInput").value.trim().toLowerCase();
    const terminal = document.getElementById("hintTerminalOutput");
    if (input === "hint1") { terminal.innerText = `[層1-二進位] 全長度共: ${chainL2_Binary.length} 碼`; return; }
    if (input === "hint2") { terminal.innerText = `[層2-十六進位串] 轉碼結果: ${chainL3_Hex}`; return; }
    if (input === "hint3") { terminal.innerText = `[層3-凱薩密碼移位] 已完全打亂。`; return; }
    if (input === "hint4") { terminal.innerText = `核心解鎖明文：就是【層3的結果字串】！`; return; }

    if (input === chainL4_Caesar) {
        alert("🎉 破解成功！直接跳級直達終局第 8 關！");
        currentLevel = 8; loadLevel();
    } else { alert("❌ 核心辨識碼錯誤！"); }
}

function checkLevel2() { if (inventory.some(i => i.id === "key")) { showMessage("鑰匙解鎖成功！"); currentLevel = 3; setTimeout(loadLevel, 800); } else { showMessage("門鎖著，需要先拿鑰匙！"); } }
function checkLevel3() { let val = document.getElementById("p3").value; if (val === gamePasswords.level3 && levelState.cupHasWater) { showMessage("解謎成功！"); currentLevel = 4; setTimeout(loadLevel, 800); } else { showMessage("密碼錯誤，或者杯子還沒加水！"); } }
function addPotion(color) { if (levelState.pots.length < 3) { levelState.pots.push(color); const textEl = document.getElementById("potionText"); if (textEl) textEl.innerText = `已選序列: ${levelState.pots.join("->")}`; } else { showMessage("試管最多只能容納三種試劑！"); } }

function checkLevel4Advanced() {
    let p = levelState.pots;
    if (p.length === 3 && p[0] === "藍" && p[1] === "紅" && p[2] === "綠") { showMessage("三色順序完全融合！化學反應開啟大門！"); currentLevel = 5; setTimeout(loadLevel, 800); } 
    else { showMessage("配方順序錯誤，試管冒出黑煙失敗！"); levelState.pots = []; const textEl = document.getElementById("potionText"); if (textEl) textEl.innerText = `已選序列: 無`; }
}

function toggleWire(num) { levelState.wires[num] = !levelState.wires[num]; let el = document.getElementById(`w${num}`); if (el) { if (levelState.wires[num]) el.classList.add("connected"); else el.classList.remove("connected"); } }
function checkLevel5() { let w = levelState.wires; if (w && w[1] && w[2] && w[3]) { showMessage("電流接通！"); currentLevel = 6; setTimeout(loadLevel, 800); } else { showMessage("還有電線是斷路的！"); } }
function checkLevel6() { showMessage("齒輪完美對齊！"); currentLevel = 7; setTimeout(loadLevel, 800); }
function checkLevel7() { let val = document.getElementById("p7").value; if (val === gamePasswords.level7) { showMessage("保全系統解除！"); currentLevel = 8; setTimeout(loadLevel, 800); } else { showMessage("保全密碼錯誤！"); } }
function checkLevel8Code() { let val = document.getElementById("p8").value; let keyItem = inventory.find(i => i.id === "key"); if (val === gamePasswords.level8) { if (keyItem && keyItem.washed) { levelState.finalPhase = "insertKey"; const boxEl = document.getElementById("finalBox"); if (boxEl) { boxEl.innerHTML = `<button onclick="checkLevel8Key()" style="background-color:#2ed573; color:#fff;">插入鑰匙逃脫！</button>`; } showMessage("密碼正確！請插入鑰匙！"); } else { showMessage("密碼正確，但鑰匙還沒用水清洗過！"); } } else { showMessage("綜合密碼錯誤！提示：請檢視筆記本中的第1關與第3關密碼。"); } }
function checkLevel8Key() { let keyItem = inventory.find(i => i.id === "key"); if (keyItem && keyItem.washed) endGame(); }

function endGame() {
    clearInterval(timerInterval);
    if (mainDoor) mainDoor.style.display = "none";
    let score = seconds <= 60 ? 100 : Math.max(10, 100 - Math.floor((seconds - 60) / 5));
    let rankEmoji = seconds <= 60 ? "🥇" : (seconds <= 120 ? "🥈" : "🥉");
    let rankTitle = seconds <= 60 ? "第一名 (閃電通關王)" : "優秀解謎者";
    let playerName = prompt("🎉 成功通關！請輸入你的名字留在排行榜上：") || "無名英雄";

    (async function handleCloudLeaderboard() {
        showMessage("正在同步雲端排行榜...");
        if (isMultiplayer && myRoomPIN) { try { await fetch(`${API_URL}/room_${myRoomPIN}`, { method: 'DELETE' }); } catch(e) {} }
        try {
            const response = await fetch(`${API_URL}/global_leaderboard?t=${Date.now()}`);
            if (response.ok) { const textData = await response.text(); leaderboard = textData ? JSON.parse(textData) : []; }
        } catch (e) { leaderboard = JSON.parse(localStorage.getItem("wifi_game_leaderboard") || "[]"); }

        let existingRecordIndex = leaderboard.findIndex(item => item.name === playerName);
        if (existingRecordIndex !== -1) {
            if (score > leaderboard[existingRecordIndex].score || (score === leaderboard[existingRecordIndex].score && seconds < leaderboard[existingRecordIndex].time)) {
                leaderboard[existingRecordIndex] = { name: playerName, time: seconds, score: score, date: new Date().toLocaleDateString() };
                showMessage("🏆 刷新最高紀錄！");
            }
        } else { leaderboard.push({ name: playerName, time: seconds, score: score, date: new Date().toLocaleDateString() }); }

        leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);
        try {
            localStorage.setItem("wifi_game_leaderboard", JSON.stringify(leaderboard));
            await fetch(`${API_URL}/global_leaderboard`, { method: 'PUT', body: JSON.stringify(leaderboard) });
        } catch (error) {}

        let top3 = leaderboard.slice(0, 3);
        let rankListHTML = top3.map((item, index) => `<li style="margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 4px;"><span style="color: #ffd700; font-weight: bold;">第 ${index + 1} 名：${item.name}</span><span style="color: #ffffff; font-weight: bold;">${item.score} 分 <span style="color: #94a3b8; font-size: 12px;">(${item.time}秒)</span></span></li>`).join("");

        if (roomTitle) roomTitle.innerText = "8關全部完美通關！";
        if (roomView) {
            roomView.innerHTML = `
                <div style="text-align: center; max-height: 420px; overflow-y: auto; width: 100%; padding: 10px; box-sizing: border-box;">
                    <div style="font-size: 50px; margin-bottom: 2px;">${rankEmoji}</div>
                    <h3 style="color: #ffd700; margin: 4px 0; font-size: 18px; font-weight: bold;">${rankTitle}</h3>
                    <p style="font-size: 13px; color: #cbd5e0; margin: 4px 0;">玩家：<strong>${playerName}</strong> | 本次耗時：<strong>${seconds}</strong> 秒 | 最終得分：<strong style="color:#2ed573;">${score}</strong> 分</p>
                    <div style="background: #1e1e24; padding: 12px 18px; border-radius: 8px; margin: 12px auto; width: 280px; text-align: left; border: 2px solid #ffd700; box-shadow: 0 4px 15px rgba(0,0,0,0.3);"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><h4 style="margin: 0; color: #ffd700; font-size: 15px;">📊 雲端全球排行榜</h4><button id="showMoreBtn" onclick="expandLeaderboard()" style="padding: 2px 8px; font-size: 11px; background-color: #4b6584; color: #fff;">看更多</button></div><ul id="mainRankList" style="padding-left: 0; list-style: none; margin: 0; font-size: 13px;">${rankListHTML}</ul></div>
                    <button onclick="location.reload()" style="background-color: #4b6584; color: #fff; padding: 8px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: none; margin-top: 5px;">再挑戰一次</button>
                </div>`;
        }
        const barEl = document.getElementById("inventoryBar"); if (barEl) barEl.style.display = "none";
    })();
}

async function expandLeaderboard() {
    const listEl = document.getElementById("mainRankList"); const btnEl = document.getElementById("showMoreBtn");
    if (listEl) listEl.innerHTML = "<li>正在連線雲端更新排行...</li>";
    try {
        const response = await fetch(`${API_URL}/global_leaderboard?t=${Date.now()}`);
        if (response.ok) { leaderboard = await response.json(); }
    } catch (e) {}
    if (listEl) {
        listEl.innerHTML = leaderboard.map((item, index) => `<li style="margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 4px;"><span style="color: ${index < 3 ? '#ffd700' : '#cbd5e0'}; font-weight: bold;">第 ${index + 1} 名：${item.name}</span><span style="color: #ffffff;">${item.score} 分 <span style="color: #666; font-size: 11px;">(${item.time}s)</span></span></li>`).join("");
    }
    if (btnEl) btnEl.style.display = "none";
}

window.onload = function() {
    if (menuView) menuView.style.display = "flex";
    if (gameViewContainer) gameViewContainer.style.display = "none";
    if (lobbyView) lobbyView.style.display = "none";
};
