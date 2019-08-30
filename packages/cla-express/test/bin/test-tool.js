const fs = require('fs');
const program = require('commander');
const stdin = require('stdin');
let debug = {};

program
    .version('1.0.0')
    .description('Test Tool.');

program
    .command('argCommand [someArg]')
    .option('-r, --requiredArg <requiredValue>')
    .option('-o, --optionalArg [optionalValue]')
    .action((someArg, options) => {
        debug = {
            command: options._name,
            someArg,
            arguments: {
                requiredArg: options.requiredArg,
                optionalArg: options.optionalArg,
            },
        };
        console.log(JSON.stringify(debug, null, 2));
    });

program
    .command('echo')
    .action(() => {
        stdin((str) => {
            process.stdout.write(str);
        });
    });

program
    .command('exit [code]')
    .action((code) => {
        process.exit(code);
    });


program
    .command('fileCommand [someArg]')
    .option('-i, --inputFile <filename>')
    .option('-o, --outputFile <filename>')
    .action((someArg, options) => {
        if (options.inputFile && options.outputFile) {
            try {
                fs.writeFileSync(options.outputFile, fs.readFileSync(options.inputFile));
            } catch (err) {
                // Intentionally left blank
            }
        }

        debug = {
            command: options._name,
            someArg,
            arguments: {},
        };

        if (options.inputFile) {
            debug.arguments = Object.assign(debug.arguments, {
                inputFile: {
                    filename: options.inputFile,
                    exists: fs.existsSync(options.inputFile),
                    content: fs.readFileSync(options.inputFile).toString(),
                },
            });
        }
        if (options.outputFile) {
            debug.arguments = Object.assign(debug.arguments, {
                outputFile: {
                    filename: options.outputFile,
                    exists: fs.existsSync(options.outputFile),
                    content: fs.readFileSync(options.outputFile).toString(),
                },
            });
        }
        console.log(JSON.stringify(debug, null, 2));
    });

program.parse(process.argv);
