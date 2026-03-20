"use strict";

const chalk = require("chalk");
const os = require("os");
const { version } = require("../package.json");

const brand = "Yudzx";
const frames = ["⠋", "⠚", "⠞", "⠖", "⠦", "⠴", "⠲", "⠳", "⠓", "⠋"];

const banner = [
  "██╗   ██╗██╗   ██╗██████╗ ███████╗██╗  ██╗",
  "╚██╗ ██╔╝██║   ██║██╔══██╗╚══███╔╝╚██╗██╔╝",
  " ╚████╔╝ ██║   ██║██║  ██║  ███╔╝  ╚███╔╝ ",
  "  ╚██╔╝  ██║   ██║██║  ██║ ███╔╝   ██╔██╗ ",
  "   ██║   ╚██████╔╝██████╔╝███████╗██╔╝ ██╗",
  "   ╚═╝    ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝"
];

const bootFlow = [
  { label: "Injecting runtime layers", target: 18 },
  { label: "Mapping bot environment", target: 36 },
  { label: "Binding WhatsApp session handler", target: 57 },
  { label: "Loading command surface", target: 76 },
  { label: "Hydrating local storage", target: 89 },
  { label: "Launching network core", target: 100 }
];

let frameIndex = 0;
let progress = 0;
let finished = false;
let loader;

let runtimeState = "initializing runtime";
let socketText = "checking saved session";
let actionText = "waiting for session restore";

function colorBanner() {
  const palette = ["#7DD3FC", "#67E8F9", "#5EEAD4", "#2DD4BF", "#22C55E", "#86EFAC"];
  return banner.map((line, i) => chalk.hex(palette[i % palette.length])(line)).join("\n");
}

function getStage(current) {
  return bootFlow.find(stage => current <= stage.target) || bootFlow[bootFlow.length - 1];
}

function makeBar(value, size = 34) {
  const filled = Math.round((value / 100) * size);
  const empty = size - filled;
  return chalk.greenBright("█".repeat(filled)) + chalk.gray("░".repeat(empty));
}

function stripAnsi(text) {
  return String(text).replace(/\x1B\[[0-9;]*m/g, "");
}

function centerLine(text, width) {
  const plain = stripAnsi(text);
  if (plain.length >= width) return text;
  const total = width - plain.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return " ".repeat(left) + text + " ".repeat(right);
}

function line(left, right = "", width = 64) {
  const plainLeft = stripAnsi(left);
  const plainRight = stripAnsi(right);
  const gap = width - plainLeft.length - plainRight.length;

  if (!right) {
    return plainLeft.length >= width ? left : left + " ".repeat(width - plainLeft.length);
  }

  if (gap <= 1) return left + " " + right;
  return left + " ".repeat(gap) + right;
}

function renderBoot() {
  const stage = getStage(progress);
  const frame = frames[frameIndex % frames.length];
  const uptimeHint = `${Math.floor(progress * 0.052)}.${progress % 10}s`;
  const platform = `${os.platform()} ${os.arch()}`;
  const memory = `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`;
  const width = 64;

  console.clear();
  console.log("");
  console.log(colorBanner());
  console.log(chalk.gray(centerLine(`${brand} Runtime`, 46)));
  console.log("");

  console.log(chalk.hex("#38BDF8")("┏" + "━".repeat(width + 2) + "┓"));
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(chalk.whiteBright("SYSTEM BOOT INTERFACE"), chalk.gray(`v${version}`), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(chalk.hex("#38BDF8")("┣" + "━".repeat(width + 2) + "┫"));
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(`${chalk.cyanBright(frame)}  ${chalk.whiteBright(stage.label)}`, chalk.yellowBright(`${progress}%`), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(makeBar(progress, 30), chalk.gray(`[${Math.min(progress, 100)}/100]`), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(chalk.white("Engine"), chalk.greenBright(progress >= 35 ? "responsive" : "warming"), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(chalk.white("Network"), chalk.greenBright(progress >= 60 ? "linked" : "waiting"), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(chalk.white("Storage"), chalk.greenBright(progress >= 80 ? "mounted" : "syncing"), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(chalk.white("Elapsed"), chalk.gray(uptimeHint), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(chalk.white("Platform"), chalk.gray(platform), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(
    chalk.hex("#38BDF8")("┃ ") +
      line(chalk.white("Host Memory"), chalk.gray(memory), width) +
      chalk.hex("#38BDF8")(" ┃")
  );
  console.log(chalk.hex("#38BDF8")("┗" + "━".repeat(width + 2) + "┛"));
  console.log("");
  console.log(chalk.gray(" boot pipeline is being assembled..."));
}

function renderOnline() {
  const width = 64;

  console.clear();
  console.log("");
  console.log(colorBanner());
  console.log(chalk.gray(centerLine(`${brand} Runtime`, 46)));
  console.log("");

  console.log(chalk.greenBright("█ SYSTEM READY"));
  console.log("");

  console.log(chalk.hex("#22C55E")("┌" + "─".repeat(width + 2) + "┐"));
  console.log(
    chalk.hex("#22C55E")("│ ") +
      line(chalk.whiteBright("LIVE SESSION OVERVIEW"), chalk.gray(`v${version}`), width) +
      chalk.hex("#22C55E")(" │")
  );
  console.log(chalk.hex("#22C55E")("├" + "─".repeat(width + 2) + "┤"));
  console.log(
    chalk.hex("#22C55E")("│ ") +
      line(chalk.white("Brand"), chalk.cyanBright("Yudzx"), width) +
      chalk.hex("#22C55E")(" │")
  );
  console.log(
    chalk.hex("#22C55E")("│ ") +
      line(chalk.white("State"), chalk.greenBright(runtimeState), width) +
      chalk.hex("#22C55E")(" │")
  );
  console.log(
    chalk.hex("#22C55E")("│ ") +
      line(chalk.white("Socket"), chalk.greenBright(socketText), width) +
      chalk.hex("#22C55E")(" │")
  );
  console.log(
    chalk.hex("#22C55E")("│ ") +
      line(chalk.white("Command Layer"), chalk.greenBright("loaded successfully"), width) +
      chalk.hex("#22C55E")(" │")
  );
  console.log(
    chalk.hex("#22C55E")("│ ") +
      line(chalk.white("Action"), chalk.yellowBright(actionText), width) +
      chalk.hex("#22C55E")(" │")
  );
  console.log(chalk.hex("#22C55E")("└" + "─".repeat(width + 2) + "┘"));
  console.log("");
}

function tickBoot() {
  if (finished) return;

  frameIndex++;

  if (progress < 25) progress += 1;
  else if (progress < 50) progress += 2;
  else if (progress < 75) progress += 3;
  else if (progress < 92) progress += 2;
  else if (progress < 100) progress += 1;

  if (progress > 100) progress = 100;

  renderBoot();

  if (progress >= 100) {
    finished = true;
    clearInterval(loader);
    runtimeState = "standby";
    socketText = "session validation in progress";
    actionText = "checking saved session";
    setTimeout(() => {
      renderOnline();
    }, 500);
  }
}

renderBoot();
loader = setInterval(tickBoot, 90);

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));

var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) {
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) {
            __createBinding(exports, m, p);
        }
    }
};

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

Object.defineProperty(exports, "__esModule", { value: true });
exports.makeWASocket = void 0;

const Socket_1 = __importDefault(require("./Socket"));
exports.makeWASocket = Socket_1.default;
__exportStar(require("../WAProto"), exports);
__exportStar(require("./Utils"), exports);
__exportStar(require("./Types"), exports);
__exportStar(require("./Store"), exports);
__exportStar(require("./Defaults"), exports);
__exportStar(require("./WABinary"), exports);
__exportStar(require("./WAM"), exports);
__exportStar(require("./WAUSync"), exports);

exports.default = Socket_1.default;