const express = require("express");
const httpLib = require('http');
const helmet = require('helmet');
const stylus = require('stylus');
const socketIO = require("socket.io");
const childProcess = require("child_process");
const fs = require("fs-extra");
const path = require("path");

const configPath = "./config.json";
const itemsPath = "./data/items.json";
const app = express();
const http = httpLib.createServer(app);
const io = socketIO(http);

//app.use(helmet()); // Safari requires https, probably a bug

let mbdsProc, appConfig, bufLine = "", giving, updateMapStatus = 0;
const game = {
    connectedUsers: []
};

const writeConfig = () => {
    fs.writeFileSync("./config.json", JSON.stringify(appConfig));
};

const ServerType = {
    Windows: 0,
    Ubuntu: 1
};

if (!fs.existsSync("./config.json")) {
    writeConfig();
}

fs.readFile(configPath, (err, data) => {
    try {
        appConfig = JSON.parse(data.toString("utf-8"));
    } catch (e) {
        appConfig = undefined;
    }

    if (!appConfig) {
        appConfig = {
            bdsPath: "",
            papyrusCsPath: "",
            type: ServerType.Windows
        };
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
const openingWorldRegex = /opening worlds\/(.*)\/db/i;
const saveHoldDoneRegex = /Saving.../i
const saveQueryReadyRegex = /Data saved. Files are now ready to be copied./i
const saveQueryNotReadyRegex = /A previous save has not been completed./i;

const updateGameWorld = msg => {
    let matches = msg.match(openingWorldRegex);

    if (matches) {
        game.world = matches[1];

        updateGameData();
    }
}

const updateGameMode = msg => {
    let matches = msg.match(gameModeRegex);

    if (matches) {
        game.mode = matches[1];

        updateGameData();
    }
};

const updateDifficulty = msg => {
    let matches = msg.match(difficultyRegex)

    if (matches) {
        game.difficulty = matches[1];

        updateGameData();
    }
};

const updateUsers = msg => {
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

const queryBackup = () => {
    setTimeout(() => {
        sendCmd("save query");
    }, 500);
};

const preparingBackup = msg => {
    let matches = msg.match(saveHoldDoneRegex);

    if (!matches) {
        return;
    }

    if (updateMapStatus === 1) {
        updateMapStatus = 2;

        queryBackup();
    }
};

const backupReady = msg => {
    let matches = msg.match(saveQueryReadyRegex);

    if (!matches) {
        matches = msg.match(saveQueryNotReadyRegex);

        if (updateMapStatus === 2 && matches) {
            queryBackup();
        }

        return;
    }

    if (updateMapStatus === 2) {
        updateMapStatus = 3;

        fs.copySync(path.join(appConfig.bdsPath, "worlds", game.world), path.join(__dirname, "tmp", game.world));

        sendCmd("save resume");

        const papyrusCsExe = path.join(appConfig.papyrusCsPath, "PapyrusCS.exe");
        const worldPath = path.join(__dirname, "tmp", game.world);
        const mapPath = path.join(__dirname, "public", "map", game.world);

        try {
            childProcess.exec(`${papyrusCsExe} --world ${worldPath} --output ${mapPath} --dim 0`, () => {
                setTimeout(() => {
                    try {
                        childProcess.exec(`${papyrusCsExe} --world ${worldPath} --output ${mapPath} --dim 1`, () => {
                            setTimeout(() => {
                                try {
                                    childProcess.exec(`${papyrusCsExe} --world ${worldPath} --output ${mapPath} --dim 2`, () => {
                                        updateMapStatus = 0;
                                        io.emit("mapUpdated");
                                    });
                                } catch (e) {
                                    console.log(e);
                                    updateMapStatus = 0;
                                    io.emit("mapFailed");
                                }
                            }, 1000);
                        });
                    } catch (e) {
                        console.log(e);
                        updateMapStatus = 0;
                        io.emit("mapFailed");
                    }
                }, 1000);
            });
        } catch (e) {
            console.log(e);
            updateMapStatus = 0;
            io.emit("mapFailed");
        }
    }
};

const updateItems = msg => {
    try {
        let matches = msg.match(gaveRegex);

        if (matches && giving) {
            fs.readFile(itemsPath, (err, data) => {
if (!giving) {
console.log("no giving present");

    return;
}

                if (err) {
                    console.log(err);

                    return;
                }

                try {
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

                    fs.writeFile(itemsPath, JSON.stringify(items, undefined, 2), () => {
                        giving = undefined;
                    });
                } catch (ex) {
                    console.log(ex);
                }
            });
        }
    } catch (e) {
        console.log(e);
    }
};

const updateConfig = () => {
    if (appConfig !== undefined) {
        io.emit("config", JSON.stringify(appConfig));
    }
};

const updateStatus = () => {
    io.emit("status", mbdsProc !== undefined);
};

const updateGameData = () => {
    io.emit("game", JSON.stringify(game));
};

const sendData = data => {
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
    updateGameWorld(txtData);
    preparingBackup(txtData);
    backupReady(txtData);

    if (txtData.trim() === "Quit correctly") {
        mbdsProc = undefined;

        updateStatus();
    }

    if (bufLine) {
        sendData();
    }
};

const sendCmd = text => {
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

    if (!mbdsProc) {
        console.log("process not started");

        return;
    }

    mbdsProc.stdin.write(cmd);
}

io.on("connection", (socket) => {
    updateConfig();
    updateGameData();
    updateStatus();

    if (updateMapStatus) {
        io.emit("mapUpdating");
    }

    socket.on("disconnect", () => {
    });

    socket.on("config", (data) => {
        appConfig = JSON.parse(data);

        writeConfig();
    });

    socket.on("papyrusPath", (data) => {
        appConfig.papyrusCsPath = data;

        writeConfig();
    });

    socket.on("start", () => {
        if (mbdsProc) {
            return;
        }

        try {
            const executableFile = appConfig.type === ServerType.Windows ? "bedrock_server.exe" : "bedrock_server";

            mbdsProc = childProcess.spawn(path.join(appConfig.bdsPath, executableFile));

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
        sendCmd(text);
    });

    socket.on("updateMap", () => {
        updateMapStatus = 1;
        io.emit("mapUpdating");

        sendCmd("save hold");
    });
});

http.listen(3000);