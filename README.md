# Providing HTTP Interfaces for Command-line Applications

This adapter allows users to easily enrich existing command-line applications with (RESTful) HTTP interfaces via an extended [OpenAPI](https://swagger.io/specification/) (fka Swagger) service description.

## Features & Usage

For instructions on how to install and use the adapter, visit the [README of the cli-bin package](packages/cla-bin/README.md).

## Project Structure
The project is configured as a monorepo consisting of four packages:

- [`cla-modules`](packages/cla-modules/README.md) contains the core functionality that is used to map HTTP requests to invocations of command-line tools.
- [`cla-express`](packages/cla-express/README.md) is an [*express*](http://expressjs.com/) wrapper around the `cla-modules` functionality.
- [`cla-lambda`](packages/cla-lambda/README.md) is a wrapper around the `cla-modules` functionality intended to be deployed as a [*Lambda*](https://aws.amazon.com/lambda/) cloud function on *Amazon Web Services*.
- [`cla-bin`](packages/cla-bin/README.md) provides a command-line tool (`cla`) which includes subcommands to easily deploy a described service as a *Docker* container or as a *Lambda* function (using the appropriate wrappers).

## Development

The monorepo is managed using [*Lerna*](https://lernajs.io/). Furthermore, the [prerequisites of the `cla-bin` package](packages/cla-bin/README.md#installation) apply!

### Installation

```sh
$ git clone <repository_url>
  ...
$ npm install -g lerna
  ...
$ npm install
  ...
$ lerna bootstrap
  ...
```

### Scripts
The following *npm* scripts are available at root level:

- `test`: runs all tests for OpenAPI 3 and Swagger 2 specs in `examples/test/json`
- `pretest`: converts all OpenAPI 3 YAML test specifications into JSON format and creates a corresponding Swagger 2 variant of the spec
- `watch-specs`: runs `pretest` whenever a YAML file changes
- `lint`: Runs *eslint* for all JavaScript files.
- `cl2http`: emulates the `cl2http` script provided by the [`cla-bin`](packages/cla-bin/README.md) package.

### Tests

The tests are located in the `cla-express` package. The associated test specifications are located in the `/examples/test` folder.

When developing tests, make sure the specifications are always transformed to JSON in the background by running `npm run watch-specs`. When executing tests individually, make sure the `FORMAT` environment variable is either set to `openapi` or `swagger` (for running the tests with the OpenAPI 3 or Swagger 2 version of the specs respectively).

New users for basic auth can be prepended to an existing CSV file by executing:

```sh
node -e "const crypto = require('crypto');const salt = crypto.randomBytes(16).toString('hex');const pwdHash = crypto.createHmac('sha256', salt+process.argv[2]).digest('hex');console.log('%s,%s,%s', process.argv[1], salt, pwdHash);" username password >> test/data/users.csv
```
