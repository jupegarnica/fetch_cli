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