const debuglog = require('util').debuglog('exec');
const exec = require('child_process').exec;

/**
 * Executes a given command in the terminal.
 *
 * @param {string} command Executable to be executed
 * @param {Buffer} [stdin] Buffer to be written to stdin
 * @return {Promise} Resolves to stdout or rejects to error emitted during process creation or written to stderr
 */
module.exports = (command, stdin) => {
    return new Promise((resolve, reject) => {
        let p = exec(command, {env: process.env});

        let stderr = '';
        let stdout = '';

        p.on('error', (err) => reject(err));

        p.stderr.on('data', (data) => (stderr += data));
        p.stdout.on('data', (data) => (stdout += data));

        if (typeof stdin === 'string' || Buffer.isBuffer(stdin)) {
            p.stdin.write(stdin);
        } else if (typeof stdin === 'object') {
            p.stdin.write(JSON.stringify(stdin));
        }
        p.stdin.end();

        p.on('close', (code) => {
            debuglog('Finished with exit code:', code);
            resolve({code: code, output: stdout, error: stderr});
        });
    });
};
