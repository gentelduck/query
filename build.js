const esbuild = require("esbuild");
const { exec } = require("child_process");

const runCommand = (command) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                reject(stderr);
                return;
            }
            console.log(stdout);
            resolve(stdout);
        });
    });
};

const build = async () => {
    try {
        await runCommand("tsc");
        console.log("TypeScript types generated!");

        await esbuild.build({
            entryPoints: ["./packages/index.ts"],
            bundle: true,
            outfile: "dist/duck-query.js",
            format: "esm",
            sourcemap: true,
            target: ["esnext"],
        });

        console.log("Build completed!");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

build();
