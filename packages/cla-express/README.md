# cla-express

This package provides an *express* wrapper for the `cla-modules` package. Visit the [root README](../../README.md) for more information about the project.

## Environment Variables

The following environment variables are supported:

- `HOST`: Overwrites the IP address the HTTP server is binding to (default: `0.0.0.0`)
- `PORT`: Overwrites the port the HTTP(S) server is binding to (default: see service description, `80` for HTTP or `443` for HTTPS if none is specified)
- `SPEC`: Specifies the path to the service description (is overwritten by command-line argument)
