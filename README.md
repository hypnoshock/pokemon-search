# What is this?

A basic node.js 24 template with prettier and lint
Simple TypeScript setup and a docker file

# Running

```
pnpm install
pnpm run dev
```

# Build

`pnpm run build`
This outputs to `dist`

# Docker

There's a docker file that uses an Alpine linux layer to build the project and another alpine layer to run the build

```
docker build -t node-template .
docker run node-template
```

NOTE: Docker file has separate build and run layers. Overkill on small projects
