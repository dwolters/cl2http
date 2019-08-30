const Client = require('ssh2').Client;

const host = process.env.SSH_HOST;
const username = process.env.SSH_USER;
const password = process.env.SSH_PWD;

module.exports = (command, stdin) => {
    return new Promise((resolve, reject) => {
        const ssh = new Client();
        let stdout = '';
        let stderr = '';
        ssh.on('ready', () => {
            if (stdin) {
                ssh.stdin.write(stdin);
            }
            ssh.exec(command, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }
                stream.on('close', (code, signal) => {
                    ssh.end();
                    resolve({code: code, output: stdout, error: stderr});
                });
                stream.stdout.on('data', (data) => {
                    stdout += data;
                });
                stream.stderr.on('data', (data) => {
                    stderr += data;
                });
            });
        }).on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
            finish([password]);
        })
        .on('error', reject)
        .connect({
            host,
            port: 22,
            username,
            password,
            tryKeyboard: true,
        });
    });
};
