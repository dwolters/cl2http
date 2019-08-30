# cla-modules

This package encapsules deployment-independent functionality that is used by both the `cla-express` and `cla-lambda` packages to transform an HTTP request to a command-line tool invocation.

## Environment Variables

The `cla-modules` package makes use of the following environment variables:

- `EXEC` indicates whether to use `process.exec` or SSH (`EXEC=ssh`) to execute the `command` property.
- SSH host, username and password are controlled by the `SSH_HOST`, `SSH_USER` and `SSH_PWD` environment variables respectively.

## Development

### Executors
Executors receive the command to execute as well as `stdin` data and return a promise resolving with the result of execution. They are stored in the `./executor/` directory. The module has to export a function with the signature `(string, string?) => Promise<string>`

### Connectors
Connectors provide access to data sources containing auth information. Connector logic is defined in `./auth/connectors`. New connectors can be created by following these steps:

- The filename of the Connector module has to equal the type specified in the `type` property of the [Connector Description Object](../../OpenAPI-Extensions.md#connector-description-object).
- The module has to export a function with the signature `(ConnectorDescriptionObject) => Connector`, which creates a new Connector instance based on the given Connector description.
- The returned Connector instance has to provide a method `get: (id) => Promise<any>`, which returns a Promise resolving with the record of the data source identified by the given `id`.

See `./auth/connectors/csv.js` for a functioning example.

### Auth Middleware
Middleware for user authentication is stored in subfolders of `./auth/middleware`. The name of the subfolders must correspond to the security type specified in the *Security Scheme Object* (i.e., `apiKey`, `http`, ...). The files are named according to the `scheme` property of the *Security Scheme Object* with an appended `.js` file extension (i.e., `basic.js`, `bearer.js`, ...), or simply `index.js` if no further scheme distinction is done. The modules have to export a function with the signature `(SecuritySchemeObject, Connector) => Promise`, which accepts the security scheme object and the associated instantiated [Connector](#connectors) and returns a Promise which is resolved on successful auth (or is rejected with an error message on unsuccessful auth).
