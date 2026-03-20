
  let chalkModule = import("chalk");
  let gradientModule = import("gradient-string");

  const chalk = chalkModule.default;
  const gradient = gradientModule.default;

  const major = parseInt(process.versions.node.split('.')[0], 10);

  if (major < 20) {
    console.clear();

    const banner = [
      "███████╗██████╗ ███████╗ ██████╗ ██████╗ ",
      "██╔════╝██╔══██╗██╔════╝██╔═══██╗██╔══██╗",
      "█████╗  ██████╔╝█████╗  ██║   ██║██████╔╝",
      "██╔══╝  ██╔══██╗██╔══╝  ██║   ██║██╔══██╗",
      "███████╗██║  ██║███████╗╚██████╔╝██║  ██║",
      "╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝",
    ];

    const glitchChars = ["#", "@", "%", "&", "!", "╳", "▒", "▓", "░"];

    // FIX: safeColor harus mengembalikan FUNCTION dari chalk
    function safeColor() {
      const colors = [
        "redBright",
        "magentaBright",
        "yellowBright",
        "cyanBright",
        "blueBright",
        "whiteBright"
      ];
      return chalk[colors[Math.floor(Math.random() * colors.length)]];
    }

    let frame = 0;

    const glitchInterval = setInterval(() => {
      console.clear();
      console.log("");

      banner.forEach((line, index) => {
        let glitched = line.split("");

        // Tambah glitch random
        if (Math.random() < 0.3) {
          const pos = Math.floor(Math.random() * glitched.length);
          glitched[pos] = glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }

        // Efek wave shift
        const shift = Math.floor(Math.sin(frame / 2 + index) * 3);
        const shiftedLine = (shift > 0 ? " ".repeat(shift) : "") + glitched.join("");

        // FIX: safeColor()(string)
        console.log(safeColor(shiftedLine));
      });

      console.log("\n" + chalk.redBright("❌ ERROR: Node.js Version Not Supported!\n"));
      console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));

      console.log(
        chalk.whiteBright("Baileys ini ") +
        chalk.redBright("tidak mendukung") +
        chalk.whiteBright(" Node.js versi di bawah ") +
        chalk.yellowBright("v20") +
        chalk.whiteBright(".")
      );

      console.log(
        chalk.whiteBright("Versi Node.js kamu saat ini: ") +
        chalk.cyanBright(process.versions.node)
      );

      console.log(
        chalk.whiteBright("Tolong update Node.js minimal ke: ") +
        chalk.greenBright("v20 atau di atasnya.")
      );

      console.log(chalk.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"));

      frame++;

    }, 90);

    setTimeout(() => {
      clearInterval(glitchInterval);
      process.exit(1);
    }, 9000);
  };
