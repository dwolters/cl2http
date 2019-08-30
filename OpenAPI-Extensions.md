# OpenAPI Specification Format Extensions
To configure the adapter, an OpenAPI specification has to be provided that describes the HTTP API and the associated command-line tools. Both the [OpenAPI 3.0.x](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md) and [OpenAPI 2.0 (fka Swagger 2.0)](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md) format are supported. The following subsections describe custom properties which extend the original OpenAPI specifications and additional restrictions to make the adapter work.

### [Parameter Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#parameterObject)

When specifying options for the command-line application invocation later on, the adapter supports references to properties of the incoming HTTP request, like query/header parameters or the body payload. Those references are subsequently referred to as "variables". For each parameter specified in the `parameters` property of an [`OperationObject`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject) as well as for the request's body, a variable of the name `${=...}` is available, where `...` has to be substituted with the parameter name.

| Field Name | Type | Description |
|-------|------|-------------|
| x-transform | `string | Map[string, string] | function` | Optional transformation of parameter values. Transformation can either be specified as an Object (mapping original values to transformed values), as a serialized function (see [funcster](https://www.npmjs.com/package/funcster)), or as a string referencing a global transformation (see `x-transforms` extension of the [OpenAPI Object](#openapi-object)). Transformed parameter values are available as `${:...}`, where `...` has to be substituted with the parameter name.|

#### Note
- variable names are case sensitive and have to be unique
- variables for parameters including a dash (`-`) are made available camel-cased (e.g., `name: test-parameter` becomes `${=testParameter}`)
- due to implementation constraints, header-parameters *must* be lowercase (but may contain dashes)
- the HTTP request's payload is available via the `${=body}` variable
- `${:someVariable}` is always defined and equals `${=someVariable}` if no transformation is specified

#### Parameter and Request Body Example

```yaml
parameters:
  - name: test-parameter    # available as "${=testParameter}"
    in: query
    required: true
    schema:
    type: string
    x-transform:            # optional, available as: "${:testParameter}"
      originalValue: transformedValue
      someValue: anotherValue
    # ...
requestBody:
  content:
    text/plain:
      x-transform: 'function(a) { return a.toLowerCase(); }'
        schema:
          type: string    
```

### Parameter Querying

To be documented. Paper as well as tests provide examples for this.


### [Operation Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#operationObject)

Each operation specifies the command-line tool associated with the operation and its invocation.

| Field Name | Type | Description |
|--------|----|-----------|
| x-cli | [CLI Object](#cli-object) | **REQUIRED.** Specifies the invocation of the command-line tool associated with the operation.

### CLI Object

The CLI object describes how to invoke a command-line tool.

| Field Name | Type | Description |
|--------|----|-----------|
| command | `string` | Terminal command that shall be invoked. Occurrences of variables referencing properties of the HTTP request are replaced with their associated values (see [Parameter Object](#parameter-object) for explanation). If no command is specified, the file specified by the `outputFileName` property is served.
| bodyToFile | `boolean` | If `true`, the body of the incoming HTTP request is written into a file. The file's name is represented by the `:inputFile` variable. If `false`, the body of the incoming HTTP request is written to STDIN. If not set, the default value is `false`.
| inputFileName | `string` | Defines a custom name for the input file. If not set, the input file name is automatically generated.
| fileToBody | `boolean` | If `true`, the body of the outgoing HTTP response is read from the file with the name represented by the `:outputFile` variable. If `false`, the body of the outgoing HTTP response is read to STDOUT. If no executable is set, the output file is served. If not set, the default value is `false`.
| outputFileName | `string` | Defines a custom name for the output file. If not set, the output file name is automatically generated.
| input | `string` | String that shall be passed as standard input for the command-line application. This string can be parameterized and the parameters are replaced with the actual values contained in the request before it passed to the application. If this property is set, the body of the request will not be passed to the standard input, even if `bodyToFile` is `false`.

#### CLI Object Example

Example for using input and output files:

```yaml
x-cli:
  bodyToFile: true
  inputFileName: myinputfile
  command: cat myfile > outputfile
  outputFileName: myoutputfile
  fileToBody: true
```

Example for using a predefined input:
```yaml
x-cli:
  input: "${:body.firstname} ${:body.lastname}"
  command: cat
```

### Responses

| Field Name | Type | Description |
|--------|----|-----------|
| x-value | `string` | Can be used to define the response's body or headers values for the response. If it is used to define the responses body, the standard output will not be used as the responses body.
| x-code | `number` | Can be used to on a [`Response Object`](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#responseObject) to define for which exit code this response shall be chosen. By default exit code 0 is mapped to HTTP status 200 (OK) and all other exit codes are mapped to HTTP status code 500 (Internal Server Error).

Information about HTTP responses is defined the Reponses Object of a HTTP method. The mechanisms to describe the responses are different for OpenAPI v2 and v3. While OpenAPI v2 only allows the description of one response, v3 distinguishes between the different media types that could be returned. 

#### OpenAPI v3 Response Example

```yaml
responses:
200:
  description: ok
  x-code: 0
  content:
    text/plain:
      x-value: "${:body.first} ${:body.second}"
      schema:
        type: string
```

#### OpenAPI v2 Response Example

```yaml
responses:
200:
  description: ok
  x-code: 0
  x-value: "${:body.first} ${:body.second}"
  schema:
    type: string
```

### [Security Scheme Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#securitySchemeObject)

If the security scheme is of type *API Key*, *HTTP Basic Auth* or *HTTP Bearer Token* (used with OAuth 2, only supported in OpenAPI 3), the adapter can automatically require authentication for operations secured by those security schemes. To know which API keys or user credentials are valid, a data source containing that information must be provided.

| Field Name | Type | Description |
|--------|----|-----------|
| x-connector | [Connector Description Object](#connector-description-object) | Connector object specifying access to the data store holding the authentication information.

Based on the authentication type, the connected data source must specify the following named properties:

- `apiKey`
    - (none, but the [Connector's](#connector-description-object) `index` property must equal the column with api keys)
- `http`
    - `scheme: basic`
        - `username`: username
        - `salt`: 16-Byte random salt used for hashing the password
        - `password`: SHA-256 hash of password with prepended salt
    - `scheme: bearer` (only OpenAPI v3)
        - (none, but the [Connector's](#connector-description-object) `index` property must equal the column with api keys)

*Note that the data source properties can be renamed via the `mapping` property of the [Connector Description Object](#connector-description-object).*

### Connector Description Object

The adapter comes with a [CSV Connector](#csv) to access auth info stored in a CSV file. See the [Connectors](#connectors) section how to develop additional connectors.

#### CSV

| Field Name | Type | Description |
|--------|----|-----------|
| type | `string` | **REQUIRED.** Must be `"csv"`.
| source | `string` | **REQUIRED.** Source of the auth information. Must be a local file whose path is specified relative to the invocation directory.
| index | `string` | **REQUIRED.** Index column (title or index).
| mapping | `Map[string, string]` | Mapping of required property names to existing column title/index .
| options | `Object` | Parser options (see [here](http://csv.adaltas.com/parse/#parser-options) for an exhaustive list).

#### CSV Connector Object Example
```yaml
type: csv
source: test/data/users.csv
index: username
mapping:
    username: username
    salt: salt
    password: pwd
options:
    comment: '#'
    columns: true
    trim: true
```

### [OpenAPI Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#openapi-object)

| Field Name | Type | Description |
|---------------|------|-------------|
| x-transforms | `Map[string, Object]` | Maps names to lookup dictionaries, which can be referenced in `x-transform` properties within a [Parameter Object](#parameter-object)|
| x-ssl | [SSL Configuration Object](#ssl-configuration-object) | Optional SSL configuration to enable HTTPS. |
| x-docker | [Docker Configuration Object](#docker-configuration-object) | Optional Docker configuration to enable Docker deployment. |

#### OpenAPI Object Example
```yaml
openapi: '3.0.1'
x-transforms:
    someTransform:
        originalValue: transformedValue
        # ...
    anotherTransform:
        # ...
# ...

# in paths./example.get.parameters:
    # ...
    x-transform: 'someTransform'
```

### SSL Configuration Object

| Field Name | Type | Description |
|---------------|------|-------------|
| cert | `string` | Path to the SSL certificate. |
| key | `string` | Path to the keyfile for the SSL certificate. |

#### SSL Configuration Object Example
```yaml
openapi: '3.0.1'
x-ssl:
    key: test/data/ssl/server.key
    cert: test/data/ssl/server.crt
# ...
```

### Docker Configuration Object

See also: [Dockerfile Documentation](https://docs.docker.com/engine/reference/builder/).

| Field Name | Type | Description |
|---------------|------|-------------|
| from | `string` | Docker image. Defaults to `node`.|
| labels | `Map[string, string]` | Key-Value labels associated with the image. |
| env | `Map[string, string]` | Environment variables to set. |
| workdir | `string` | Sets the working directory for `run` and `add` instructions. |
| add | `Map[string, string]` | Additional files to copy into the image. Source paths are mapped to destination paths. Note that the adapter logic, service description and referenced files (i.e., in connector descriptions) are automatically copied. |
| buildDependencies | `[string]` | List of `apt-get` dependencies required to build the image. Build dependencies are installed before running commands and uninstalled at the end of the build process,  therefore *NOT* included in the final image. (Requires Linux image!) |
| runtimeDependencies | `[string]` | List of `apt-get` dependencies required at runtime. Runtime dependencies are installed before running commands and are included in the final image. (Requires Linux image!) |
| run | `[string | [string]]` | Commands to execute when building the image. |

#### Note
- order of instructions in Dockerfile corresponds to order in above table
- `CMD` automatically starts the adapter with the spec
- `EXPOSE`: ports are automatically exposed based on the given specification (if none are specified, `80` for HTTP and `443` for HTTPS)

#### Docker Configuration Object Example
```yaml
from: 'node:9.3'
labels:
    maintainer: 'dwolters,jonaskir'
env:
    NODE_DEBUG: *
runtimeDependencies:
    - pandoc
```

### Restrictions

- For backwards compatibility with OpenAPI/Swagger v2, only one [Server Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#server-object) is allowed in OpenAPI v3 service descriptions. This object needs to have a `basePath` [Server Variable Object](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.1.md#server-variable-object) with a `default` value containing the base path similar to Swagger 2 (but without a leading slash `/`).
- A maximum of one security requirement is allowed per operation (either local or global).
- Cookie parameters are currently not supported.
- HTTP `OPTIONS` method is not supported due to CORS implementation.
