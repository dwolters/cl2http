#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const cpSpawn = require('child_process').spawn;
const program = require('commander');
const copy = require('recursive-copy');
const jsonfile = require('jsonfile').readFileSync;
const rm = require('rimraf').sync;
const generateDockerfile = require('./generate-dockerfile');
const sanitizeSpec = require('./sanitize');

program
    .version('1.0.0')
    .description('Makes a CLI tool available as a (RESTful) web service using the provided OpenAPI v2.0/v3.0.x service description.')
    .arguments('<path-to-service-description>');

program.command('start')
    .description('Starts the server described by the given description.')
    .action(validateSpecPresent((SPEC) => {
        const server = cpSpawn(
            'node',
            [path.join(__dirname, '../cla-express/server.js')],
            {env: {SPEC}, shell: true}
        );

        server.stdout.pipe(process.stdout);
        server.stderr.pipe(process.stderr);

        server.on('close', (code) => {
            console.log(`-> server process exited with code ${code}`);
        });
    }));

program.command('sanitize')
    .description('Prints the given service description with any cli-adapter specific information removed.')
    .action(validateSpecPresent((specPath, options) => {
        console.log(JSON.stringify(sanitizeSpec(jsonfile(specPath)), null, 2));
    }));

program.command('emit')
    .description('Outputs the Dockerfile generated for the given service description.')
    .action(validateSpecPresent((specPath, options) => {
        console.log(generateDockerfile(jsonfile(specPath), specFileName(specPath)));
    }));

program.command('build')
    .description('Builds the Docker Image for the given service.')
    .option('-t, --tag [name]', 'Image name and optionally a tag in the "name:tag" format.')
    .option('-l, --local', 'Use local development version of cli-adapter instead of published one.')
    .action(validateSpecPresent(async (specPath, options) => {
        await dockerBuild(specPath, options.tag, options.local);
    }));

program.command('serve')
    .description('Starts the service as a Docker Container')
    .option('-l, --local', 'Use local development version of cli-adapter instead of published one.')
    .option('-s, --skip-build', 'Skip build process.')
    .option('-t, --tag [name]', 'Name of the image to serve.')
    .option('-c, --container-name [name]', 'Name of the container.')
    .action(validateSpecPresent(async (specPath, options) => {
        let buildExit = 0;
        if (!options.skipBuild) {
            buildExit = await dockerBuild(specPath, options.tag, options.local, process.stdout);
        }

        if (buildExit > 0) {
            process.exit(buildExit);
        }

        readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        }).on('SIGINT', () => process.emit('SIGINT'));

        process.on('SIGINT', async () => {
            console.log('Stopping container ...');
            await dockerStop();
            // graceful shutdown
            process.exit(0);
        });

        const spec = jsonfile(specPath);
        const openapi = require('cla-modules/openapi-tools')(spec);
        await dockerRun(openapi.getPort(spec), options.tag, options.containerName);
        console.log('\nContainer is running! Press Ctrl+C to stop it!');
        dockerLogs(options.containerName);
    }));

program.command('deploy')
    .option('-b, --bucket <name>', 'AWS S3 bucket name which stores the lambda function code and Swagger description.')
    .option('-s, --stack-name <name>', 'Name of the AWS CloudFormation stack.')
    .option('-h, --host <host>', 'SSH host where commands will be executed.')
    .option('-u, --username <username>', 'SSH username.')
    .option('-p, --pwd <password>', 'SSH password.')
    .description('Deploys the service as an AWS Lambda function accessible via AWS ApiGateway.')
    .action(validateSpecPresent(async (specPath, options) => {
        const cwd = absoluteSpecDir(specPath);
        const spec = jsonfile(specPath);
        const openapi = require('cla-modules/openapi-tools')(spec);
        openapi.forEachOperation(spec, (path, method, operation) => {
            operation['x-amazon-apigateway-integration'] = {
                type: 'aws_proxy',
                uri: {
                    'Fn::Join': [
                        '', [
                            'arn:aws:apigateway:',
                            {
                                'Ref': 'AWS::Region',
                            },
                            ':lambda:path/2015-03-31/functions/',
                            {
                                'Fn::GetAtt': ['LambdaFunction', 'Arn'],
                            },
                            '/invocations',
                        ],
                    ],
                },
                httpMethod: 'POST',
            };
        });
        const template = {
            'AWSTemplateFormatVersion': '2010-09-09',
            'Description': 'Created by CLI-Adapter.',
            'Resources': {
                'LambdaFunction': {
                    'Type': 'AWS::Lambda::Function',
                    'Properties': {
                        'Code': './cla-lambda', // path.join(__dirname, '../cla-lambda'),
                        'Handler': 'fn.handler',
                        'Runtime': 'nodejs6.10',
                        'Environment': {
                            'Variables': {
                                'SPEC': 'spec.json',
                                'EXEC': 'ssh',
                                'SSH_HOST': options.host,
                                'SSH_USER': options.username,
                                'SSH_PWD': options.pwd,
                            },
                        },
                        'Role': {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:aws:iam::',
                                    {Ref: 'AWS::AccountId'},
                                    ':role/lambda_basic_execution',
                                ],
                            ],
                        },
                    },
                },
                'LambdaPermission': {
                    'Type': 'AWS::Lambda::Permission',
                    'Properties': {
                        'Action': 'lambda:invokeFunction',
                        'FunctionName': {'Fn::GetAtt': ['LambdaFunction', 'Arn']},
                        'Principal': 'apigateway.amazonaws.com',
                    },
                },
                'Api': {
                    'Type': 'AWS::ApiGateway::RestApi',
                    'Properties': {
                        'Body': spec,
                    },
                },
            },
        };

        const originalTemplatePath = path.join(cwd, 'template.json');
        const packagedTemplatePath = path.join(cwd, 'packaged.yaml');
        fs.writeFileSync(originalTemplatePath, JSON.stringify(template, null, 2));
        const lambdaDir = path.join(cwd, 'cla-lambda');
        await copy(path.join(__dirname, '../cla-lambda'), lambdaDir, {overwrite: true, expand: true});
        fs.copyFileSync(specPath, path.join(lambdaDir, 'spec.json'));
        await spawn('aws.cmd', [
            'cloudformation', 'package',
            '--template-file', originalTemplatePath,
            '--s3-bucket', options.bucket,
            '--output-template-file', packagedTemplatePath], {cwd}, process.stdout, process.stderr);

        await spawn('aws.cmd', [
            'cloudformation', 'deploy',
            '--template-file', packagedTemplatePath,
            '--stack-name', options.stackName,
            '--capabilities', 'CAPABILITY_IAM'], {cwd}, process.stdout, process.stderr);

        rm(lambdaDir);
        rm(originalTemplatePath);
        rm(packagedTemplatePath);
    }));


program.parse(process.argv);

/**
 * Builds the Docker image specified in the given service description.
 * @param {string} specPath Path to service description.
 * @param {string} [tag="cla-img"] Image tag.
 * @param {boolean} [local=false] Use local development version of cli-adapter instead of published one.
 * @param {WriteStream} [stdout] Stream to write
 * @return {Promise<string>} Promise resolving with exit code of "docker build".
 */
async function dockerBuild(specPath, tag = 'cla-image', local = false, stdout) {
    const cwd = absoluteSpecDir(specPath);
    const dockerfilePath = path.join(cwd, 'Dockerfile');
    fs.writeFileSync(dockerfilePath, generateDockerfile(jsonfile(specPath), specFileName(specPath), local));

    // copy local version of cli-adapter to directory containing spec (if required)
    const destDir = path.join(cwd, '/cli-adapter');
    if (local) {
        await copy(path.join(__dirname, '../../'), destDir, {filter: (src) => !src.match(/node_modules|.git|.vscode/)});
    }

    return spawn(
        'docker',
        ['build', '-t', tag, '.'],
        {cwd}
    ).then((code) => {
        rm(destDir);
        rm(dockerfilePath);
        return code;
    });
}

/**
 * Runs the Docker image specified in the given service description.
 * @param {string|number} port Port to bind.
 * @param {string} [tag="cla-img"] Image tag.
 * @param {string} [name="cla-container"] Container Name.
 * @return {Promise<string>} Promise resolving with exit code of "docker run".
 */
function dockerRun(port, tag = 'cla-image', name = 'cla-container') {
    return spawn(
        'docker',
        ['run', '-d', '--name', name, '--rm', '-p', `${port}:${port}`, tag]
    );
}

/**
 * Pipes the logs for the specified Docker container to STDOUT.
 * @param {string} [name="cla-container"] Container Name.
 * @return {Promise<string>} Promise resolving with exit code of "docker logs".
 */
function dockerLogs(name = 'cla-container') {
    return spawn('docker', ['logs', name]);
}

/**
 * Stops the specified Docker container.
 * @param {string} [name="cla-container"] Container Name.
 * @return {Promise<string>} Promise resolving with exit code of "docker run".
 */
function dockerStop(name = 'cla-container') {
    return spawn('docker', ['stop', name]);
}

/**
 * Spawns the specified executable.
 * @param {string} executable Executable to spawn.
 * @param {string[]} args Executable arguments.
 * @param {Object} options child_process.spawn() options.
 * @param {WriteStream} [stdout] WriteStream for STDOUT.
 * @param {WriteStream} [stderr] WriteStream for STDERR.
 * @return {Promise} Promise resolving with the exit code of the spawned executable.
 */
function spawn(executable, args, options, stdout, stderr) {
    stdout = stdout || process.stdout;
    stderr = stderr || process.stderr;

    return new Promise((resolve, reject) => {
        const p = cpSpawn(executable, args, options);
        if (stdout) {
            p.stdout.pipe(stdout);
        }
        if (stderr) {
            p.stderr.pipe(stderr);
        }
        p.on('close', resolve);
    });
}

/**
 * Computes the current working directory based on the given path to the service description.
 * @param {string} specPath Path to service description.
 * @return {string} Absolute CWD path.
 */
function absoluteSpecDir(specPath) {
    return path.join(process.cwd(), path.parse(specPath).dir);
}

/**
 * Computes the file name of the service description.
 * @param {string} specPath Path to service description.
 * @return {string} The filename.
 */
function specFileName(specPath) {
    return path.parse(specPath).base;
}

/**
 * Invokes the callback if the argument with the path to the service specification is present.
 * @param {Function} callback Callback which gets invoked when the path to the service description is provided.
 * @return {Function}
 */
function validateSpecPresent(callback) {
    return (specPath, options, ...args) => {
        if (typeof specPath !== 'string') {
            console.error('Service description is required!');
            process.exit(1);
        }
        return callback(specPath, options, args);
    };
}
