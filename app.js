const express = require("express");
const httpLib = require('http');
const helmet = require('helmet');
const stylus = require('stylus');
const socketIO = require("socket.io");
const childProcess = require("child_process");
const fs = require("fs");

const configPath = "./config.json";
const itemsPath = "./data/items.json";
const app = express();
const http = httpLib.createServer(app);
const io = socketIO(http);

//app.use(helmet()); // Safari requires https, probably a bug

let mbdsProc, bdsPath, bufLine = "", giving;
const game = {
    connectedUsers: []
};

const writeConfig = () => {
    fs.writeFileSync("./config.json", JSON.stringify({
        path: bdsPath
    }));
};

if (!fs.existsSync("./config.json")) {
    writeConfig();
}

fs.readFile(configPath, (err, data) => {
    const bds = JSON.parse(data.toString("utf-8"));

    if (bds.path) {
        bdsPath = bds.path;
    }

    updateConfig();
});

app.set("views", "./views");
app.set("view engine", "pug");
app.use(stylus.middleware('./public'));
app.use(express.static('./public'));

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/items", (req, res) => {
    fs.readFile(itemsPath, (err, data) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(data.toString("utf-8"));
    });
});

const gameModeRegex = /Game mode: \d (\w+)/i;
const difficultyRegex = /Difficulty: \d (\w+)/i;
const connectedRegex = /Player connected: ([^,]+),/i;
const disconnectedRegex = /Player disconnected: ([^,]+),/i;
const gaveRegex = /Gave (.*) \* \d+/i;

const updateGameMode = (msg) => {
    let matches = msg.match(gameModeRegex);

    if (matches) {
        game.mode = matches[1];

        updateGameData();
    }
};

const updateDifficulty = (msg) => {
    let matches = msg.match(difficultyRegex)

    if (matches) {
        game.difficulty = matches[1];

        updateGameData();
    }
};

const updateUsers = (msg) => {
    let matches = msg.match(connectedRegex);

    if (matches) {
        game.connectedUsers.push(matches[1]);

        updateGameData();
    }

    matches = msg.match(disconnectedRegex);

    if (matches) {
        const idx = game.connectedUsers.indexOf(matches[1]);

        game.connectedUsers.splice(idx, 1);

        updateGameData();
    }
};

const updateItems = (msg) => {
    try {
        let matches = msg.match(gaveRegex);

        if (matches && giving) {
            fs.readFile(itemsPath, (err, data) => {
                const items = JSON.parse(data.toString("utf-8"));
                let item = items.find(t => t.id === giving.itemId);

                if (!item) {
                    item = {
                        id: giving.itemId,
                        name: matches[1],
                        values: []
                    };

                    items.push(item);
                }

                if (!item.values.find(t => t.data === giving.value) && (
                    (item.values.length) ||
                    (!item.values.length && giving.value > 0)
                )) {
                    item.values.push({
                        data: giving.value,
                        name: matches[0]
                    });
                }

                fs.writeFile(itemsPath, JSON.stringify(items), () => {
                    giving = undefined;
                });
            });
        }
    } catch (e) {
        console.log(e);
    }
}

const updateConfig = () => {
    if (bdsPath !== undefined) {
        io.emit("path", bdsPath);
    }
};

const updateStatus = () => {
    io.emit("status", mbdsProc !== undefined);
};

const updateGameData = () => {
    io.emit("game", JSON.stringify(game));
};

const sendData = (data) => {
    if (data) {
        bufLine += data.toString("utf-8");
    }

    if (!bufLine.includes("\n")) {
        return;
    }

    const lines = bufLine.split("\n");
    const txtData = lines.splice(0, 1)[0];

    bufLine = lines.join("\n");

    const date = new Date();
    const ts = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;

    io.emit("data", `[${ts}] ${txtData}\n`);

    updateGameMode(txtData);
    updateDifficulty(txtData);
    updateUsers(txtData);
    updateItems(txtData);

    if (txtData.trim() === "Quit correctly") {
        mbdsProc = undefined;

        updateStatus();
    }

    if (bufLine) {
        sendData();
    }
};

io.on("connection", (socket) => {
    updateConfig();
    updateGameData();
    updateStatus();

    socket.on("disconnect", () => {
    });

    socket.on("path", (data) => {
        bdsPath = data;

        writeConfig();
    });

    socket.on("start", () => {
        if (mbdsProc) {
            return;
        }

        try {
            mbdsProc = childProcess.spawn(`${bdsPath}bedrock_server.exe`);

            mbdsProc.stdout.on("data", (data) => sendData(data));
            mbdsProc.stderr.on("data", (data) => sendData(data));
        } catch (e) {
            mbdsProc = undefined;
        }

        updateStatus();
    });

    socket.on("stop", () => {
        if (!mbdsProc) {
            return;
        }

        try {
            mbdsProc.stdin.write("stop\n");
        } catch (e) {
        }
    });

    socket.on("cmd", (text) => {
        const cmd = `${text}\n`;

        const tokens = text.split(" ");
        const giveIdx = tokens.indexOf("give");

        if (giveIdx >= 0) {
            const itemId = tokens[giveIdx + 2];
            const value = tokens[giveIdx + 4] || 0;

            if (itemId) {
                giving = {
                    itemId,
                    value
                };
            }
        }

        sendData(cmd);

        mbdsProc.stdin.write(cmd);
    });
});

http.listen(3000);