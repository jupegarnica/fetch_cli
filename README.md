# Fetch cli

Use fetch web API from the command line.

## Installation

```bash
deno install --allow-net  -fn fetch https://deno.land/x/fetch_cli/fetch.ts
```

## Usage

```bash
fetch https://faker.deno.dev?status=201&body=hello
```
Will print http request and response to stdout.

```bash
GET https://faker.deno.dev/?status=201&body=hello
accept:          */*
accept-language: *


HTTP/1.1 201 Created
access-control-allow-origin: *
content-length:              5
content-type:                text/plain;charset=UTF-8
date:                        Wed, 12 Oct 2022 16:30:20 GMT
server:                      deno/europe-southwest1-a
vary:                        Accept-Encoding

hello

```


## Features

#### Auto detect content type for JSON body

```bash
fetch --method POST --body '{"hello":"world"}'  https://faker.deno.dev/pong
```


#### Read body from file

```bash
fetch --method POST   https://faker.deno.dev/pong < body.json
# or
cat body.json | fetch --method POST   https://faker.deno.dev/pong
```

#### Display options

Use `--hide-request` and `--hide-response` to hide request or response headers.

Use `--hide-body` to hide response and request bodies.


#### Use any Fetch init options

```bash
fetch --method POST --body '{"hello":"world"}' --headers 'content-type:application/json'  https://faker.deno.dev/pong
```


```bash
fetch --redirect=manual  https://faker.deno.dev?status=307
```

#### help

```bash
fetch --help
```
