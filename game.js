// ====== 遊戲基礎密碼與變數設定 ======
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
let leaderboard = []; 

// 聯機專用核心變數
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

// ====== ☁️ 全自動雲端網址 (免任何金鑰與噁心設定) ======
const GAME_KEY = "leave-wi-fi-time-game-pancy0919";
const API_URL = `https://keyvalue.xyz{GAME_KEY}`;

// 啟動單人遊戲
function startSingleGame() {
    isMultiplayer = false;
    if (menuView) menuView.style.display = "none";
    if (lobbyView) lobbyView.style.display = "none";
    if (gameViewContainer) gameViewContainer.style.display = "flex";
    startTimer();
    loadLevel();
}

// 🏠 房主：創建「真實」雲端聯機房間
async function createRoomMenu() {
    if (mpPanel) mpPanel.style.display = "block";
    myRoomPIN = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
        showMessage("正在雲端建立房間...");
        // 在公開雲端建立一個以房號為名的欄位，紀錄狀態與房主生成的密碼
        await fetch(`${API_URL}/room_${myRoomPIN}`, {
            method: 'PUT',
            body: JSON.stringify({ status: "waiting", passwords: gamePasswords })
        });

        if (menuView) menuView.style.display = "none";
        if (lobbyView) lobbyView.style.display = "flex";
        
        if (lobbyStatus) lobbyStatus.innerText = `房間號碼 PIN：${myRoomPIN}`;
        if (playerList) playerList.innerHTML = `<p style="color:#2ed573;">● 房主 (你) 已就位</p><p style="color:#ff9f43;">⏳ 正在等待隊友加入...</p>`;
        if (hostStartBtn) hostStartBtn.style.display = "block";
        if (clientWaitText) clientWaitText.style.display = "none";

        // 房主啟動循環檢查，看看隊友是不是加入了
        startLobbyPolling(true);
    } catch (e) {
        alert("雲端網路連線失敗，請檢查您的 Wi-Fi！");
    }
}

// 房主正式按下：全員到齊，啟動遊戲！
async function hostLaunchGame() {
    if (lobbyCheckInterval) clearInterval(lobbyCheckInterval);
    try {
        await fetch(`${API_URL}/room_${myRoomPIN}`, {
            method: 'PUT',
            body: JSON.stringify({ status: "start", passwords: gamePasswords })
        });
        isMultiplayer = true;
        startSingleGame();
    } catch (e) {
        alert("啟動連線失敗。");
    }
}

// 🔑 隊友：輸入房間號碼介面
function joinRoomMenu() {
    if (mpPanel) {
        mpPanel.style.display = "block";
        mpPanel.innerHTML = `
            <h4 style="color:#ffd700; margin:0 0 10px 0;">🔑 加入聯機房間</h4>
            <input type="text" id="pinInput" placeholder="輸入 4 位 PIN 碼" style="width:120px; margin-bottom:10px; font-size:12px;"><br>
            <button onclick="connectRoom()" style="padding:5px 12px; font-size:12px; background-color:#2ed573; color:#fff; border:none; cursor:pointer;">確認聯機</button>
        `;
    }
}

// ⚡ 隊友：連線到真實雲端，驗證有沒有這個房間！
async function connectRoom() {
    let pin = document.getElementById("pinInput").value;
    if (pin.length !== 4) {
        alert("請輸入正確的 4 位數字 PIN 碼！");
        return;
    }

    showMessage("正在連線雲端尋找房間...");
    try {
        const response = await fetch(`${API_URL}/room_${pin}`);
        if (!response.ok) {
            alert("❌ 找不到這個房間！隨便亂打是進不去的喔。");
            return;
        }
        
        const roomData = await response.json();
        if (roomData && roomData.passwords) {
            // 💡 核心技術：把隊友的密碼，替換成房主在雲端產生的同步密碼！
            Object.assign(gamePasswords, roomData.passwords);
            myRoomPIN = pin;
            isMultiplayer = true;
            
            // 告訴雲端「隊友已經成功進來了」
            await fetch(`${API_URL}/room_${pin}`, {
                method: 'PUT',
                body: JSON.stringify({ status: "joined", passwords: gamePasswords })
            });

            if (menuView) menuView.style.display = "none";
            if (lobbyView) lobbyView.style.display = "flex";
            if (lobbyStatus) lobbyStatus.innerText = `房間號碼 PIN：${myRoomPIN}`;
            if (playerList) playerList.innerHTML = `<p style="color:#2ed573;">● 房主已在房間內</p><p style="color:#2ed573;">● 隊友 (你) 已成功連線</p>`;
            if (hostStartBtn) hostStartBtn.style.display = "none";
            if (clientWaitText) clientWaitText.style.display = "block";

            // 隊友啟動循環檢查，等待房主按下「啟動遊戲」
            startLobbyPolling(false);
        } else {
            alert("❌ 該房間資料不完整或已失效。");
        }
    } catch (error) {
        alert("❌ 連線伺服器失敗，請確認網路狀態。");
    }
}

// 🔄 等候室即時狀態同步同步 (每秒看一次雲端)
function startLobbyPolling(isHost) {
    if (lobbyCheckInterval) clearInterval(lobbyCheckInterval);
    lobbyCheckInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_URL}/room_${myRoomPIN}`);
            if (response.ok) {
                const roomData = await response.json();
                if (isHost && roomData.status === "joined") {
                    if (playerList) playerList.innerHTML = `<p style="color:#2ed573;">● 房主 (你) 已就位</p><p style="color:#2ed573;">● 🎉 隊友已成功聯機進來了！</p>`;
                }
                if (!isHost && roomData.status === "start") {
                    // 房主啟動了！隊友這邊也立刻同步啟動
                    clearInterval(lobbyCheckInterval);
                    startSingleGame();
                }
            }
        } catch (e) { console.error(e); }
    }, 1200);
}
// ====== 🗺 關卡載入核心邏輯 ======
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
        if (roomTitle) roomTitle.innerText = "第 4 關：化學試管調配 (三色精密融合)";
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
            <span id="potionText" style="font-size:13px; color:#38bdf8; font-weight:bold;">已選序列: 無</span>
            <button onclick="checkLevel4Advanced()">倒入混合 (需依照 藍->紅->綠 順序)</button>
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
            <div style="display:flex; gap:12px; justify-content:center;">
                <div class="wire" id="w1" onclick="toggleWire(1)"></div>
                <div class="wire" id="w2" onclick="toggleWire(2)"></div>
                <div class="wire" id="w3" onclick="toggleWire(3)"></div>
            </div>
            <button onclick="checkLevel5()" style="margin-top:5px;">通電開門</button>
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
    }
}
// ====== 🔓 各關卡密碼與通關驗證 ======
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
        const textEl = document.getElementById("potionText");
        if (textEl) textEl.innerText = `已選序列: ${levelState.pots.join("->")}`;
    } else { showMessage("試管最多只能容納三種試劑！"); }
}

// 🎯 修正版：個別檢查陣列內第 0, 1, 2 個元素是否完全符合「藍->紅->綠」
function checkLevel4Advanced() {
    let p = levelState.pots;
    if (p.length === 3 && p[0] === "藍" && p[1] === "紅" && p[2] === "綠") {
        showMessage("三色順序完全融合！化學反應開啟大門！");
        currentLevel = 5;
        setTimeout(loadLevel, 800);
    } else {
        showMessage("配方順序錯誤，試管冒出黑煙失敗！");
        levelState.pots = [];
        const textEl = document.getElementById("potionText");
        if (textEl) textEl.innerText = `已選序列: 無`;
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
    if (w[1] && w[2] && w[3]) {
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
                    <button onclick="checkLevel8Key()" style="background-color:#2ed573; color:#fff; padding:6px 12px; border-radius:4px;">插入鑰匙逃脫！</button>
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

// ====== 🏁 遊戲結束：自動同步至免費公開雲端排行榜 ======
function endGame() {
    clearInterval(timerInterval);
    if (mainDoor) mainDoor.style.display = "none";
    
    let score = seconds <= 60 ? 100 : Math.max(10, 100 - Math.floor((seconds - 60) / 5));
    let rankEmoji = seconds <= 60 ? "🥇" : (seconds <= 120 ? "🥈" : "🥉");
    let rankTitle = seconds <= 60 ? "第一名 (閃電通關王)" : "優秀解謎者";

    let playerName = prompt("🎉 成功通關！請輸入你的名字留在排行榜上：") || "無名英雄";

    // 啟動全自動非同步雲端排行榜同步
    (async function handleCloudLeaderboard() {
        showMessage("正在同步雲端排行榜...");
        
        // 如果是聯機房間，通關後記得把房間狀態清空
        if (isMultiplayer && myRoomPIN) {
            try {
                await fetch(`${API_URL}/room_${myRoomPIN}`, { method: 'DELETE' });
            } catch(e) {}
        }

        try {
            // 1. 從免設定的 KeyValue API 抓取全體最新的排行榜
            const response = await fetch(`${API_URL}/global_leaderboard`);
            if (response.ok) {
                const textData = await response.text();
                leaderboard = textData ? JSON.parse(textData) : [];
            }
        } catch (e) {
            console.error("無法連接雲端排行榜，使用本地備份:", e);
            leaderboard = JSON.parse(localStorage.getItem("wifi_game_leaderboard") || "[]");
        }

        // 2. 判斷是否需要刷新該玩家的分數紀錄
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

        // 3. 排序規則：分數高到低 ➔ 秒數少到多
        leaderboard.sort((a, b) => b.score - a.score || a.time - b.time);

        // 4. 將新數據直接 PUT 更新到雲端儲存庫
        try {
            localStorage.setItem("wifi_game_leaderboard", JSON.stringify(leaderboard));
            await fetch(`${API_URL}/global_leaderboard`, {
                method: 'PUT',
                body: JSON.stringify(leaderboard)
            });
        } catch (error) {
            console.error("同步至雲端失敗:", error);
        }

        // 5. 渲染結尾畫面的前三名資料
        let top3 = leaderboard.slice(0, 3);
        let rankListHTML = top3.map((item, index) => 
            `<li style="margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 4px;">
                <span style="color: #ffd700; font-weight: bold;">第 ${index + 1} 名：${item.name}</span>
                <span style="color: #ffffff; font-weight: bold;">${item.score} 分 <span style="color: #94a3b8; font-size: 12px;">(${item.time}秒)</span></span>
            </li>`
        ).join("");

        // 6. 將結尾 UI 寫入網頁中
        if (roomTitle) roomTitle.innerText = "8關全部完美通關！";
        if (roomView) {
            roomView.innerHTML = `
                <div style="text-align: center; max-height: 420px; overflow-y: auto; width: 100%; padding: 10px; box-sizing: border-box;">
                    <div style="font-size: 50px; margin-bottom: 2px;">${rankEmoji}</div>
                    <h3 style="color: #ffd700; margin: 4px 0; font-size: 18px; font-weight: bold;">${rankTitle}</h3>
                    <p style="font-size: 13px; color: #cbd5e0; margin: 4px 0;">玩家：<strong>${playerName}</strong> | 本次耗時：<strong>${seconds}</strong> 秒 | 最終得分：<strong style="color:#2ed573;">${score}</strong> 分</p>
                    
                    <div style="background: #1e1e24; padding: 12px 18px; border-radius: 8px; margin: 12px auto; width: 280px; text-align: left; border: 2px solid #ffd700; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="margin: 0; color: #ffd700; font-size: 15px;">📊 雲端全球排行榜</h4>
                            <button id="showMoreBtn" onclick="expandLeaderboard()" style="padding: 2px 8px; font-size: 11px; background-color: #4b6584; color: #fff; border:none; cursor:pointer; border-radius:3px;">看更多</button>
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
    })();
}

// ====== 📊 點擊「看更多」直接撈出雲端完整全體排行 ======
async function expandLeaderboard() {
    const listEl = document.getElementById("mainRankList");
    const btnEl = document.getElementById("showMoreBtn");
    
    if (listEl) listEl.innerHTML = "<li>正在連線雲端更新排行...</li>";
    try {
        const response = await fetch(`${API_URL}/global_leaderboard`);
        if (response.ok) {
            const textData = await response.json();
            leaderboard = textData || [];
        }
    } catch (e) { console.error("展開時無法抓取最新雲端數據，使用現有快取。"); }

    if (listEl) {
        listEl.innerHTML = leaderboard.map((item, index) => 
            `<li style="margin: 6px 0; display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 4px;">
                <span style="color: ${index < 3 ? '#ffd700' : '#cbd5e0'}; font-weight: bold;">第 ${index + 1} 名：${item.name}</span>
                <span style="color: #ffffff;">${item.score} 分 <span style="color: #666; font-size: 11px;">(${item.time}s)</span></span>
            </li>`
        ).join("");
    }
    if (btnEl) btnEl.style.display = "none";
}

// 視窗初始化選單狀態
window.onload = function() {
    if (menuView) menuView.style.display = "flex";
    if (gameViewContainer) gameViewContainer.style.display = "none";
    if (lobbyView) lobbyView.style.display = "none";
};
