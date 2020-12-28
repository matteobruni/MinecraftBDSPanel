const socket = io();
const btnUpdate = document.getElementById("btnUpdate");
const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const btnSend = document.getElementById("btnSend");
const btnClear = document.getElementById("btnClear");
const output = document.getElementById("output");
const gameMode = document.getElementById("gameMode");
const world = document.getElementById("world");
const difficulty = document.getElementById("difficulty");
const users = document.getElementById("users");
const fastTarget = document.getElementById("fastTarget");
const txtBdsPath = document.getElementById("txtBdsPath");
const txtPapyrusPath = document.getElementById("txtPapyrusPath");
const bdsTypeWindows = document.getElementById("bdsTypeWindows");
const bdsTypeUbuntu = document.getElementById("bdsTypeUbuntu");
const txtConsole = document.getElementById("txtConsole");
const btnFullSet = document.getElementById("btnFullSet");
const btnEnchantHelmet = document.getElementById("btnEnchantHelmet");
const btnEnchantChestplate = document.getElementById("btnEnchantChestplate");
const btnEnchantLeggings = document.getElementById("btnEnchantLeggings");
const btnEnchantBoots = document.getElementById("btnEnchantBoots");
const btnEnchantSword = document.getElementById("btnEnchantSword");
const btnEnchantPickaxe = document.getElementById("btnEnchantPickaxe");
const btnEnchantBow = document.getElementById("btnEnchantBow");
const btnEnchantShield = document.getElementById("btnEnchantShield");
const btnThunder = document.getElementById("btnThunder");
const btnGiveStack = document.getElementById("btnGiveStack");
const btnUpdateMap = document.getElementById("btnUpdateMap");
const btnShowMap = document.getElementById("btnShowMap");
const mapFrame = document.getElementById("mapFrame");
const mapModal = document.getElementById("mapModal");

let config;

const sendCommand = () => {
    socket.emit("cmd", txtConsole.value);

    txtConsole.value = "";
};

const sendQuickCommand = (cmd) => {
    socket.emit("cmd", `execute ${fastTarget.value} ~ ~ ~ ${cmd}`);
};

const updateConfig = () => {
    if (!config) {
        config = {};
    }

    config.bdsPath = txtBdsPath.value;
    config.papyrusCsPath = txtPapyrusPath.value;

    socket.emit("config", JSON.stringify(config));
}

socket.on("data", (data) => {
    output.innerText += `${data}`;
    output.scrollTop = output.scrollHeight;
});

socket.on("config", (data) => {
    config = JSON.parse(data);

    if (config.bdsPath) {
        txtBdsPath.value = config.bdsPath;
    }

    if (config.papyrusCsPath) {
        txtPapyrusPath.value = config.papyrusCsPath;
    }

    bdsTypeWindows.checked = config.type.toString() === bdsTypeWindows.value;
    bdsTypeUbuntu.checked = config.type.toString() === bdsTypeUbuntu.value;
});

socket.on("game", (data) => {
    const game = JSON.parse(data);

    gameMode.innerText = game.mode;
    difficulty.innerText = game.difficulty;
    world.innerText = game.world;

    users.innerHTML = "";
    fastTarget.innerHTML = "";

    for (const user of game.connectedUsers) {
        const li = document.createElement("li");

        li.classList.add("list-group-item");

        li.innerText = user;

        users.append(li);

        const option = document.createElement("option");

        option.value = user;
        option.innerText = user;

        fastTarget.append(option);
    }
});

socket.on("status", (status) => {
    if (status) {
        btnStart.disabled = true;
        btnStop.disabled = false;
    } else {
        btnStart.disabled = false;
        btnStop.disabled = true;
    }
});

socket.on("mapUpdating", () => {
    btnUpdateMap.disabled = true;
    btnShowMap.disabled = true;
});

socket.on("mapFailed", () => {
    btnUpdateMap.disabled = false;
    btnShowMap.disabled = true;
});

socket.on("mapUpdated", () => {
    btnUpdateMap.disabled = false;
    btnShowMap.disabled = false;
});

btnStart.addEventListener("click", () => {
    socket.emit("start");
});

btnStop.addEventListener("click", () => {
    socket.emit("stop");
});

txtBdsPath.addEventListener("keydown", (evt) => {
    if ((evt.keyCode || evt.code) === 13) {
        updateConfig();
    }
});

txtPapyrusPath.addEventListener("keydown", (evt) => {
    if ((evt.keyCode || evt.code) === 13) {
        updateConfig();
    }
});

btnUpdate.addEventListener("click", updateConfig);

txtConsole.addEventListener("keydown", (evt) => {
    if ((evt.keyCode || evt.code) === 13) {
        sendCommand();
    }
});

btnSend.addEventListener("click", sendCommand);

btnClear.addEventListener("click", () => {
    output.innerText = "";
    txtConsole.value = "";
});

btnFullSet.addEventListener("click", () => {
    sendQuickCommand("give @p netherite_helmet");
    sendQuickCommand("give @p netherite_chestplate");
    sendQuickCommand("give @p netherite_leggings");
    sendQuickCommand("give @p netherite_boots");
    sendQuickCommand("give @p netherite_sword");
    sendQuickCommand("give @p netherite_pickaxe");
    sendQuickCommand("give @p netherite_axe");
    sendQuickCommand("give @p netherite_shovel");
    sendQuickCommand("give @p netherite_hoe");
    sendQuickCommand("give @p bow");
    sendQuickCommand("give @p arrow");
    sendQuickCommand("give @p shield");
});

btnEnchantHelmet.addEventListener("click", () => {
    sendQuickCommand("enchant @p aqua_affinity");
    sendQuickCommand("enchant @p protection 4");
    sendQuickCommand("enchant @p thorns 3");
    sendQuickCommand("enchant @p respiration 3");
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p mending");
});

btnEnchantChestplate.addEventListener("click", () => {
    sendQuickCommand("enchant @p protection 4");
    sendQuickCommand("enchant @p thorns 3");
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p mending");
});

btnEnchantLeggings.addEventListener("click", () => {
    sendQuickCommand("enchant @p protection 4");
    sendQuickCommand("enchant @p thorns 3");
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p mending");
});

btnEnchantBoots.addEventListener("click", () => {
    sendQuickCommand("enchant @p protection 4");
    sendQuickCommand("enchant @p thorns 3");
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p mending");
    sendQuickCommand("enchant @p feather_falling 4");
    sendQuickCommand("enchant @p depth_strider 3");
    sendQuickCommand("enchant @p soul_speed 3");
});

btnEnchantSword.addEventListener("click", () => {
    sendQuickCommand("enchant @p sharpness 5");
    sendQuickCommand("enchant @p knockback 2");
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p mending");
    sendQuickCommand("enchant @p looting 3");
    sendQuickCommand("enchant @p fire_aspect 2");
});

btnEnchantPickaxe.addEventListener("click", () => {
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p mending");
    sendQuickCommand("enchant @p fortune 3");
    sendQuickCommand("enchant @p efficiency 5");
});

btnEnchantBow.addEventListener("click", () => {
    sendQuickCommand("enchant @p power 5");
    sendQuickCommand("enchant @p punch 2");
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p infinity");
    sendQuickCommand("enchant @p flame");
});

btnEnchantShield.addEventListener("click", () => {
    sendQuickCommand("enchant @p unbreaking 3");
    sendQuickCommand("enchant @p mending");
});

btnThunder.addEventListener("click", () => {
    sendQuickCommand("summon lightning_bolt");
});

btnGiveStack.addEventListener("click", () => {
    const itemId = prompt("Choose Item ID");
    const dvId = parseInt(prompt("Choose Item Data Value", "0"));
    const stackCount = parseInt(prompt("Choose how many stacks", "1"));

    sendQuickCommand(`give @p ${itemId} ${stackCount * 64} ${dvId}`);
});

btnUpdateMap.addEventListener("click", () => {
    socket.emit("updateMap");
});

btnShowMap.addEventListener("click", () => {
    mapFrame.src = `/map/${world.innerText}/map/map.html`;

    const modal = new bootstrap.Modal(mapModal, {
        backdrop: "static",
        keyboard: false,
        focus: true
    });

    modal.show();
});